import { describe, expect, it, mock } from "bun:test";
import type { ExtensionAPI, ProviderConfig } from "@oh-my-pi/pi-coding-agent";
import { CURSOR_API_KEY_CONFIG_VALUE } from "../src/api-key.js";
import registerExtension from "../src/index.js";
import { bootstrapCursorModels } from "../src/models.js";

const register = () => {
  const registerProvider = mock((_name: string, _config: ProviderConfig) => {});
  const registerCommand = mock(() => {});
  const pi = {
    registerProvider,
    registerCommand,
    on: mock(() => {}),
  } as unknown as ExtensionAPI;

  registerExtension(pi);

  const [name, config] = registerProvider.mock.calls[0];
  return { registerProvider, registerCommand, name, config };
};

describe("extension registration", () => {
  it("registers cursor-sdk with the baked catalog and no startup fetch", () => {
    const { registerProvider, name, config } = register();
    expect(registerProvider).toHaveBeenCalledTimes(1);
    expect(name).toBe("cursor-sdk");
    expect(config.api).toBe("cursor-sdk");
    expect(config.baseUrl).toBe("https://cursor.com");
    expect(config.apiKey).toBe(CURSOR_API_KEY_CONFIG_VALUE);
    expect(config.models).toBe(bootstrapCursorModels);
    expect(config.fetchDynamicModels).toBeUndefined();
    expect(typeof config.streamSimple).toBe("function");
    expect(config.oauth).toBeUndefined();
  });

  it("registers a refresh-models command", () => {
    const { registerCommand } = register();
    expect(registerCommand).toHaveBeenCalledWith(
      "cursor-sdk-refresh-models",
      expect.objectContaining({ description: expect.stringContaining("Cursor") }),
    );
  });
});
