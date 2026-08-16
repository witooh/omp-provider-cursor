import { describe, expect, it, mock } from "bun:test";
import type { Api, Context, Model } from "@oh-my-pi/pi-ai";
import { CURSOR_API_KEY_CONFIG_VALUE } from "../src/api-key.js";

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Agent: { create: async () => ({ send: async () => ({ stream: async function* () {} }), close: () => {} }) },
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

describe("hunt: missing-key message", () => {
  it("does not tell the user to /login", async () => {
    const context: Context = { messages: [{ role: "user", content: "hi", timestamp: 1 }] };
    let errorMessage = "";
    for await (const event of streamCursor(model, context, { apiKey: CURSOR_API_KEY_CONFIG_VALUE })) {
      if (event.type === "error") errorMessage = event.error.errorMessage ?? "";
    }
    expect(errorMessage.includes("/login")).toBe(false);
  });
});
