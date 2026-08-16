import { describe, expect, it } from "bun:test";
import type { ModelListItem } from "@cursor/sdk";
import { bootstrapCursorModels, mapCursorModels } from "../src/models.js";

const byId = (id: string) => {
  const model = bootstrapCursorModels.find((entry) => entry.id === id);
  if (!model) throw new Error(`missing bootstrap model: ${id}`);
  return model;
};

describe("bootstrap catalog", () => {
  it("includes the current Cursor fallback set so /model is not a single entry", () => {
    expect(bootstrapCursorModels.length).toBe(36);
    expect(byId("composer-2-5").name).toBe("Composer 2.5");
    expect(byId("claude-opus-5").name).toBe("Opus 5");
    expect(byId("gpt-5-5").name).toBe("GPT-5.5");
    expect(byId("grok-4-6").name).toBe("Cursor Grok 4.6");
    expect(byId("grok-4-5").name).toBe("Cursor Grok 4.5");
    expect(byId("gemini-3-7-flash").name).toBe("Gemini 3.7 Flash");
    expect(byId("kimi-k3").name).toBe("Kimi K3");
  });

  it("assigns each model's advertised or observed token window", () => {
    expect(byId("composer-2-5").contextWindow).toBe(200_000);
    expect(byId("claude-opus-5").contextWindow).toBe(1_000_000);
    expect(byId("gpt-5-5").contextWindow).toBe(1_000_000);
    expect(byId("grok-4-6").contextWindow).toBe(256_000);
    expect(byId("claude-haiku-4-5").contextWindow).toBe(200_000);
    expect(new Set(bootstrapCursorModels.map((model) => model.contextWindow)).size).toBeGreaterThan(1);
    expect(byId("composer-2-5").maxTokens).toBe(byId("composer-2-5").contextWindow);
    expect(byId("claude-opus-5").maxTokens).toBe(1_000_000);
  });

  it("exposes catalog effort on models that advertise it", () => {
    const opus = byId("claude-opus-5");
    expect(opus.reasoning).toBe(true);
    expect(opus.thinking && "mode" in opus.thinking ? opus.thinking.mode : undefined).toBe("effort");
    const opusEfforts = opus.thinking && "efforts" in opus.thinking ? opus.thinking.efforts : [];
    expect(JSON.stringify(opusEfforts)).toBe(JSON.stringify(["low", "medium", "high", "xhigh", "max"]));
    const grok = byId("grok-4-6");
    const grokEfforts = grok.thinking && "efforts" in grok.thinking ? grok.thinking.efforts : [];
    expect(JSON.stringify(grokEfforts)).toBe(JSON.stringify(["low", "medium", "high", "xhigh"]));
    const gpt = byId("gpt-5-5");
    const gptEfforts = gpt.thinking && "efforts" in gpt.thinking ? gpt.thinking.efforts : [];
    expect(JSON.stringify(gptEfforts)).toBe(JSON.stringify(["low", "medium", "high", "xhigh"]));
  });

  it("advertises text and image and zero cost", () => {
    const model = byId("composer-2-5");
    expect(model.input).toEqual(["text", "image"]);
    expect(model.cost).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  });
});

describe("mapCursorModels", () => {
  it("maps catalog ids, display names, and token windows without catalog parameters", () => {
    const items: ModelListItem[] = [{ id: "composer-2.5", displayName: "Composer 2.5" }];
    const mapped = mapCursorModels(items);
    expect(mapped).toEqual([
      expect.objectContaining({
        id: "composer-2-5",
        name: "Composer 2.5",
        reasoning: false,
        input: ["text", "image"],
        contextWindow: 200_000,
        maxTokens: 200_000,
      }),
    ]);
  });

  it("uses the largest catalog context label when the live item has one", () => {
    const items: ModelListItem[] = [
      {
        id: "claude-opus-5",
        displayName: "Opus 5",
        parameters: [
          {
            id: "context",
            values: [{ value: "300k" }, { value: "1m" }],
          },
        ],
      },
    ];
    expect(mapCursorModels(items)[0]?.contextWindow).toBe(1_000_000);
  });

  it("sets effort thinking when the catalog exposes effort values", () => {
    const items: ModelListItem[] = [
      {
        id: "claude-opus-4-8",
        displayName: "Opus 4.8",
        parameters: [
          {
            id: "effort",
            values: [{ value: "low" }, { value: "medium" }, { value: "high" }, { value: "xhigh" }],
          },
        ],
      },
    ];
    const [model] = mapCursorModels(items);
    expect(model.reasoning).toBe(true);
    expect(model.thinking && "mode" in model.thinking ? model.thinking.mode : undefined).toBe("effort");
    const efforts = model.thinking && "efforts" in model.thinking ? model.thinking.efforts : [];
    expect(JSON.stringify(efforts)).toBe(JSON.stringify(["low", "medium", "high", "xhigh"]));
  });

  it("returns the bootstrap catalog when the live list is empty", () => {
    expect(mapCursorModels([])).toEqual(bootstrapCursorModels);
  });
});
