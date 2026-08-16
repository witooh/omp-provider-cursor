import type { ExtensionAPI, ProviderConfig, ProviderModelConfig } from "@oh-my-pi/pi-coding-agent";
import { CURSOR_API_KEY_CONFIG_VALUE, resolveCursorApiKey } from "./api-key.js";
import { CURSOR_SDK_BASE_URL, fetchCursorModels, mapCursorModels } from "./models.js";
import { loadCursorSdk } from "./sdk.js";
import { streamCursor } from "./stream.js";

export { resolveCursorApiKey } from "./api-key.js";
export { bootstrapCursorModels, fetchCursorModels, mapCursorModels } from "./models.js";
export { streamCursor } from "./stream.js";

function cursorSdkProvider(models?: ProviderModelConfig[]): ProviderConfig {
  return {
    baseUrl: CURSOR_SDK_BASE_URL,
    api: "cursor-sdk",
    apiKey: CURSOR_API_KEY_CONFIG_VALUE,
    streamSimple: streamCursor,
    ...(models && models.length > 0 ? { models } : { fetchDynamicModels: fetchCursorModels }),
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerProvider("cursor-sdk", cursorSdkProvider());
  pi.registerCommand("cursor-sdk-refresh-models", {
    description: "Refresh the live Cursor model catalog",
    handler: async (_args, ctx) => {
      const raw = await ctx.modelRegistry.getApiKeyForProvider("cursor-sdk");
      const apiKey = resolveCursorApiKey(raw);
      if (!apiKey) {
        ctx.ui.notify("Cursor SDK: set CURSOR_API_KEY or pass --api-key", "warning");
        return;
      }
      try {
        const sdk = await loadCursorSdk();
        const listed = await sdk.Cursor.models.list({ apiKey });
        const models = mapCursorModels(listed);
        pi.registerProvider("cursor-sdk", cursorSdkProvider(models));
        if (!ctx.hasUI) return;
        ctx.ui.notify(`Cursor SDK catalog refreshed with ${models.length} models.`, "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Cursor SDK catalog refresh failed: ${message}`, "error");
      }
    },
  });
}
