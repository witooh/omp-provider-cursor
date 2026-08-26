import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Api, Context, Message, Model, ProviderSessionState, SimpleStreamOptions, Tool } from "@oh-my-pi/pi-ai";

interface CapturedAgent {
  customTools: Record<
    string,
    { execute: (args: Record<string, unknown>, ctx: { toolCallId?: string }) => Promise<string> }
  >;
}

interface SendOptionsHook {
  onStep?: () => void;
}

const agent: CapturedAgent = { customTools: {} };

// Real platform timers are the behavior under test: the stall watchdog runs on
// setInterval and is shrunk via the exported seam; fake timers cannot drive it
// (same rationale as stream-stall.test.ts).
mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: { local?: { customTools?: CapturedAgent["customTools"] } }) => {
        agent.customTools = options.local?.customTools ?? {};
        return {
          close: () => {},
          send: async (_prompt: string, sendOptions?: SendOptionsHook) => ({
            cancel: async () => {},
            async *stream() {
              // Turn 1 parks on call-1 immediately.
              await agent.customTools.read.execute({ path: "a" }, { toolCallId: "call-1" });
              yield {
                type: "assistant",
                agent_id: "agent-1",
                run_id: "run-1",
                message: { role: "assistant", content: [{ type: "text", text: "interim" }] },
              };
              // Resumed turn under server-side queueing: zero transport
              // frames, only onStep liveness ticks — one per 50ms for 300ms,
              // double the stall deadline below.
              for (let tick = 0; tick < 6; tick++) {
                await new Promise<void>((resolve) => setTimeout(resolve, TICK_MS));
                sendOptions?.onStep?.();
              }
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
const { setStallTimeoutMs, streamCursor } = await import("../src/stream.js");

const TICK_MS = 50;

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
  message?: { content: Array<{ type: string; id?: string }> };
}

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

afterEach(() => {
  setStallTimeoutMs(120_000);
});

describe("resume turn step liveness", () => {
  it("keeps a resumed segment alive on onStep ticks alone when no frames stream", async () => {
    setStallTimeoutMs(150);
    const providerSessionState = new Map<string, ProviderSessionState>();
    const baseOptions = {
      apiKey: "key-live",
      sessionId: "sess-resume-step",
      providerSessionState,
    } satisfies SimpleStreamOptions;

    const firstContext: Context = {
      messages: [{ role: "user", content: "go", timestamp: 1 }],
      tools: [readTool],
    };
    const firstEvents = await collect(streamCursor(model, firstContext, baseOptions));
    const firstDone = firstEvents.at(-1);
    if (!firstDone || firstDone.type !== "done") throw new Error(`turn 1 did not finish: ${JSON.stringify(firstDone)}`);
    expect(firstDone.reason).toBe("toolUse");

    const secondContext: Context = {
      messages: [
        { role: "user", content: "go", timestamp: 1 },
        { role: "assistant", content: firstDone.message?.content ?? [], timestamp: 2 } as Message,
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
    const secondEvents = await collect(streamCursor(model, secondContext, baseOptions));
    const finalEvent = secondEvents.at(-1);
    if (!finalEvent) throw new Error("resumed turn produced no events");
    // Without the onStep wiring the watchdog kills this segment at ~150ms and
    // the stream ends with an error instead of delivering call-2.
    expect(finalEvent.type).toBe("done");
    expect(finalEvent.reason).toBe("toolUse");
    const calls = (finalEvent.message?.content ?? []).filter((block) => block.type === "toolCall");
    expect(calls.map((call) => call.id)).toEqual(["call-2"]);
  });
});
