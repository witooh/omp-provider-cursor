import { describe, expect, it } from "bun:test";
import type { AssistantMessage, AssistantMessageEvent, AssistantMessageEventStream, ToolCall } from "@oh-my-pi/pi-ai";
import { createAssistantMessageEventStream } from "@oh-my-pi/pi-ai";
import { CursorSdkLiveRun } from "../src/tools.js";

function toolCall(id: string): ToolCall {
  return { type: "toolCall", id, name: "read", arguments: { path: "a.ts" } };
}

// Four call sites need this exact shape; AssistantMessage requires many fields.
function emptyPartial(): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: "cursor-sdk",
    provider: "cursor-sdk",
    model: "composer-2.5",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: 0,
  };
}

async function pullEventTypes(stream: AssistantMessageEventStream, count: number): Promise<string[]> {
  const iterator = stream[Symbol.asyncIterator]();
  const types: string[] = [];
  for (let index = 0; index < count; index++) {
    const result: IteratorResult<AssistantMessageEvent> = await iterator.next();
    if (result.done) break;
    types.push(result.value.type);
  }
  return types;
}

describe("deferred tool call replay", () => {
  it("emits into the open stream and defers after it ended", async () => {
    const live = new CursorSdkLiveRun();
    const partial = emptyPartial();
    live.attach(createAssistantMessageEventStream(), partial);

    live.emitToolCall(toolCall("call-open"));
    live.markStreamEnded();
    live.emitToolCall(toolCall("call-deferred"));

    expect(await pullEventTypes(live.stream as AssistantMessageEventStream, 3)).toEqual([
      "toolcall_start",
      "toolcall_delta",
      "toolcall_end",
    ]);
    expect(live.deferredCalls.map((call) => call.id)).toEqual(["call-deferred"]);
    expect(partial.content).toHaveLength(1);
  });

  it("replays deferred calls onto the next attached stream", async () => {
    const live = new CursorSdkLiveRun();
    live.attach(createAssistantMessageEventStream(), emptyPartial());
    live.markStreamEnded();
    live.emitToolCall(toolCall("call-1"));
    live.emitToolCall(toolCall("call-2"));

    const replayStream = createAssistantMessageEventStream();
    const partial = emptyPartial();
    live.attach(replayStream, partial);

    expect(await pullEventTypes(replayStream, 6)).toEqual([
      "toolcall_start",
      "toolcall_delta",
      "toolcall_end",
      "toolcall_start",
      "toolcall_delta",
      "toolcall_end",
    ]);
    expect(live.deferredCalls).toHaveLength(0);
    expect(partial.content).toHaveLength(2);
  });

  it("drops emissions after close instead of deferring them", () => {
    const live = new CursorSdkLiveRun();
    live.close();
    live.emitToolCall(toolCall("call-closed"));
    expect(live.deferredCalls).toHaveLength(0);
  });
});
