import { afterEach, describe, expect, it } from "bun:test";
import { CURSOR_API_KEY_CONFIG_VALUE, resolveCursorApiKey } from "../src/api-key.js";

const original = process.env.CURSOR_API_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = original;
});

describe("resolveCursorApiKey", () => {
  it("passes a real key through", () => {
    expect(resolveCursorApiKey("key-live")).toBe("key-live");
  });

  it("resolves placeholders from CURSOR_API_KEY", () => {
    process.env.CURSOR_API_KEY = "from-env";
    expect(resolveCursorApiKey(CURSOR_API_KEY_CONFIG_VALUE)).toBe("from-env");
    expect(resolveCursorApiKey("$CURSOR_API_KEY")).toBe("from-env");
    expect(resolveCursorApiKey(`$\{CURSOR_API_KEY}`)).toBe("from-env");
    expect(resolveCursorApiKey("CURSOR_API_KEY")).toBe("from-env");
    expect(resolveCursorApiKey(undefined)).toBe("from-env");
  });

  it("returns undefined when the placeholder has no env value", () => {
    delete process.env.CURSOR_API_KEY;
    expect(resolveCursorApiKey(CURSOR_API_KEY_CONFIG_VALUE)).toBeUndefined();
    expect(resolveCursorApiKey(undefined)).toBeUndefined();
    expect(resolveCursorApiKey("   ")).toBeUndefined();
  });
});
