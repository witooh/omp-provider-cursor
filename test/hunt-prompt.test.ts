import { describe, expect, it } from "bun:test";
import type { Context } from "@oh-my-pi/pi-ai";
import { buildCursorPrompt } from "../src/prompt.js";

describe("hunt: buildCursorPrompt", () => {
  it("keeps earlier turns and the latest user text", () => {
    const context: Context = {
      systemPrompt: ["be brief"],
      messages: [
        { role: "user", content: "first", timestamp: 1 },
        {
          role: "assistant",
          content: [{ type: "text", text: "ok" }],
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
          stopReason: "stop",
          timestamp: 2,
        },
        { role: "user", content: "second", timestamp: 3 },
      ],
    };
    const prompt = buildCursorPrompt(context);
    expect(prompt.text).toContain("be brief");
    expect(prompt.text).toContain("first");
    expect(prompt.text).toContain("second");
  });
});
