import type { SDKMessage } from "@cursor/sdk";
import type {
  Api,
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  SimpleStreamOptions,
  TextContent,
  ThinkingContent,
} from "@oh-my-pi/pi-ai";
import { createAssistantMessageEventStream, resolveApiKeyOnce } from "@oh-my-pi/pi-ai";
import { resolveCursorApiKey } from "./api-key.js";
import { cursorSelectionId } from "./models.js";
import { buildCursorPrompt } from "./prompt.js";
import { loadCursorSdk } from "./sdk.js";
import {
  buildCustomTools,
  CursorSdkLiveRun,
  deleteLiveRun,
  getLiveRun,
  type LiveRunReason,
  putLiveRun,
  resumeLiveRun,
  shouldResumeLiveRun,
} from "./tools.js";

const MISSING_KEY = "Cursor SDK API key is not configured. Set CURSOR_API_KEY or pass --api-key.";

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function makeMessage(
  model: Model<Api>,
  stopReason: AssistantMessage["stopReason"],
  errorMessage?: string,
): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: emptyUsage(),
    stopReason,
    timestamp: Date.now(),
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function appendText(partial: AssistantMessage, text: string): number {
  const last = partial.content.at(-1);
  if (last?.type === "text") {
    last.text += text;
    return partial.content.length - 1;
  }
  partial.content.push({ type: "text", text } satisfies TextContent);
  return partial.content.length - 1;
}

function appendThinking(partial: AssistantMessage, text: string): number {
  const last = partial.content.at(-1);
  if (last?.type === "thinking") {
    last.thinking += text;
    return partial.content.length - 1;
  }
  partial.content.push({ type: "thinking", thinking: text } satisfies ThinkingContent);
  return partial.content.length - 1;
}

export function streamCursor(model: Model<Api>, context: Context, options?: SimpleStreamOptions) {
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
      local: { cwd, customTools: buildCustomTools(context.tools, live) },
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
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    finish(stream, makeMessage(model, "error", message), "error");
  });

  return stream;
}

async function consumeRun(
  live: CursorSdkLiveRun,
  stream: AssistantMessageEventStream,
  fallback: AssistantMessage,
  run: { stream(): AsyncGenerator<SDKMessage, void> },
): Promise<void> {
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

async function settleSegment(
  model: Model<Api>,
  stream: AssistantMessageEventStream,
  partial: AssistantMessage,
  live: CursorSdkLiveRun,
  options: SimpleStreamOptions | undefined,
  reason: LiveRunReason,
): Promise<void> {
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

function classifyError(options: SimpleStreamOptions | undefined, error: unknown): LiveRunReason {
  if (options?.signal?.aborted || (error instanceof Error && error.message === "aborted")) return "aborted";
  return "error";
}

function finish(stream: AssistantMessageEventStream, message: AssistantMessage, reason: "error" | "aborted"): void {
  stream.push({ type: "error", reason, error: message });
  stream.end(message);
}

function applySdkEvent(
  stream: AssistantMessageEventStream,
  partial: AssistantMessage,
  live: CursorSdkLiveRun,
  event: SDKMessage,
): LiveRunReason | undefined {
  if (event.type === "status") {
    if (event.status === "ERROR") {
      live.failureMessage = event.message ?? "Cursor SDK run failed";
      return "error";
    }
    if (event.status === "CANCELLED") return "aborted";
    return undefined;
  }
  if (event.type === "thinking" && event.text) {
    const index = appendThinking(partial, event.text);
    if (partial.content[index]?.type === "thinking" && partial.content[index].thinking === event.text) {
      stream.push({ type: "thinking_start", contentIndex: index, partial });
    }
    stream.push({ type: "thinking_delta", contentIndex: index, delta: event.text, partial });
    return undefined;
  }
  if (event.type === "assistant") {
    for (const block of event.message.content) {
      if (block.type !== "text" || !block.text) continue;
      const index = appendText(partial, block.text);
      if ((partial.content[index] as TextContent).text === block.text) {
        stream.push({ type: "text_start", contentIndex: index, partial });
      }
      stream.push({ type: "text_delta", contentIndex: index, delta: block.text, partial });
    }
  }
  return undefined;
}
