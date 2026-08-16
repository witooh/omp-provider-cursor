// src/api-key.ts
var CURSOR_API_KEY_ENV_VAR = "CURSOR_API_KEY";
var CURSOR_API_KEY_CONFIG_VALUE = "omp-provider-cursor-api-key-placeholder";
var PLACEHOLDERS = {
  [CURSOR_API_KEY_ENV_VAR]: true,
  [`$${CURSOR_API_KEY_ENV_VAR}`]: true,
  [`\${${CURSOR_API_KEY_ENV_VAR}}`]: true,
  [CURSOR_API_KEY_CONFIG_VALUE]: true
};
function resolveCursorApiKey(apiKey) {
  const trimmed = apiKey?.trim();
  if (!trimmed) return void 0;
  if (PLACEHOLDERS[trimmed]) return process.env.CURSOR_API_KEY?.trim() || void 0;
  return trimmed;
}

// src/models.ts
var CURSOR_SDK_BASE_URL = "https://cursor.com";
var FALLBACK_CONTEXT_WINDOW = 128e3;
var FALLBACK_MAX_TOKENS = 16384;
var ZERO_COST = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
var TEXT_AND_IMAGE = ["text", "image"];
var EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max"];
var KNOWN_EFFORT = {
  minimal: true,
  low: true,
  medium: true,
  high: true,
  xhigh: true,
  max: true
};
var selectionIdByOmpId = {
  "composer-2-5": "composer-2.5"
};
var bootstrapCursorModels = [
  {
    id: "composer-2-5",
    name: "Composer 2.5",
    reasoning: false,
    input: [...TEXT_AND_IMAGE],
    cost: ZERO_COST,
    contextWindow: FALLBACK_CONTEXT_WINDOW,
    maxTokens: FALLBACK_MAX_TOKENS
  }
];
function cursorSelectionId(ompId) {
  return selectionIdByOmpId[ompId] ?? ompId;
}
function getParameter(item, id) {
  return item.parameters?.find((parameter) => parameter.id === id);
}
function parseContextWindow(value) {
  const match = /^(\d+(?:\.\d+)?)([km])$/i.exec(value.trim());
  if (!match) return void 0;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!Number.isFinite(amount)) return void 0;
  return Math.round(amount * (unit === "m" ? 1e6 : 1e3));
}
function contextWindowFromItem(item) {
  const values = getParameter(item, "context")?.values ?? [];
  let largest = 0;
  for (const entry of values) {
    const parsed = parseContextWindow(entry.value);
    if (parsed !== void 0 && parsed > largest) largest = parsed;
  }
  return largest > 0 ? largest : FALLBACK_CONTEXT_WINDOW;
}
function thinkingFromItem(item) {
  const effort = getParameter(item, "effort") ?? getParameter(item, "reasoning");
  if (!effort) return void 0;
  const values = effort.values.map((entry) => entry.value.toLowerCase()).filter((value) => KNOWN_EFFORT[value]);
  const ordered = EFFORT_ORDER.filter((level) => values.includes(level));
  if (ordered.length === 0) return void 0;
  return {
    mode: "effort",
    efforts: ordered
  };
}
function mapCursorModels(items) {
  if (items.length === 0) return bootstrapCursorModels;
  return items.map((item) => {
    const thinking = thinkingFromItem(item);
    const ompId = item.id.replace(/(\d)\.(\d)/g, "$1-$2");
    selectionIdByOmpId[ompId] = item.id;
    return {
      id: ompId,
      name: item.displayName || item.id,
      reasoning: thinking !== void 0,
      ...thinking ? { thinking } : {},
      input: [...TEXT_AND_IMAGE],
      cost: { ...ZERO_COST },
      contextWindow: contextWindowFromItem(item),
      maxTokens: FALLBACK_MAX_TOKENS
    };
  });
}

// src/sdk.ts
async function loadCursorSdk() {
  return import("@cursor/sdk");
}

// src/stream.ts
import { createAssistantMessageEventStream, resolveApiKeyOnce } from "@oh-my-pi/pi-ai";

