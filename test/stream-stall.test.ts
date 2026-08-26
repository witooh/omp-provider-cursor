import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model } from "@oh-my-pi/pi-ai";

let hangSend = false;

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async () => ({
        close: () => {},
        send: async () => {
          if (hangSend) await new Promise<never>(() => {});
          return {
            cancel: async () => {},
            async *stream() {
              // The run goes silent forever right after the handshake.
              await new Promise<never>(() => {});
            },
          };
        },
      }),
    },
  }),
}));

// bun:test mock.module must load the subject after the mock is registered.
const { setStallTimeoutMs, streamCursor } = await import("../src/stream.js");

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

afterEach(() => {
  hangSend = false;
  setStallTimeoutMs(120_000);
});

// Real platform timers are the behavior under test: the watchdog runs on
// setInterval and is shrunk via the exported seam; fake timers cannot drive it.
describe("provider stall watchdog", () => {
  it("fails the segment with an error when the SDK goes silent", async () => {
    setStallTimeoutMs(40);
    const context: Context = { messages: [{ role: "user", content: "hi", timestamp: 1 }] };
    const events = [];
    for await (const event of streamCursor(model, context, { apiKey: "key-live" })) {
      events.push(event);
    }
    const lastEvent = events.at(-1);
    if (!lastEvent) throw new Error("stream produced no events");
    expect(lastEvent.type).toBe("error");
    const message = (lastEvent as { error?: { errorMessage?: string } }).error?.errorMessage ?? "";
    expect(message).toMatch(/stall/i);
  });

  it("fails the segment when the send handshake never resolves", async () => {
    hangSend = true;
    setStallTimeoutMs(40);
    const context: Context = { messages: [{ role: "user", content: "hi", timestamp: 1 }] };
    const events = [];
    for await (const event of streamCursor(model, context, { apiKey: "key-live" })) {
      events.push(event);
    }
    const lastEvent = events.at(-1);
    if (!lastEvent) throw new Error("stream produced no events");
    expect(lastEvent.type).toBe("error");
    const message = (lastEvent as { error?: { errorMessage?: string } }).error?.errorMessage ?? "";
    expect(message).toMatch(/stall/i);
  });
});
