import { describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model, ProviderSessionState, Tool } from "@oh-my-pi/pi-ai";
import type { CursorSdkLiveRun } from "../src/tools.js";

const readTool = {
  name: "read",
  description: "Read a file",
  parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
} as Tool;

const grepTool = {
  name: "grep",
  description: "Search",
  parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
} as Tool;

let capturedTools:
  | Record<string, { execute: (args: Record<string, unknown>, ctx: { toolCallId?: string }) => Promise<unknown> }>
  | undefined;

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: { local?: { customTools?: typeof capturedTools } }) => {
        capturedTools = options.local?.customTools;
        return {
          agentId: "agent-1",
          close: () => {},
          send: async () => ({
            id: "run-1",
            agentId: "agent-1",
            cancel: mock(async () => {}),
            async *stream() {
              const tools = capturedTools;
              if (!tools?.read || !tools.grep) return;
              const [a, b] = await Promise.all([
                tools.read.execute({ path: "a.ts" }, { toolCallId: "call-read" }),
                tools.grep.execute({ pattern: "x" }, { toolCallId: "call-grep" }),
              ]);
              yield {
                type: "assistant",
                agent_id: "agent-1",
                run_id: "run-1",
                message: { role: "assistant", content: [{ type: "text", text: `${a}|${b}` }] },
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

describe("hunt: parallel customTools", () => {
  it("emits both tool calls when execute runs concurrently", async () => {
    const providerSessionState = new Map<string, ProviderSessionState>();
    const names: string[] = [];
    const first: Context = {
      messages: [{ role: "user", content: "do both", timestamp: 1 }],
      tools: [readTool, grepTool],
    };
    for await (const event of streamCursor(model, first, {
      apiKey: "key-live",
      sessionId: "sess-p",
      providerSessionState,
    })) {
      if (event.type === "toolcall_end") names.push(event.toolCall.name);
    }
    expect(names.sort()).toEqual(["grep", "read"]);
    const live = [...providerSessionState.values()][0] as CursorSdkLiveRun;
    expect([...live.pending.keys()].sort()).toEqual(["call-grep", "call-read"]);
  });
});