// src/prompt.ts
function textOf(content) {
  if (typeof content === "string") return content;
  return content.filter((part) => part.type === "text" && typeof part.text === "string").map((part) => part.text).join("");
}
function latestUser(messages) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === "user") return message;
  }
  return void 0;
}
function imagesOf(content) {
  if (typeof content === "string") return [];
  const images = [];
  for (const part of content) {
    if (part.type !== "image") continue;
    const image = part;
    images.push({ data: image.data, mimeType: image.mimeType });
  }
  return images;
}
function buildCursorPrompt(context) {
  const user = latestUser(context.messages);
  const latest = user ? textOf(user.content) : "Continue.";
  const history = [];
  if (context.systemPrompt?.length) history.push(context.systemPrompt.join("\n"));
  for (const message of context.messages) {
    if (message === user) continue;
    if (message.role === "user") history.push(`User: ${textOf(message.content)}`);
    if (message.role === "assistant") history.push(`Assistant: ${textOf(message.content)}`);
  }
  const text = history.length > 0 ? `${history.join("\n\n")}

User: ${latest}` : latest;
  const images = user ? imagesOf(user.content) : [];
  return images.length > 0 ? { text, images } : { text };
}

// src/tools.ts
import { toolWireSchema } from "@oh-my-pi/pi-ai";
var CURSOR_SDK_SESSION_PREFIX = "cursor-sdk:";
var CursorSdkLiveRun = class {
  pending = /* @__PURE__ */ new Map();
  agent;
  run;
  stream;
  partial;
  failureMessage;
  #segment;
  #closed = false;
  waitSegment() {
    const { promise, resolve } = Promise.withResolvers();
    this.#segment = resolve;
    return promise;
  }
  endSegment(reason) {
    const resolve = this.#segment;
    this.#segment = void 0;
    resolve?.(reason);
  }
  attach(stream, partial) {
    this.stream = stream;
    this.partial = partial;
  }
  close() {
    if (this.#closed) return;
    this.#closed = true;
    for (const waiting of this.pending.values()) waiting.reject(new Error("closed"));
    this.pending.clear();
    void this.run?.cancel();
    this.agent?.close();
    this.endSegment("aborted");
  }
};
function liveRunKey(sessionId) {
  return `${CURSOR_SDK_SESSION_PREFIX}${sessionId ?? "anon"}`;
}
function getLiveRun(options) {
  return options.providerSessionState?.get(liveRunKey(options.sessionId));
}
function putLiveRun(options, live) {
  options.providerSessionState?.set(liveRunKey(options.sessionId), live);
}
function deleteLiveRun(options) {
  options.providerSessionState?.delete(liveRunKey(options.sessionId));
}
function trailingToolResults(context) {
  const results = [];
  for (let index = context.messages.length - 1; index >= 0; index--) {
    const message = context.messages[index];
    if (message.role !== "toolResult") break;
    results.unshift(message);
  }
  return results;
}
function shouldResumeLiveRun(context, live) {
  if (!live || live.pending.size === 0) return false;
  return trailingToolResults(context).some((result) => live.pending.has(result.toolCallId));
}
function resumeLiveRun(context, live) {
  for (const result of trailingToolResults(context)) {
    const waiting = live.pending.get(result.toolCallId);
    if (!waiting) continue;
    live.pending.delete(result.toolCallId);
    const text = result.content.filter((part) => part.type === "text").map((part) => part.text).join("");
    waiting.resolve(result.isError ? `Error: ${text}` : text);
  }
}
function emitToolCall(live, toolCall) {
  const stream = live.stream;
  const partial = live.partial;
  if (!stream || !partial) return;
  partial.content.push(toolCall);
  const index = partial.content.length - 1;
  const delta = JSON.stringify(toolCall.arguments);
  stream.push({ type: "toolcall_start", contentIndex: index, partial });
  stream.push({ type: "toolcall_delta", contentIndex: index, delta, partial });
  stream.push({ type: "toolcall_end", contentIndex: index, toolCall, partial });
}
function buildCustomTools(tools, live) {
  const custom = {};
  if (!tools) return custom;
  for (const tool of tools) {
    custom[tool.name] = {
      description: tool.description,
      inputSchema: toolWireSchema(tool),
      execute: (args, executeContext) => {
        const { promise, resolve, reject } = Promise.withResolvers();
        const id = executeContext.toolCallId ?? `call-${tool.name}-${live.pending.size + 1}`;
        const toolCall = {
          type: "toolCall",
          id,
          name: tool.name,
          arguments: args
        };
        live.pending.set(id, { resolve, reject });
        emitToolCall(live, toolCall);
        live.endSegment("toolUse");
        return promise;
      }
    };
  }
  return custom;
}

// src/stream.ts
var MISSING_KEY = "Cursor SDK API key is not configured. Set CURSOR_API_KEY or pass --api-key.";
function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  };
}
function makeMessage(model, stopReason, errorMessage) {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: emptyUsage(),
    stopReason,
    timestamp: Date.now(),
    ...errorMessage ? { errorMessage } : {}
  };
}
function appendText(partial, text) {
  const last = partial.content.at(-1);
  if (last?.type === "text") {
    last.text += text;
    return partial.content.length - 1;
  }
  partial.content.push({ type: "text", text });
  return partial.content.length - 1;
}
function appendThinking(partial, text) {
  const last = partial.content.at(-1);
  if (last?.type === "thinking") {
    last.thinking += text;
    return partial.content.length - 1;
  }
  partial.content.push({ type: "thinking", thinking: text });
  return partial.content.length - 1;
}
function streamCursor(model, context, options) {
  const stream = createAssistantMessageEventStream();
  const partial = makeMessage(model, "stop");
  (async () => {
    stream.push({ type: "start", partial });
    const rawKey = await resolveApiKeyOnce(options?.apiKey, options?.signal);
    const apiKey = resolveCursorApiKey(rawKey);
    if (!apiKey) {
      finish(stream, makeMessage(model, "error", MISSING_KEY), "error");
      return;
    }
    const existing = getLiveRun(options ?? {});
    if (existing && shouldResumeLiveRun(context, existing)) {
      existing.attach(stream, partial);
      const next = existing.waitSegment();
      resumeLiveRun(context, existing);
      await settleSegment(model, stream, partial, existing, options, await next);
      return;
    }
    existing?.close();
    deleteLiveRun(options ?? {});
    const live = new CursorSdkLiveRun();
    live.attach(stream, partial);
    if (options?.providerSessionState) putLiveRun(options, live);
    const sdk = await loadCursorSdk();
    const cwd = options?.cwd ?? process.cwd();
    const selectionId = cursorSelectionId(model.id);
    const agent = await sdk.Agent.create({
      apiKey,
      model: { id: selectionId },
      tools: ["mcp"],
      local: { cwd, customTools: buildCustomTools(context.tools, live) }
    });
    live.agent = agent;
    const abort = options?.signal;
    const onAbort = () => {
      live.close();
    };
    abort?.addEventListener("abort", onAbort, { once: true });
    try {
      if (abort?.aborted) throw new Error("aborted");
      const next = live.waitSegment();
      const run = await agent.send(buildCursorPrompt(context), { model: { id: selectionId } });
      live.run = run;
      void consumeRun(live, stream, partial, run);
      await settleSegment(model, stream, partial, live, options, await next);
    } catch (error) {
      await settleSegment(model, stream, partial, live, options, classifyError(options, error));
    } finally {
      abort?.removeEventListener("abort", onAbort);
    }
  })().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    finish(stream, makeMessage(model, "error", message), "error");
  });
  return stream;
}
async function consumeRun(live, stream, fallback, run) {
  try {
    for await (const event of run.stream()) {
      const target = live.partial ?? fallback;
      const out = live.stream ?? stream;
      const terminal = applySdkEvent(out, target, live, event);
      if (terminal) {
        live.endSegment(terminal);
        return;
      }
    }
    live.endSegment("stop");
  } catch (error) {
    live.endSegment(error instanceof Error && error.message === "aborted" ? "aborted" : "error");
  }
}
async function settleSegment(model, stream, partial, live, options, reason) {
  if (reason === "toolUse") {
    if (!options?.providerSessionState) {
      live.close();
      finish(stream, makeMessage(model, "error", "providerSessionState is required for Cursor SDK tools"), "error");
      return;
    }
    partial.stopReason = "toolUse";
    stream.push({ type: "done", reason: "toolUse", message: partial });
    stream.end(partial);
    return;
  }
  deleteLiveRun(options ?? {});
  if (reason === "aborted" || options?.signal?.aborted) {
    live.close();
    finish(stream, makeMessage(model, "aborted", "aborted"), "aborted");
    return;
  }
  if (reason === "error") {
    live.close();
    finish(stream, makeMessage(model, "error", live.failureMessage ?? "Cursor SDK run failed"), "error");
    return;
  }
  live.close();
  partial.stopReason = "stop";
  stream.push({ type: "done", reason: "stop", message: partial });
  stream.end(partial);
}
function classifyError(options, error) {
  if (options?.signal?.aborted || error instanceof Error && error.message === "aborted") return "aborted";
  return "error";
}
function finish(stream, message, reason) {
  stream.push({ type: "error", reason, error: message });
  stream.end(message);
}
function applySdkEvent(stream, partial, live, event) {
  if (event.type === "status") {
    if (event.status === "ERROR") {
      live.failureMessage = event.message ?? "Cursor SDK run failed";
      return "error";
    }
    if (event.status === "CANCELLED") return "aborted";
    return void 0;
  }
  if (event.type === "thinking" && event.text) {
    const index = appendThinking(partial, event.text);
    if (partial.content[index]?.type === "thinking" && partial.content[index].thinking === event.text) {
      stream.push({ type: "thinking_start", contentIndex: index, partial });
    }
    stream.push({ type: "thinking_delta", contentIndex: index, delta: event.text, partial });
    return void 0;
  }
  if (event.type === "assistant") {
    for (const block of event.message.content) {
      if (block.type !== "text" || !block.text) continue;
      const index = appendText(partial, block.text);
      if (partial.content[index].text === block.text) {
        stream.push({ type: "text_start", contentIndex: index, partial });
      }
      stream.push({ type: "text_delta", contentIndex: index, delta: block.text, partial });
    }
  }
  return void 0;
}

