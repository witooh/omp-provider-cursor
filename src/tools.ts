import type { SDKAgent, SDKCustomTool, SDKJsonValue } from "@cursor/sdk";
import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  ProviderSessionState,
  Tool,
  ToolCall,
  ToolResultMessage,
} from "@oh-my-pi/pi-ai";
import { toolWireSchema } from "@oh-my-pi/pi-ai";

export const CURSOR_SDK_SESSION_PREFIX = "cursor-sdk:";

export type LiveRunReason = "stop" | "toolUse" | "aborted" | "error";

interface PendingExecute {
  resolve: (result: string) => void;
  reject: (error: Error) => void;
}

export class CursorSdkLiveRun implements ProviderSessionState {
  pending = new Map<string, PendingExecute>();
  agent: SDKAgent | undefined;
  run: { cancel(): Promise<void> } | undefined;
  stream: AssistantMessageEventStream | undefined;
  partial: AssistantMessage | undefined;
  failureMessage: string | undefined;
  /** True once the SDK run generator can no longer produce events. */
  finished = false;
  /** Tool calls emitted after their segment's stream ended; replayed on reattach. */
  deferredCalls: ToolCall[] = [];
  /** Liveness hook armed by the stream layer's stall watchdog for the active segment. */
  onActivity: (() => void) | undefined;
  /** Report liveness so a segment with flowing SDK events outlives the silence deadline. */
  touch(): void {
    this.onActivity?.();
  }
  #segment: ((reason: LiveRunReason) => void) | undefined;
  #streamOpen = false;
  #closed = false;

  waitSegment(): Promise<LiveRunReason> {
    const { promise, resolve } = Promise.withResolvers<LiveRunReason>();
    this.#segment = resolve;
    return promise;
  }

  endSegment(reason: LiveRunReason): void {
    const resolve = this.#segment;
    this.#segment = undefined;
    resolve?.(reason);
  }

  attach(stream: AssistantMessageEventStream, partial: AssistantMessage): void {
    this.stream = stream;
    this.partial = partial;
    this.#streamOpen = true;
    this.touch();
    const deferred = this.deferredCalls;
    this.deferredCalls = [];
    for (const toolCall of deferred) this.emitToolCall(toolCall);
  }

  /** True once closed or failed; a dead run cannot serve further turns. */
  get isDead(): boolean {
    return this.#closed || this.failureMessage !== undefined;
  }

  /** Called by the stream layer whenever the attached segment stream terminates. */
  markStreamEnded(): void {
    this.#streamOpen = false;
  }

  /**
   * Emit a tool call to the consumer. When the segment's stream has already
   * ended, the call is held and replayed onto the next attached stream so the
   * host still sees it and can execute it.
   */
  emitToolCall(toolCall: ToolCall): void {
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
  fail(message: string): void {
    if (this.#closed) return;
    this.failureMessage = message;
    void this.run?.cancel();
    this.endSegment("error");
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#streamOpen = false;
    for (const waiting of this.pending.values()) waiting.reject(new Error("closed"));
    this.pending.clear();
    void this.run?.cancel();
    this.agent?.close();
    this.endSegment("aborted");
  }
}

export function liveRunKey(sessionId?: string): string {
  return `${CURSOR_SDK_SESSION_PREFIX}${sessionId ?? "anon"}`;
}

export function getLiveRun(options: { providerSessionState?: Map<string, ProviderSessionState>; sessionId?: string }) {
  return options.providerSessionState?.get(liveRunKey(options.sessionId)) as CursorSdkLiveRun | undefined;
}

export function putLiveRun(
  options: { providerSessionState?: Map<string, ProviderSessionState>; sessionId?: string },
  live: CursorSdkLiveRun,
): void {
  options.providerSessionState?.set(liveRunKey(options.sessionId), live);
}

export function deleteLiveRun(options: {
  providerSessionState?: Map<string, ProviderSessionState>;
  sessionId?: string;
}): void {
  options.providerSessionState?.delete(liveRunKey(options.sessionId));
}

export function trailingToolResults(context: Context): ToolResultMessage[] {
  const results: ToolResultMessage[] = [];
  for (let index = context.messages.length - 1; index >= 0; index--) {
    const message = context.messages[index];
    if (message.role !== "toolResult") break;
    results.unshift(message);
  }
  return results;
}

export function shouldResumeLiveRun(context: Context, live: CursorSdkLiveRun | undefined): boolean {
  if (!live || live.pending.size === 0) return false;
  return trailingToolResults(context).some((result) => live.pending.has(result.toolCallId));
}

export function resumeLiveRun(context: Context, live: CursorSdkLiveRun): void {
  for (const result of trailingToolResults(context)) {
    const waiting = live.pending.get(result.toolCallId);
    if (!waiting) continue;
    live.pending.delete(result.toolCallId);
    const text = result.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
    waiting.resolve(result.isError ? `Error: ${text}` : text);
  }
}

export function buildCustomTools(
  tools: readonly Tool[] | undefined,
  live: CursorSdkLiveRun,
): Record<string, SDKCustomTool> {
  const custom: Record<string, SDKCustomTool> = {};
  if (!tools) return custom;
  for (const tool of tools) {
    custom[tool.name] = {
      description: tool.description,
      inputSchema: toolWireSchema(tool) as Record<string, SDKJsonValue>,
      execute: (args, executeContext) => {
        const { promise, resolve, reject } = Promise.withResolvers<string>();
        const id = executeContext.toolCallId ?? `call-${tool.name}-${live.pending.size + 1}`;
        const toolCall: ToolCall = {
          type: "toolCall",
          id,
          name: tool.name,
          arguments: args as Record<string, unknown>,
        };
        live.pending.set(id, { resolve, reject });
        live.touch();
        live.emitToolCall(toolCall);
        live.endSegment("toolUse");
        return promise;
      },
    };
  }
  return custom;
}
