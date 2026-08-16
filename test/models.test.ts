import { describe, expect, it } from "bun:test";
import type { ModelListItem } from "@cursor/sdk";
import { bootstrapCursorModels, mapCursorModels } from "../src/models.js";

const byId = (id: string) => {
  const model = bootstrapCursorModels.find((entry) => entry.id === id);
  if (!model) throw new Error(`missing bootstrap model: ${id}`);
  return model;
};

describe("bootstrap catalog", () => {
  it("includes composer-2-5 so /login can see the provider", () => {
    expect(byId("composer-2-5").name).toBe("Composer 2.5");
  });

  it("advertises text and image, zero cost, and a conservative window", () => {
    const model = byId("composer-2-5");
    expect(model.input).toEqual(["text", "image"]);
    expect(model.cost).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    expect(model.contextWindow).toBe(128_000);
    expect(model.maxTokens).toBe(16_384);
  });
});

describe("mapCursorModels", () => {
  it("maps catalog ids and display names", () => {
    const items: ModelListItem[] = [{ id: "composer-2.5", displayName: "Composer 2.5" }];
    const mapped = mapCursorModels(items);
    expect(mapped).toEqual([
      expect.objectContaining({
        id: "composer-2-5",
        name: "Composer 2.5",
        reasoning: false,
        input: ["text", "image"],
        contextWindow: 128_000,
        maxTokens: 16_384,
      }),
    ]);
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