// src/index.ts
function cursorSdkProvider(models) {
  return {
    baseUrl: CURSOR_SDK_BASE_URL,
    api: "cursor-sdk",
    apiKey: CURSOR_API_KEY_CONFIG_VALUE,
    models,
    streamSimple: streamCursor
  };
}
function index_default(pi) {
  pi.registerProvider("cursor-sdk", cursorSdkProvider(bootstrapCursorModels));
  pi.registerCommand("cursor-sdk-refresh-models", {
    description: "Refresh the live Cursor model catalog",
    handler: async (_args, ctx) => {
      const raw = await ctx.modelRegistry.getApiKeyForProvider("cursor-sdk");
      const apiKey = resolveCursorApiKey(raw);
      if (!apiKey) {
        ctx.ui.notify("Cursor SDK: set CURSOR_API_KEY or pass --api-key", "warning");
        return;
      }
      try {
        const sdk = await loadCursorSdk();
        const listed = await sdk.Cursor.models.list({ apiKey });
        const models = mapCursorModels(listed);
        pi.registerProvider("cursor-sdk", cursorSdkProvider(models));
        if (!ctx.hasUI) return;
        ctx.ui.notify(`Cursor SDK catalog refreshed with ${models.length} models.`, "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Cursor SDK catalog refresh failed: ${message}`, "error");
      }
    }
  });
}
export {
  bootstrapCursorModels,
  index_default as default,
  mapCursorModels,
  resolveCursorApiKey,
  streamCursor
};
