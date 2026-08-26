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

const DEFAULT_STALL_TIMEOUT_MS = 120_000;

let stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS;

/** Test seam: shrink the provider-silence deadline before arming a turn. */
export function setStallTimeoutMs(timeoutMs: number): void {
  stallTimeoutMs = timeoutMs;
}

interface StallWatchdog {
  touch: () => void;
  disarm: () => void;
}

function armStallWatchdog(live: CursorSdkLiveRun, phase: string): StallWatchdog {
  let lastActivity = Date.now();
  const touch = () => {
    lastActivity = Date.now();
  };
  // Events keep flowing through consumers started by earlier turns, so the
  // liveness hook on the run itself — not this turn's loop — must feed the
  // deadline while a resumed segment is in flight.
  live.onActivity = touch;
  const timer = setInterval(
    () => {
      const idleMs = Date.now() - lastActivity;
      if (idleMs < stallTimeoutMs) return;
      clearInterval(timer);
      live.fail(`Cursor SDK stall: no events for ${Math.round(idleMs / 1000)}s while ${phase}`);
    },
    Math.max(15, Math.min(1000, Math.floor(stallTimeoutMs / 4))),
  );
  return {
    touch,
    disarm: () => {
      clearInterval(timer);
      if (live.onActivity === touch) live.onActivity = undefined;
    },
  };
}

function bindAbortSignal(live: CursorSdkLiveRun, options: SimpleStreamOptions | undefined): (() => void) | undefined {
  const signal = options?.signal;
  if (!signal) return undefined;
  const onAbort = () => {
    live.close();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  return () => {
    signal.removeEventListener("abort", onAbort);
  };
}

async function resumeTurn(
  model: Model<Api>,
  context: Context,
  stream: AssistantMessageEventStream,
  partial: AssistantMessage,
  existing: CursorSdkLiveRun,
  options: SimpleStreamOptions | undefined,
): Promise<void> {
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

async function freshTurn(
  model: Model<Api>,
  context: Context,
  stream: AssistantMessageEventStream,
  partial: AssistantMessage,
  options: SimpleStreamOptions | undefined,
): Promise<void> {
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
      local: { cwd, customTools: buildCustomTools(context.tools, live) },
    });
    watchdog.touch();
    live.agent = agent;
    if (live.isDead) throw new Error(live.failureMessage ?? "aborted");

    const next = live.waitSegment();
    // The watchdog or the abort signal may terminate the segment while the
    // send handshake is still in flight; race them so we always settle.
    const sendPromise = agent.send(buildCursorPrompt(context), { model: { id: selectionId } });
    const interrupted = await Promise.race([sendPromise.then(() => null as LiveRunReason | null), next]);
    if (interrupted !== null) {
      void sendPromise
        .then((run) => {
          live.run = run;
          return run.cancel();
        })
        .catch(() => {});
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

export function streamCursor(model: Model<Api>, context: Context, options?: SimpleStreamOptions) {
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
