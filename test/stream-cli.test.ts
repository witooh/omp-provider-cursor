import { afterEach, describe, expect, it } from "bun:test";
import type { Api, Context, Model, Tool } from "@oh-my-pi/pi-ai";
import { type AgentEvent, type AgentRunOptions, setAgentRunner } from "../src/cli.js";
import { streamCursor } from "../src/stream.js";

const model = {
  id: "cursor-grok-4.6-high",
  name: "Cursor Grok 4.6",
  api: "cursor-sdk",
  provider: "cursor-sdk",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 200000,
  maxTokens: 200000,
  baseUrl: "https://cursor.com",
} as Model<Api>;

const readTool = { name: "read", description: "Read a file", parameters: {} } as unknown as Tool;

interface StreamEvent {
  type: string;
  reason?: string;
  delta?: string;
  toolCall?: { id: string; name: string; arguments: Record<string, unknown> };
  message?: { usage?: { input: number; output: number; totalTokens: number }; errorMessage?: string };
  error?: { errorMessage?: string };
}

interface Script {
  events: AgentEvent[];
  code?: number;
  stderr?: string;
  /** Resolves once the stream layer kills the run. */
  killed: { value: boolean };
  args: { value?: AgentRunOptions };
}

function scriptRunner(script: Script): void {
  setAgentRunner((options) => {
    script.args.value = options;
    return {
      events: (async function* () {
        for (const event of script.events) {
          if (script.killed.value) return;
          yield event;
        }
      })(),
      kill: () => {
        script.killed.value = true;
      },
      outcome: Promise.resolve({ code: script.code ?? 0, stderr: script.stderr ?? "" }),
    };
  });
}

function makeScript(events: AgentEvent[], code = 0, stderr = ""): Script {
  const script: Script = { events, code, stderr, killed: { value: false }, args: {} };
  scriptRunner(script);
  return script;
}

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

const context: Context = {
  messages: [{ role: "user", content: "go", timestamp: 1 }],
  tools: [readTool],
};

afterEach(() => {
  setAgentRunner(undefined);
});

describe("streamCursor over the Cursor CLI", () => {
  it("streams thinking and text, then finishes with usage", async () => {
    makeScript([
      { type: "thinking", subtype: "delta", text: "planning" },
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "he" }] } },
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "llo" }] } },
      {
        type: "result",
        subtype: "success",
        usage: { inputTokens: 10, outputTokens: 4, cacheReadTokens: 2, cacheWriteTokens: 0 },
      },
    ]);

    const events = await collect(streamCursor(model, context, { apiKey: "key-live" }));
    const types = events.map((event) => event.type);

    expect(types).toContain("thinking_delta");
    expect(types.filter((type) => type === "text_delta")).toHaveLength(2);
    const done = events.at(-1);
    expect(done?.type).toBe("done");
    expect(done?.reason).toBe("stop");
    expect(done?.message?.usage?.totalTokens).toBe(16);
  });

  it("emits one delta when the CLI repeats an accumulated snapshot", async () => {
    makeScript([
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "abc" }] } },
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "abcdef" }] } },
      { type: "result", subtype: "success" },
    ]);

    const events = await collect(streamCursor(model, context, {}));
    const deltas = events.filter((event) => event.type === "text_delta").map((event) => event.delta);

    expect(deltas).toEqual(["abc", "def"]);
  });

  it("hands an intercepted CLI tool call to the host and kills the run", async () => {
    const script = makeScript([
      {
        type: "tool_call",
        subtype: "started",
        call_id: "tool_1",
        tool_call: { readToolCall: { args: { path: "/repo/a.ts" } } },
      },
      { type: "result", subtype: "success" },
    ]);

    const events = await collect(streamCursor(model, context, {}));
    const done = events.at(-1);
    const end = events.find((event) => event.type === "toolcall_end");

    expect(done?.reason).toBe("toolUse");
    expect(end?.toolCall?.name).toBe("read");
    expect(end?.toolCall?.arguments).toEqual({ path: "/repo/a.ts", i: "Reading file" });
    expect(end?.toolCall?.id).toBe("tool_1");
    expect(script.killed.value).toBe(true);
  });

  it("narrates a CLI-owned tool the host cannot run and keeps streaming", async () => {
    makeScript([
      { type: "tool_call", subtype: "started", call_id: "t2", tool_call: { todoToolCall: { args: {} } } },
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
      { type: "result", subtype: "success" },
    ]);

    const events = await collect(streamCursor(model, context, {}));
    const deltas = events.filter((event) => event.type === "text_delta").map((event) => event.delta);

    expect(deltas.join("")).toContain("[Todo ran inside Cursor]");
    expect(events.at(-1)?.reason).toBe("stop");
  });

  it("surfaces a CLI failure that produced no output", async () => {
    makeScript([], 1, "cursor-agent: not logged in");

    const events = await collect(streamCursor(model, context, {}));
    const last = events.at(-1);

    expect(last?.type).toBe("error");
    expect(last?.error?.errorMessage).toContain("not logged in");
  });

  it("passes prompt, model, cwd and api key to the CLI", async () => {
    const script = makeScript([{ type: "result", subtype: "success" }]);

    await collect(streamCursor(model, context, { apiKey: "key-live", cwd: "/repo" }));

    expect(script.args.value?.model).toBe("cursor-grok-4.6-high");
    expect(script.args.value?.cwd).toBe("/repo");
    expect(script.args.value?.apiKey).toBe("key-live");
    expect(script.args.value?.prompt).toContain("[User]\ngo");
  });

  it("reports an aborted run", async () => {
    makeScript([{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } }]);
    const controller = new AbortController();
    const stream = streamCursor(model, context, { signal: controller.signal });
    controller.abort();

    const events = await collect(stream);
    const last = events.at(-1);

    expect(last?.type).toBe("error");
    expect(last?.reason).toBe("aborted");
  });
});
