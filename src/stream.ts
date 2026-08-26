import type {
  Api,
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  SimpleStreamOptions,
  TextContent,
  ThinkingContent,
  ToolCall,
} from "@oh-my-pi/pi-ai";
import { createAssistantMessageEventStream } from "@oh-my-pi/pi-ai";
import { resolveCursorApiKey } from "./api-key.js";
import { type AgentEvent, runAgent } from "./cli.js";
import { buildCursorPrompt } from "./prompt.js";
import { cliToolLabel, mapCliToolCall } from "./tool-map.js";

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
  } as AssistantMessage;
}

/** Tracks one growing text or thinking block across delta and snapshot events. */
class BlockWriter {
  #index = -1;
  #emitted = "";

  constructor(
    private readonly stream: AssistantMessageEventStream,
    private readonly partial: AssistantMessage,
    private readonly kind: "text" | "thinking",
  ) {}

  /** Emit whatever part of `incoming` the consumer has not seen yet. */
  write(incoming: string): void {
    if (!incoming) return;
    let delta = incoming;
    if (this.#emitted.length > 0) {
      if (incoming.startsWith(this.#emitted)) {
        delta = incoming.slice(this.#emitted.length);
        this.#emitted = incoming;
      } else if (this.#emitted.startsWith(incoming)) {
        return;
      } else {
        this.#emitted += incoming;
      }
    } else {
      this.#emitted = incoming;
    }
    if (!delta) return;

    if (this.#index < 0) {
      if (this.kind === "text") {
        this.partial.content.push({ type: "text", text: "" } satisfies TextContent);
      } else {
        this.partial.content.push({ type: "thinking", thinking: "" } satisfies ThinkingContent);
      }
      this.#index = this.partial.content.length - 1;
      this.stream.push({
        type: this.kind === "text" ? "text_start" : "thinking_start",
        contentIndex: this.#index,
        partial: this.partial,
      });
    }

    const block = this.partial.content[this.#index];
    if (this.kind === "text" && block?.type === "text") block.text += delta;
    if (this.kind === "thinking" && block?.type === "thinking") block.thinking += delta;

    this.stream.push({
      type: this.kind === "text" ? "text_delta" : "thinking_delta",
      contentIndex: this.#index,
      delta,
      partial: this.partial,
    });
  }
}

function applyUsage(partial: AssistantMessage, event: AgentEvent): void {
  const usage = event.usage;
  if (!usage) return;
  partial.usage.input = usage.inputTokens ?? 0;
  partial.usage.output = usage.outputTokens ?? 0;
  partial.usage.cacheRead = usage.cacheReadTokens ?? 0;
  partial.usage.cacheWrite = usage.cacheWriteTokens ?? 0;
  partial.usage.totalTokens =
    partial.usage.input + partial.usage.output + partial.usage.cacheRead + partial.usage.cacheWrite;
}

function firstToolEntry(event: AgentEvent): { cliKey: string; args: Record<string, unknown> } | undefined {
  const call = event.tool_call;
  if (!call) return undefined;
  for (const [cliKey, payload] of Object.entries(call)) {
    if (!cliKey.endsWith("ToolCall")) continue;
    return { cliKey, args: (payload?.args ?? {}) as Record<string, unknown> };
  }
  return undefined;
}

export function streamCursor(model: Model<Api>, context: Context, options?: SimpleStreamOptions) {
  const stream = createAssistantMessageEventStream();
  const partial = makeMessage(model, "stop");

  void (async () => {
    stream.push({ type: "start", partial });

    const run = runAgent({
      prompt: buildCursorPrompt(context),
      model: model.id,
      cwd: options?.cwd ?? process.cwd(),
      apiKey: resolveCursorApiKey(typeof options?.apiKey === "string" ? options.apiKey : undefined),
    });

    const onAbort = () => {
      run.kill();
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    const offered = new Set((context.tools ?? []).map((tool) => tool.name));
    const text = new BlockWriter(stream, partial, "text");
    const thinking = new BlockWriter(stream, partial, "thinking");
    let handedOver: ToolCall | undefined;

    try {
      for await (const event of run.events) {
        if (event.type === "thinking") {
          thinking.write(event.text ?? "");
          continue;
        }

        if (event.type === "assistant") {
          for (const block of event.message?.content ?? []) {
            if (block.type === "text") text.write(block.text ?? "");
          }
          continue;
        }

        if (event.type === "tool_call" && event.subtype === "started") {
          const entry = firstToolEntry(event);
          if (!entry) continue;
          const mapped = mapCliToolCall(entry.cliKey, entry.args, offered);
          if (!mapped) {
            // No host tool matches; the CLI keeps that call and we only narrate it.
            text.write(`\n[${cliToolLabel(entry.cliKey)} ran inside Cursor]\n`);
            continue;
          }
          // Kill first: the CLI would otherwise execute this call itself.
          run.kill();
          handedOver = {
            type: "toolCall",
            id: event.call_id ?? `cursor-${Date.now()}`,
            name: mapped.name,
            arguments: mapped.args,
          };
          partial.content.push(handedOver);
          const index = partial.content.length - 1;
          stream.push({ type: "toolcall_start", contentIndex: index, partial });
          stream.push({ type: "toolcall_delta", contentIndex: index, delta: JSON.stringify(mapped.args), partial });
          stream.push({ type: "toolcall_end", contentIndex: index, toolCall: handedOver, partial });
          break;
        }

        if (event.type === "result") {
          applyUsage(partial, event);
          break;
        }
      }
    } finally {
      options?.signal?.removeEventListener("abort", onAbort);
    }

    const { code, stderr } = await run.outcome;

    if (options?.signal?.aborted) {
      const message = makeMessage(model, "aborted", "aborted");
      stream.push({ type: "error", reason: "aborted", error: message });
      stream.end(message);
      return;
    }

    if (handedOver) {
      partial.stopReason = "toolUse";
      stream.push({ type: "done", reason: "toolUse", message: partial });
      stream.end(partial);
      return;
    }

    const producedOutput = partial.content.some(
      (block) => (block.type === "text" && block.text.length > 0) || block.type === "thinking",
    );
    if (!producedOutput && code !== 0) {
      const message = makeMessage(model, "error", stderr || `Cursor CLI exited with code ${code}`);
      stream.push({ type: "error", reason: "error", error: message });
      stream.end(message);
      return;
    }

    partial.stopReason = "stop";
    stream.push({ type: "done", reason: "stop", message: partial });
    stream.end(partial);
  })().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    const message = makeMessage(model, "error", detail);
    stream.push({ type: "error", reason: "error", error: message });
    stream.end(message);
  });

  return stream;
}
