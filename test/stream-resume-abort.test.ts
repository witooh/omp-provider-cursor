import { describe, expect, it, mock } from "bun:test";
import type { Api, Context, Message, Model, ProviderSessionState, SimpleStreamOptions, Tool } from "@oh-my-pi/pi-ai";

interface CapturedAgent {
  closed: boolean;
  customTools: Record<
    string,
    { execute: (args: Record<string, unknown>, ctx: { toolCallId?: string }) => Promise<string> }
  >;
}

const agent: CapturedAgent = { closed: false, customTools: {} };
// Set by the test; fired when the SDK generator parks on the second tool call,
// so the abort lands after the resumed segment registered its signal listener.
let onSecondToolCall: (() => void) | undefined;

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: { local?: { customTools?: CapturedAgent["customTools"] } }) => {
        agent.closed = false;
        agent.customTools = options.local?.customTools ?? {};
        return {
          close: () => {
            agent.closed = true;
          },
          send: async () => ({
            cancel: async () => {},
            async *stream() {
              // First omp turn parks on call-1; the resumed turn parks on call-2.
              await agent.customTools.read.execute({ path: "a" }, { toolCallId: "call-1" });
              yield {
                type: "assistant",
                agent_id: "agent-1",
                run_id: "run-1",
                message: { role: "assistant", content: [{ type: "text", text: "interim" }] },
              };
              onSecondToolCall?.();
              await agent.customTools.read.execute({ path: "b" }, { toolCallId: "call-2" });
              yield {
                type: "assistant",
                agent_id: "agent-1",
                run_id: "run-1",
                message: { role: "assistant", content: [{ type: "text", text: "final" }] },
              };
            },
          }),
        };
      },
    },
  }),
}));

// bun:test mock.module must load the subject after the mock is registered.
const { streamCursor } = await import("../src/stream.js");

const model = {
  id: "composer-2.5",
  name: "Composer 2.5",
  api: "cursor-sdk",
  provider: "cursor-sdk",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 16384,
  baseUrl: "https://cursor.com",
} as Model<Api>;

const readTool = {
  name: "read",
  description: "Read a file",
  parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
} as unknown as Tool;

interface StreamEvent {
  type: string;
  reason?: string;
  message?: { content: unknown[] };
}

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe("resume turn abort", () => {
  it("settles aborted when the signal fires during a resumed segment", async () => {
    const providerSessionState = new Map<string, ProviderSessionState>();
    const baseOptions = {
      apiKey: "key-live",
      sessionId: "sess-abort",
      providerSessionState,
    } satisfies SimpleStreamOptions;

    const firstContext: Context = {
      messages: [{ role: "user", content: "go", timestamp: 1 }],
      tools: [readTool],
    };
    const firstEvents = await collect(streamCursor(model, firstContext, baseOptions));
    const done = firstEvents.at(-1);
    if (!done || done.type !== "done") throw new Error(`turn 1 did not finish: ${JSON.stringify(done)}`);
    expect(done.reason).toBe("toolUse");

    const secondContext: Context = {
      messages: [
        { role: "user", content: "go", timestamp: 1 },
        { role: "assistant", content: done.message?.content ?? [], timestamp: 2 } as Message,
        {
          role: "toolResult",
          toolCallId: "call-1",
          toolName: "read",
          content: [{ type: "text", text: "(result for call-1)" }],
          isError: false,
          timestamp: 3,
        } as Message,
      ],
      tools: [readTool],
    };
    const controller = new AbortController();
    onSecondToolCall = () => controller.abort();
    try {
      // bun:test's own per-test timeout is the hang detector here: the pre-fix
      // code never settled this turn because the resumed path ignored the signal.
      const secondEvents = await collect(
        streamCursor(model, secondContext, { ...baseOptions, signal: controller.signal }),
      );
      const finalEvent = secondEvents.at(-1);
      if (!finalEvent) throw new Error("resumed turn produced no events");
      // finish() emits { type: "error", reason: "aborted" | "error" }.
      const outcome = finalEvent.type === "done" ? finalEvent.reason : finalEvent.reason;
      expect(outcome).toBe("aborted");
      expect(agent.closed).toBe(true);
    } finally {
      onSecondToolCall = undefined;
    }
  });
});
