import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model, ProviderSessionState, SimpleStreamOptions, Tool } from "@oh-my-pi/pi-ai";

const readTool = {
  name: "read",
  description: "Read a file",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
} as Tool;

interface FakeAssistantEvent {
  type: "assistant";
  agent_id: string;
  run_id: string;
  message: { role: "assistant"; content: Array<{ type: "text"; text: string }> };
}

const assistantEvent = (text: string): FakeAssistantEvent => ({
  type: "assistant",
  agent_id: "agent-1",
  run_id: "run-1",
  message: { role: "assistant", content: [{ type: "text", text }] },
});

let capturedTools:
  | Record<string, { execute: (args: Record<string, unknown>, ctx: { toolCallId?: string }) => Promise<unknown> }>
  | undefined;
const createCalls: unknown[] = [];
const sendCalls: unknown[] = [];
const cancel = mock(async () => {});

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: { local?: { customTools?: typeof capturedTools } }) => {
        createCalls.push(options);
        capturedTools = options.local?.customTools;
        return {
          agentId: "agent-1",
          close: () => {},
          send: async (payload: unknown) => {
            sendCalls.push(payload);
            return {
              id: "run-1",
              agentId: "agent-1",
              cancel,
              async *stream() {
                const tools = capturedTools;
                if (!tools?.read) return;
                const result = await tools.read.execute({ path: "a.ts" }, { toolCallId: "call-1" });
                yield assistantEvent(String(result));
              },
            };
          },
        };
      },
    },
  }),
}));

// bun:test mock.module must load the subject after the mock is registered.
const { streamCursor } = await import("../src/stream.js");

afterEach(() => {
  createCalls.length = 0;
  sendCalls.length = 0;
  capturedTools = undefined;
  cancel.mockClear();
});

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

async function collect(context: Context, options?: SimpleStreamOptions) {
  const types: string[] = [];
  let text = "";
  let toolName: string | undefined;
  let stopReason: string | undefined;
  for await (const event of streamCursor(model, context, options)) {
    types.push(event.type);
    if (event.type === "text_delta") text += event.delta;
    if (event.type === "toolcall_end") toolName = event.toolCall.name;
    if (event.type === "done") stopReason = event.reason;
  }
  return { types, text, toolName, stopReason };
}

describe("streamCursor live-run tools", () => {
  it("parks customTools.execute and resumes from providerSessionState", async () => {
    const providerSessionState = new Map<string, ProviderSessionState>();
    const first: Context = {
      messages: [{ role: "user", content: "read a.ts", timestamp: 1 }],
      tools: [readTool],
    };
    const parked = await collect(first, { apiKey: "key-live", sessionId: "sess-1", providerSessionState });
    expect(parked.toolName).toBe("read");
    expect(parked.stopReason).toBe("toolUse");
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]).toEqual(expect.objectContaining({ tools: ["mcp"] }));

    const second: Context = {
      messages: [
        { role: "user", content: "read a.ts", timestamp: 1 },
        {
          role: "assistant",
          content: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "a.ts" } }],
          api: "cursor-sdk",
          provider: "cursor-sdk",
          model: "composer-2-5",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: "toolUse",
          timestamp: 2,
        },
        {
          role: "toolResult",
          toolCallId: "call-1",
          toolName: "read",
          content: [{ type: "text", text: "file-body" }],
          isError: false,
          timestamp: 3,
        },
      ],
      tools: [readTool],
    };
    const resumed = await collect(second, { apiKey: "key-live", sessionId: "sess-1", providerSessionState });
    expect(resumed.text).toBe("file-body");
    expect(resumed.stopReason).toBe("stop");
    expect(createCalls).toHaveLength(1);
    expect(sendCalls).toHaveLength(1);
  });

  it("close() cancels a parked live-run", async () => {
    const providerSessionState = new Map<string, ProviderSessionState>();
    const first: Context = {
      messages: [{ role: "user", content: "read a.ts", timestamp: 1 }],
      tools: [readTool],
    };
    await collect(first, { apiKey: "key-live", sessionId: "sess-1", providerSessionState });
    for (const state of providerSessionState.values()) state.close();
    expect(cancel).toHaveBeenCalled();
  });
});
