import { describe, expect, it, mock } from "bun:test";
import type { ExtensionAPI, ProviderConfig } from "@oh-my-pi/pi-coding-agent";

mock.module("../src/sdk.js", () => ({
  loadCursorSdk: async () => ({
    Cursor: {
      models: {
        list: async () => [{ id: "composer-2.5", displayName: "Composer 2.5" }],
      },
    },
  }),
}));

// bun:test mock.module must load the subject after the mock is registered.
const registerExtension = (await import("../src/index.js")).default;

describe("hunt: refresh command", () => {
  it("re-registers cursor-sdk with the live list", async () => {
    const registerProvider = mock((_name: string, _config: ProviderConfig) => {});
    const registerCommand = mock((_name: string, spec: { handler: (args: string, ctx: unknown) => Promise<void> }) => {
      void spec;
    });
    const pi = { registerProvider, registerCommand, on: mock(() => {}) } as unknown as ExtensionAPI;
    registerExtension(pi);

    const command = registerCommand.mock.calls[0]?.[1] as
      | { handler: (args: string, ctx: unknown) => Promise<void> }
      | undefined;
    expect(command).toBeDefined();
    await command?.handler("", {
      modelRegistry: { getApiKeyForProvider: async () => "key-live" },
      hasUI: true,
      ui: { notify: mock(() => {}) },
    });
    expect(registerProvider.mock.calls.length).toBe(2);
    const second = registerProvider.mock.calls[1]?.[1] as ProviderConfig | undefined;
    expect(second?.models?.map((model) => model.id)).toEqual(["composer-2-5"]);
  });
});
