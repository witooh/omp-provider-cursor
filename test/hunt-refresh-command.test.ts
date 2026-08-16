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
  it("registers the live list on the session model registry", async () => {
    const registerProvider = mock((_name: string, _config: ProviderConfig) => {});
    const registerCommand = mock((_name: string, spec: { handler: (args: string, ctx: unknown) => Promise<void> }) => {
      void spec;
    });
    const pi = { registerProvider, registerCommand, on: mock(() => {}) } as unknown as ExtensionAPI;
    registerExtension(pi);

    const command = registerCommand.mock.calls[0]?.[1] as
      | { handler: (args: string, ctx: unknown) => Promise<void> }
      | undefined;
    expect(registerCommand.mock.calls[0]?.[0]).toBe("update-catalog");
    expect(command).toBeDefined();
    const registerLive = mock((_name: string, _config: ProviderConfig) => {});
    await command?.handler("", {
      modelRegistry: { getApiKeyForProvider: async () => "key-live", registerProvider: registerLive },
      hasUI: true,
      ui: { notify: mock(() => {}) },
    });
    expect(registerProvider.mock.calls.length).toBe(1);
    expect(registerLive).toHaveBeenCalledTimes(1);
    const live = registerLive.mock.calls[0]?.[1] as ProviderConfig | undefined;
    expect(live?.models?.map((model) => model.id)).toEqual(["composer-2-5"]);
  });
});
