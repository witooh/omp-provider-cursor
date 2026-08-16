import { describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model } from "@oh-my-pi/pi-ai";

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: {
      create: async () => ({
        close: () => {},
        send: async () => ({
          cancel: mock(async () => {}),
          async *stream() {
            yield {
              type: "status",
              agent_id: "agent-1",
              run_id: "run-1",
              status: "ERROR",
              message: "quota exceeded",
            };
          },
        }),
      }),
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

describe("hunt: SDK status ERROR", () => {
  it("surfaces an error event instead of a silent stop", async () => {
    const context: Context = { messages: [{ role: "user", content: "hi", timestamp: 1 }] };
    const types: string[] = [];
    let errorMessage = "";
    for await (const event of streamCursor(model, context, { apiKey: "k" })) {
      types.push(event.type);
      if (event.type === "error") errorMessage = event.error.errorMessage ?? "";
    }
    expect(types).toContain("error");
    expect(errorMessage).toContain("quota");
  });
});
