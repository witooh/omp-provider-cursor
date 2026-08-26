import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Api, Context, Message, Model, ProviderSessionState, SimpleStreamOptions, Tool } from "@oh-my-pi/pi-ai";

interface CapturedAgent {
  customTools: Record<
    string,
    { execute: (args: Record<string, unknown>, ctx: { toolCallId?: string }) => Promise<string> }
  >;
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
          send: async () => ({
            cancel: async () => {},
            async *stream() {
              await agent.customTools.read.execute({ path: "a" }, { toolCallId: "call-1" });
              yield {
                type: "assistant",
                agent_id: "agent-1",
                run_id: "run-1",
                message: { role: "assistant", content: [{ type: "text", text: "interim" }] },
              };
              // Resumed turn: the model keeps streaming thinking deltas — each
              // well inside the stall deadline — but the whole segment outlives
              // one full deadline. This mirrors grok xhigh planning for minutes
              // while deltas flow.
              for (let tick = 0; tick < 8; tick++) {
                await new Promise<void>((resolve) => setTimeout(resolve, TICK_MS));
                yield { type: "thinking", text: `tick ${tick}` };
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

const TICK_MS = 60;

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

describe("resume turn activity", () => {
  it("keeps a resumed segment alive while SDK events keep arriving", async () => {
    // Whole resumed segment runs ~8*60ms = 480ms against a 250ms deadline:
    // each tick (60ms) sits well inside the deadline, so only wired liveness
    // keeps the segment alive — yet the segment still outlives one full
    // deadline, which is exactly what killed it pre-fix.
    setStallTimeoutMs(250);
    const providerSessionState = new Map<string, ProviderSessionState>();
    const baseOptions = {
      apiKey: "key-live",
      sessionId: "sess-resume-touch",
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
    expect(finalEvent.type).toBe("done");
    expect(finalEvent.reason).toBe("toolUse");
    const calls = (finalEvent.message?.content ?? []).filter((block) => block.type === "toolCall");
    expect(calls.map((call) => call.id)).toEqual(["call-2"]);
  });
});
