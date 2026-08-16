import { describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model, ProviderSessionState, Tool } from "@oh-my-pi/pi-ai";

const readTool = {
  name: "read",
  description: "Read a file",
  parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
} as Tool;

const cancel = mock(async () => {});
const close = mock(() => {});
let creates = 0;

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: {
        local?: {
          customTools?: Record<
            string,
            { execute: (a: Record<string, unknown>, c: { toolCallId?: string }) => Promise<unknown> }
          >;
        };
      }) => {
        creates += 1;
        const tools = options.local?.customTools;
        return {
          agentId: `agent-${creates}`,
          close,
          send: async () => ({
            id: `run-${creates}`,
            agentId: `agent-${creates}`,
            cancel,
            async *stream() {
              if (tools?.read) await tools.read.execute({ path: "a.ts" }, { toolCallId: "call-1" });
              yield {
                type: "assistant",
                agent_id: `agent-${creates}`,
                run_id: `run-${creates}`,
                message: { role: "assistant", content: [{ type: "text", text: `turn-${creates}` }] },
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
  id: "composer-2-5",
  name: "Composer 2.5",
  api: "cursor-sdk",
  provider: "cursor-sdk",
  reasoning: false,
  input: ["text", "image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 16384,
  baseUrl: "https://cursor.com",
} as Model<Api>;

describe("hunt: new user while parked", () => {
  it("closes the parked live-run instead of leaking it", async () => {
    const providerSessionState = new Map<string, ProviderSessionState>();
    const parked: Context = {
      messages: [{ role: "user", content: "read a.ts", timestamp: 1 }],
      tools: [readTool],
    };
    for await (const _ of streamCursor(model, parked, { apiKey: "k", sessionId: "s", providerSessionState })) {
    }

    const steered: Context = {
      messages: [
        { role: "user", content: "read a.ts", timestamp: 1 },
        { role: "user", content: "stop and do something else", timestamp: 2 },
      ],
      tools: [readTool],
    };
    for await (const _ of streamCursor(model, steered, { apiKey: "k", sessionId: "s", providerSessionState })) {
    }

    expect(cancel).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(creates).toBe(2);
  });
});
