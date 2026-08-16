import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model, SimpleStreamOptions } from "@oh-my-pi/pi-ai";
import { CURSOR_API_KEY_CONFIG_VALUE } from "../src/api-key.js";

interface FakeAssistantEvent {
  type: "assistant";
  agent_id: string;
  run_id: string;
  message: { role: "assistant"; content: Array<{ type: "text"; text: string }> };
}

interface FakeThinkingEvent {
  type: "thinking";
  agent_id: string;
  run_id: string;
  text: string;
}

type FakeSdkEvent = FakeAssistantEvent | FakeThinkingEvent;

const events = {
  assistant: (text: string): FakeAssistantEvent => ({
    type: "assistant",
    agent_id: "agent-1",
    run_id: "run-1",
    message: { role: "assistant", content: [{ type: "text", text }] },
  }),
  thinking: (text: string): FakeThinkingEvent => ({
    type: "thinking",
    agent_id: "agent-1",
    run_id: "run-1",
    text,
  }),
};

function createFakeRun(messages: FakeSdkEvent[]) {
  const cancel = mock(async () => {});
  return {
    id: "run-1",
    agentId: "agent-1",
    status: "finished" as const,
    cancel,
    async *stream() {
      for (const message of messages) yield message;
    },
    wait: async () => ({ id: "run-1", status: "finished" as const, result: "ok" }),
  };
}

type FakeRun = ReturnType<typeof createFakeRun>;

const createCalls: unknown[] = [];
const sendCalls: unknown[] = [];
let fakeRun: FakeRun = createFakeRun([events.thinking("hmm"), events.assistant("hello")]);

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async (options: unknown) => {
        createCalls.push(options);
        return {
          agentId: "agent-1",
          send: async (payload: unknown) => {
            sendCalls.push(payload);
            return fakeRun;
          },
          close: () => {},
        };
      },
    },
  }),
}));

// bun:test mock.module must load the subject after the mock is registered.
const { streamCursor } = await import("../src/stream.js");

const originalKey = process.env.CURSOR_API_KEY;

afterEach(() => {
  createCalls.length = 0;
  sendCalls.length = 0;
  fakeRun = createFakeRun([events.thinking("hmm"), events.assistant("hello")]);
  if (originalKey === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = originalKey;
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

const context: Context = {
  systemPrompt: ["sys"],
  messages: [{ role: "user", content: "Say hello", timestamp: 1 }],
};

async function collect(options?: SimpleStreamOptions) {
  const types: string[] = [];
  let text = "";
  let thinking = "";
  let errorMessage: string | undefined;
  for await (const event of streamCursor(model, context, options)) {
    types.push(event.type);
    if (event.type === "text_delta") text += event.delta;
    if (event.type === "thinking_delta") thinking += event.delta;
    if (event.type === "error") errorMessage = event.error.errorMessage;
  }
  return { types, text, thinking, errorMessage };
}

describe("streamCursor text", () => {
  it("errors with a key hint when no API key is resolved", async () => {
    delete process.env.CURSOR_API_KEY;
    const result = await collect({ apiKey: CURSOR_API_KEY_CONFIG_VALUE });
    expect(result.types).toContain("error");
    expect(result.errorMessage).toContain("CURSOR_API_KEY");
    expect(result.errorMessage?.includes("/login")).toBe(false);
    expect(createCalls).toHaveLength(0);
  });

  it("streams thinking and assistant text from a local Agent.send", async () => {
    const result = await collect({ apiKey: "key-live" });
    expect(result.thinking).toBe("hmm");
    expect(result.text).toBe("hello");
    expect(result.types.at(-1)).toBe("done");
    expect(createCalls[0]).toEqual(
      expect.objectContaining({
        apiKey: "key-live",
        model: { id: "composer-2.5" },
        tools: ["mcp"],
        local: expect.objectContaining({ cwd: expect.any(String) }),
      }),
    );
    const created = createCalls[0];
    const local =
      created && typeof created === "object" && "local" in created && created.local && typeof created.local === "object"
        ? created.local
        : undefined;
    expect(local && "settingSources" in local ? local.settingSources : undefined).toBeUndefined();
    expect(sendCalls[0]).toEqual(expect.objectContaining({ text: expect.stringContaining("Say hello") }));
  });

  it("cancels the SDK run when the abort signal fires", async () => {
    const abort = new AbortController();
    fakeRun = createFakeRun([events.assistant("partial")]);
    const originalStream = fakeRun.stream.bind(fakeRun);
    fakeRun.stream = async function* () {
      abort.abort();
      yield* originalStream();
    };
    const result = await collect({ apiKey: "key-live", signal: abort.signal });
    expect(fakeRun.cancel).toHaveBeenCalled();
    expect(result.types).toContain("error");
  });
});
