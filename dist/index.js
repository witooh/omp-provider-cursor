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
  if (!trimmed || PLACEHOLDERS[trimmed]) return process.env.CURSOR_API_KEY?.trim() || void 0;
  return trimmed;
}

// src/catalog.generated.ts
function catalogParam(id, values) {
  return { id, values: values.map((value) => ({ value })) };
}
var FALLBACK_CATALOG_ITEMS = [
  {
    id: "claude-fable-5",
    displayName: "Fable 5",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["300k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "claude-haiku-4-5",
    displayName: "Haiku 4.5",
    parameters: [catalogParam("thinking", ["false", "true"])]
  },
  {
    id: "claude-opus-4-5",
    displayName: "Opus 4.5",
    parameters: [catalogParam("thinking", ["false", "true"])]
  },
  {
    id: "claude-opus-4-6",
    displayName: "Opus 4.6",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["200k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "max"])
    ]
  },
  {
    id: "claude-opus-4-7",
    displayName: "Opus 4.7",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["300k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "claude-opus-4-8",
    displayName: "Opus 4.8",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["300k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "claude-opus-5",
    displayName: "Opus 5",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["300k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "claude-sonnet-4",
    displayName: "Sonnet 4",
    parameters: [catalogParam("thinking", ["false", "true"]), catalogParam("context", ["200k"])]
  },
  {
    id: "claude-sonnet-4-5",
    displayName: "Sonnet 4.5",
    parameters: [catalogParam("thinking", ["false", "true"]), catalogParam("context", ["200k"])]
  },
  {
    id: "claude-sonnet-4-6",
    displayName: "Sonnet 4.6",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["200k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "max"])
    ]
  },
  {
    id: "claude-sonnet-5",
    displayName: "Sonnet 5",
    parameters: [
      catalogParam("thinking", ["false", "true"]),
      catalogParam("context", ["300k", "1m"]),
      catalogParam("effort", ["low", "medium", "high", "xhigh", "max"])
    ]
  },
  { id: "composer-2", displayName: "Composer 2" },
  { id: "composer-2.5", displayName: "Composer 2.5" },
  { id: "default", displayName: "Auto" },
  { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  { id: "gemini-3-flash", displayName: "Gemini 3 Flash" },
  { id: "gemini-3.1-pro", displayName: "Gemini 3.1 Pro" },
  { id: "gemini-3.5-flash", displayName: "Gemini 3.5 Flash" },
  {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    parameters: [catalogParam("effort", ["minimal", "low", "medium", "high"])]
  },
  {
    id: "gemini-3.7-flash",
    displayName: "Gemini 3.7 Flash",
    parameters: [catalogParam("effort", ["low", "medium", "high"])]
  },
  {
    id: "glm-5.2",
    displayName: "GLM 5.2",
    parameters: [catalogParam("reasoning", ["high", "max"])]
  },
  { id: "gpt-5-mini", displayName: "GPT-5 Mini" },
  {
    id: "gpt-5.1",
    displayName: "GPT-5.1",
    parameters: [catalogParam("reasoning", ["low", "medium", "high"])]
  },
  {
    id: "gpt-5.2",
    displayName: "GPT-5.2",
    parameters: [catalogParam("reasoning", ["low", "medium", "high", "extra-high"])]
  },
  {
    id: "gpt-5.3-codex",
    displayName: "Codex 5.3",
    parameters: [catalogParam("reasoning", ["low", "medium", "high", "extra-high"])]
  },
  {
    id: "gpt-5.4",
    displayName: "GPT-5.4",
    parameters: [
      catalogParam("context", ["272k", "1m"]),
      catalogParam("reasoning", ["none", "low", "medium", "high", "extra-high"])
    ]
  },
  {
    id: "gpt-5.4-mini",
    displayName: "GPT-5.4 Mini",
    parameters: [catalogParam("reasoning", ["none", "low", "medium", "high", "xhigh"])]
  },
  {
    id: "gpt-5.4-nano",
    displayName: "GPT-5.4 Nano",
    parameters: [catalogParam("reasoning", ["none", "low", "medium", "high", "xhigh"])]
  },
  {
    id: "gpt-5.5",
    displayName: "GPT-5.5",
    parameters: [
      catalogParam("context", ["272k", "1m"]),
      catalogParam("reasoning", ["none", "low", "medium", "high", "extra-high"])
    ]
  },
  {
    id: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna",
    parameters: [
      catalogParam("context", ["272k", "1m"]),
      catalogParam("reasoning", ["none", "low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol",
    parameters: [
      catalogParam("context", ["272k", "1m"]),
      catalogParam("reasoning", ["none", "low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "gpt-5.6-terra",
    displayName: "GPT-5.6 Terra",
    parameters: [
      catalogParam("context", ["272k", "1m"]),
      catalogParam("reasoning", ["none", "low", "medium", "high", "xhigh", "max"])
    ]
  },
  {
    id: "grok-4.5",
    displayName: "Cursor Grok 4.5",
    parameters: [catalogParam("effort", ["low", "medium", "high"])]
  },
  {
    id: "grok-4.6",
    displayName: "Cursor Grok 4.6",
    parameters: [catalogParam("effort", ["low", "medium", "high", "xhigh"])]
  },
  { id: "kimi-k2.7-code", displayName: "Kimi K2.7 Code" },
  {
    id: "kimi-k3",
    displayName: "Kimi K3",
    parameters: [catalogParam("reasoning", ["low", "high", "max"])]
  }
];
var CURSOR_CONTEXT_WINDOWS = {
  "claude-fable-5": 1e6,
  "claude-haiku-4-5": 2e5,
  "claude-opus-4-5": 2e5,
  "claude-opus-4-6": 1e6,
  "claude-opus-4-7": 1e6,
  "claude-opus-4-8": 1e6,
  "claude-opus-5": 1e6,
  "claude-sonnet-4": 2e5,
  "claude-sonnet-4-5": 2e5,
  "claude-sonnet-4-6": 1e6,
  "claude-sonnet-5": 1e6,
  "composer-2": 2e5,
  "composer-2.5": 2e5,
  default: 2e5,
  "gemini-2.5-flash": 2e5,
  "gemini-3-flash": 2e5,
  "gemini-3.1-pro": 2e5,
  "gemini-3.5-flash": 2e5,
  "gemini-3.6-flash": 2e5,
  "gemini-3.7-flash": 2e5,
  "glm-5.2": 2e5,
  "gpt-5-mini": 272e3,
  "gpt-5.1": 272e3,
  "gpt-5.2": 272e3,
  "gpt-5.3-codex": 272e3,
  "gpt-5.4": 1e6,
  "gpt-5.4-mini": 272e3,
  "gpt-5.4-nano": 272e3,
  "gpt-5.5": 1e6,
  "gpt-5.6-luna": 1e6,
  "gpt-5.6-sol": 1e6,
  "gpt-5.6-terra": 1e6,
  "grok-4.5": 2e5,
  "grok-4.6": 256e3,
  "kimi-k2.7-code": 2e5,
  "kimi-k3": 2e5
};

// src/context-windows.ts
var DEFAULT_CONTEXT_WINDOW = 2e5;
var CURSOR_CONTEXT_WINDOWS2 = CURSOR_CONTEXT_WINDOWS;
function lookupCursorContextWindow(catalogId) {
  return CURSOR_CONTEXT_WINDOWS2[catalogId] ?? DEFAULT_CONTEXT_WINDOW;
}

// src/sdk.ts
async function loadCursorSdk() {
  return import("@cursor/sdk");
}

// src/models.ts
var CURSOR_SDK_BASE_URL = "https://cursor.com";
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
var selectionIdByOmpId = {};
function toProviderModels(items) {
  return items.map((item) => {
    const thinking = thinkingFromItem(item);
    const ompId = item.id.replace(/(\d)\.(\d)/g, "$1-$2");
    const contextWindow = contextWindowFromItem(item);
    selectionIdByOmpId[ompId] = item.id;
    return {
      id: ompId,
      name: item.displayName || item.id,
      reasoning: thinking !== void 0,
      ...thinking ? { thinking } : {},
      input: [...TEXT_AND_IMAGE],
      cost: { ...ZERO_COST },
      contextWindow,
      maxTokens: contextWindow
    };
  });
}
var bootstrapCursorModels = toProviderModels(FALLBACK_CATALOG_ITEMS);
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
  return largest > 0 ? largest : lookupCursorContextWindow(item.id);
}
function thinkingFromItem(item) {
  const effort = getParameter(item, "effort") ?? getParameter(item, "reasoning");
  if (!effort) return void 0;
  const values = effort.values.map((entry) => entry.value.toLowerCase() === "extra-high" ? "xhigh" : entry.value.toLowerCase()).filter((value) => KNOWN_EFFORT[value]);
  const ordered = EFFORT_ORDER.filter((level) => values.includes(level));
  if (ordered.length === 0) return void 0;
  return {
    mode: "effort",
    efforts: ordered
  };
}
function mapCursorModels(items) {
  if (items.length === 0) return bootstrapCursorModels;
  return toProviderModels(items);
}
async function fetchCursorModels(apiKey) {
  const key = resolveCursorApiKey(apiKey);
  if (!key) return bootstrapCursorModels;
  try {
    const sdk = await loadCursorSdk();
    return mapCursorModels(await sdk.Cursor.models.list({ apiKey: key }));
  } catch {
    return bootstrapCursorModels;
  }
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
  /** True once the SDK run generator can no longer produce events. */
  finished = false;
  /** Tool calls emitted after their segment's stream ended; replayed on reattach. */
  deferredCalls = [];
  /** Liveness hook armed by the stream layer's stall watchdog for the active segment. */
  onActivity;
  /** Report liveness so a segment with flowing SDK events outlives the silence deadline. */
  touch() {
    this.onActivity?.();
  }
  #segment;
  #streamOpen = false;
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
    this.#streamOpen = true;
    this.touch();
    const deferred = this.deferredCalls;
    this.deferredCalls = [];
    for (const toolCall of deferred) this.emitToolCall(toolCall);
  }
  /** True once closed or failed; a dead run cannot serve further turns. */
  get isDead() {
    return this.#closed || this.failureMessage !== void 0;
  }
  /** Called by the stream layer whenever the attached segment stream terminates. */
  markStreamEnded() {
    this.#streamOpen = false;
  }
  /**
   * Emit a tool call to the consumer. When the segment's stream has already
   * ended, the call is held and replayed onto the next attached stream so the
   * host still sees it and can execute it.
   */
  emitToolCall(toolCall) {
    if (this.#closed) return;
    const stream = this.stream;
    const partial = this.partial;
    if (!this.#streamOpen || !stream || !partial) {
      this.deferredCalls.push(toolCall);
      return;
    }
    partial.content.push(toolCall);
    const index = partial.content.length - 1;
    const delta = JSON.stringify(toolCall.arguments);
    stream.push({ type: "toolcall_start", contentIndex: index, partial });
    stream.push({ type: "toolcall_delta", contentIndex: index, delta, partial });
    stream.push({ type: "toolcall_end", contentIndex: index, toolCall, partial });
  }
  /** Stall detection: fail the waiting segment so callers get an error, not silence. */
  fail(message) {
    if (this.#closed) return;
    this.failureMessage = message;
    void this.run?.cancel();
    this.endSegment("error");
  }
  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#streamOpen = false;
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
        live.touch();
        live.emitToolCall(toolCall);
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
var DEFAULT_STALL_TIMEOUT_MS = 12e4;
var stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS;
function armStallWatchdog(live, phase) {
  let lastActivity = Date.now();
  const touch = () => {
    lastActivity = Date.now();
  };
  live.onActivity = touch;
  const timer = setInterval(
    () => {
      const idleMs = Date.now() - lastActivity;
      if (idleMs < stallTimeoutMs) return;
      clearInterval(timer);
      live.fail(`Cursor SDK stall: no events for ${Math.round(idleMs / 1e3)}s while ${phase}`);
    },
    Math.max(15, Math.min(1e3, Math.floor(stallTimeoutMs / 4)))
  );
  return {
    touch,
    disarm: () => {
      clearInterval(timer);
      if (live.onActivity === touch) live.onActivity = void 0;
    }
  };
}
function bindAbortSignal(live, options) {
  const signal = options?.signal;
  if (!signal) return void 0;
  const onAbort = () => {
    live.close();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  return () => {
    signal.removeEventListener("abort", onAbort);
  };
}
async function resumeTurn(model, context, stream, partial, existing, options) {
  if (existing.isDead || existing.finished) {
    deleteLiveRun(options ?? {});
    existing.close();
    const reason = existing.failureMessage ?? "Cursor run ended before its tool results arrived";
    finish(stream, makeMessage(model, "error", reason), "error");
    return;
  }
  existing.attach(stream, partial);
  const watchdog = armStallWatchdog(existing, "resuming after tool results");
  const removeAbort = bindAbortSignal(existing, options);
  try {
    const next = existing.waitSegment();
    resumeLiveRun(context, existing);
    await settleSegment(model, stream, partial, existing, options, await next);
  } catch (error) {
    await settleSegment(model, stream, partial, existing, options, classifyError(options, error));
  } finally {
    watchdog.disarm();
    removeAbort?.();
  }
}
async function freshTurn(model, context, stream, partial, options) {
  const live = new CursorSdkLiveRun();
  live.attach(stream, partial);
  if (options?.providerSessionState) putLiveRun(options, live);
  const watchdog = armStallWatchdog(live, "starting the run");
  const removeAbort = bindAbortSignal(live, options);
  try {
    const rawKey = await resolveApiKeyOnce(options?.apiKey, options?.signal);
    watchdog.touch();
    const apiKey = resolveCursorApiKey(rawKey);
    if (!apiKey) {
      deleteLiveRun(options ?? {});
      finish(stream, makeMessage(model, "error", MISSING_KEY), "error");
      return;
    }
    if (options?.signal?.aborted) throw new Error("aborted");
    const sdk = await loadCursorSdk();
    watchdog.touch();
    const cwd = options?.cwd ?? process.cwd();
    const selectionId = cursorSelectionId(model.id);
    const agent = await sdk.Agent.create({
      apiKey,
      model: { id: selectionId },
      tools: ["mcp"],
      local: { cwd, customTools: buildCustomTools(context.tools, live) }
    });
    watchdog.touch();
    live.agent = agent;
    if (live.isDead) throw new Error(live.failureMessage ?? "aborted");
    const next = live.waitSegment();
    const sendPromise = agent.send(buildCursorPrompt(context), { model: { id: selectionId } });
    const interrupted = await Promise.race([sendPromise.then(() => null), next]);
    if (interrupted !== null) {
      void sendPromise.then((run2) => {
        live.run = run2;
        return run2.cancel();
      }).catch(() => {
      });
      await settleSegment(model, stream, partial, live, options, interrupted);
      return;
    }
    const run = await sendPromise;
    watchdog.touch();
    live.run = run;
    void consumeRun(live, stream, partial, run);
    await settleSegment(model, stream, partial, live, options, await next);
  } catch (error) {
    await settleSegment(model, stream, partial, live, options, classifyError(options, error));
  } finally {
    watchdog.disarm();
    removeAbort?.();
  }
}
function streamCursor(model, context, options) {
  const stream = createAssistantMessageEventStream();
  const partial = makeMessage(model, "stop");
  void (async () => {
    stream.push({ type: "start", partial });
    const existing = getLiveRun(options ?? {});
    if (existing && shouldResumeLiveRun(context, existing)) {
      await resumeTurn(model, context, stream, partial, existing, options);
      return;
    }
    existing?.close();
    deleteLiveRun(options ?? {});
    await freshTurn(model, context, stream, partial, options);
  })().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    finish(stream, makeMessage(model, "error", message), "error");
  });
  return stream;
}
async function consumeRun(live, stream, fallback, run) {
  try {
    for await (const event of run.stream()) {
      live.touch();
      const target = live.partial ?? fallback;
      const out = live.stream ?? stream;
      const terminal = applySdkEvent(out, target, live, event);
      if (terminal) {
        live.finished = true;
        live.endSegment(terminal);
        return;
      }
    }
    live.finished = true;
    live.endSegment("stop");
  } catch (error) {
    live.finished = true;
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
    live.markStreamEnded();
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
  live.markStreamEnded();
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
  pi.registerCommand("update-catalog", {
    description: "Update the Cursor model catalog from Cursor.models.list",
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
        ctx.modelRegistry.registerProvider("cursor-sdk", cursorSdkProvider(models));
        if (!ctx.hasUI) return;
        ctx.ui.notify(`Cursor SDK catalog updated with ${models.length} models.`, "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Cursor SDK catalog update failed: ${message}`, "error");
      }
    }
  });
}
export {
  bootstrapCursorModels,
  index_default as default,
  fetchCursorModels,
  mapCursorModels,
  resolveCursorApiKey,
  streamCursor
};
