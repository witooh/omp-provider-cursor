import { describe, expect, it } from "bun:test";
import {
  bootstrapCursorModels,
  contextWindowFor,
  inferReasoning,
  parseAgentModels,
  toProviderModels,
} from "../src/models.js";

const SAMPLE = `Available models

auto - Auto (current, default)
claude-opus-5-thinking-high - Claude Opus 5 1M Thinking
gpt-5.4-mini-medium - GPT-5.4 Mini
composer-2.5 - Composer 2.5
auto - Auto

Tip: use --model <id> (or /model <id> in interactive mode) to switch.
`;

describe("parseAgentModels", () => {
  it("reads id and name pairs, drops prose and duplicates", () => {
    const models = parseAgentModels(SAMPLE);

    expect(models.map((model) => model.id)).toEqual([
      "auto",
      "claude-opus-5-thinking-high",
      "gpt-5.4-mini-medium",
      "composer-2.5",
    ]);
    expect(models[0].name).toBe("Auto");
  });
});

describe("inferReasoning", () => {
  it("flags ids that carry a reasoning level", () => {
    expect(inferReasoning("claude-opus-5-thinking-high")).toBe(true);
    expect(inferReasoning("gpt-5.3-codex-xhigh-fast")).toBe(true);
    expect(inferReasoning("gpt-5.4-mini-none")).toBe(true);
    expect(inferReasoning("composer-2.5")).toBe(false);
    expect(inferReasoning("auto")).toBe(false);
  });
});

describe("contextWindowFor", () => {
  it("matches the longest known family prefix", () => {
    // claude-opus-5 is a 1M-context family in the generated table.
    expect(contextWindowFor("claude-opus-5-thinking-high")).toBe(1_000_000);
  });

  it("falls back for ids with no known family", () => {
    expect(contextWindowFor("brand-new-model")).toBe(200_000);
  });
});

describe("toProviderModels", () => {
  it("registers text-only models with zero cost", () => {
    const [model] = toProviderModels([{ id: "composer-2.5", name: "Composer 2.5" }]);

    expect(model.input).toEqual(["text"]);
    expect(model.cost.input).toBe(0);
    expect(model.maxTokens).toBe(model.contextWindow);
  });
});

describe("bootstrapCursorModels", () => {
  it("ships the baked CLI catalog", () => {
    expect(bootstrapCursorModels.length).toBeGreaterThan(50);
    expect(bootstrapCursorModels.some((model) => model.id === "auto")).toBe(true);
  });
});
