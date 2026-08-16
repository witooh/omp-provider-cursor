import { afterEach, describe, expect, it, mock } from "bun:test";

const originalKey = process.env.CURSOR_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = originalKey;
});

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Cursor: {
      models: {
        list: async () => [
          { id: "composer-2.5", displayName: "Composer 2.5" },
          { id: "claude-opus-5", displayName: "Opus 5" },
        ],
      },
    },
  }),
}));
// bun:test mock.module must load the subject after the mock is registered.

const { bootstrapCursorModels, fetchCursorModels } = await import("../src/models.js");

describe("hunt: fetch live catalog", () => {
  it("returns the bootstrap catalog when no API key is resolved", async () => {
    delete process.env.CURSOR_API_KEY;
    expect(await fetchCursorModels(undefined)).toBe(bootstrapCursorModels);
  });

  it("maps the live Cursor list when a key is present", async () => {
    const models = await fetchCursorModels("key-live");
    expect(models.map((model) => model.id)).toEqual(["composer-2-5", "claude-opus-5"]);
  });
});
