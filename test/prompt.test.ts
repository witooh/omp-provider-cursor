import { describe, expect, it } from "bun:test";
import type { Context, Message } from "@oh-my-pi/pi-ai";
import { buildCursorPrompt } from "../src/prompt.js";

function assistantWithCall(): Message {
  return {
    role: "assistant",
    content: [
      { type: "text", text: "reading it" },
      { type: "toolCall", id: "call-1", name: "read", arguments: { path: "a.txt" } },
    ],
    api: "cursor-sdk",
    provider: "cursor-sdk",
    model: "auto",
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
  } as Message;
}

describe("buildCursorPrompt", () => {
  it("renders system prompt, turns, tool calls and results", () => {
    const context: Context = {
      systemPrompt: ["be brief"],
      messages: [
        { role: "user", content: "first", timestamp: 1 },
        assistantWithCall(),
        {
          role: "toolResult",
          toolCallId: "call-1",
          toolName: "read",
          content: [{ type: "text", text: "file body" }],
          isError: false,
          timestamp: 3,
        } as Message,
      ],
    };

    const prompt = buildCursorPrompt(context);

    expect(prompt).toContain("[System]\nbe brief");
    expect(prompt).toContain("[User]\nfirst");
    expect(prompt).toContain("[Assistant]\nreading it");
    expect(prompt).toContain('[Tool call: read id=call-1]\n{"path":"a.txt"}');
    expect(prompt).toContain("[Tool result: read id=call-1]\nfile body");
    // The transcript ends on results, so the model needs the continuation cue.
    expect(prompt).toContain("already ran on the host");
  });

  it("marks failed results and omits the cue when the user speaks last", () => {
    const context: Context = {
      messages: [
        { role: "user", content: "go", timestamp: 1 },
        {
          role: "toolResult",
          toolCallId: "call-9",
          toolName: "bash",
          content: [{ type: "text", text: "boom" }],
          isError: true,
          timestamp: 2,
        } as Message,
        { role: "user", content: "try again", timestamp: 3 },
      ],
    };

    const prompt = buildCursorPrompt(context);

    expect(prompt).toContain("[Tool result: bash id=call-9 (failed)]\nboom");
    expect(prompt).not.toContain("already ran on the host");
  });

  it("keeps image intent visible even though the CLI takes no attachments", () => {
    const context: Context = {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "what is this" },
            { type: "image", data: "AAAA", mimeType: "image/png" },
          ],
          timestamp: 1,
        } as Message,
      ],
    };

    expect(buildCursorPrompt(context)).toContain("image omitted: image/png");
  });
});
