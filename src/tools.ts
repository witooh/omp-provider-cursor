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
  #segment: ((reason: LiveRunReason) => void) | undefined;
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
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
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

function emitToolCall(live: CursorSdkLiveRun, toolCall: ToolCall): void {
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
        emitToolCall(live, toolCall);
        live.endSegment("toolUse");
        return promise;
      },
    };
  }
  return custom;
}
