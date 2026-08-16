import { describe, expect, it } from "bun:test";
import { cursorSelectionId, mapCursorModels } from "../src/models.js";

describe("hunt: model id round-trip", () => {
  it("does not invent dots in hyphenated catalog ids", () => {
    const [model] = mapCursorModels([{ id: "k3-256k", displayName: "K3 256k" }]);
    expect(cursorSelectionId(model.id)).toBe("k3-256k");
  });
});
