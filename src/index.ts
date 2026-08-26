import type { ExtensionAPI, ProviderConfig, ProviderModelConfig } from "@oh-my-pi/pi-coding-agent";
import { CURSOR_API_KEY_CONFIG_VALUE } from "./api-key.js";
import { bootstrapCursorModels, CURSOR_CLI_BASE_URL, fetchCursorModels } from "./models.js";
import { streamCursor } from "./stream.js";

export { resolveCursorApiKey } from "./api-key.js";
export { bootstrapCursorModels, fetchCursorModels, parseAgentModels, toProviderModels } from "./models.js";
export { streamCursor } from "./stream.js";

function cursorCliProvider(models: ProviderModelConfig[]): ProviderConfig {
  return {
    baseUrl: CURSOR_CLI_BASE_URL,
    api: "cursor-sdk",
    apiKey: CURSOR_API_KEY_CONFIG_VALUE,
    models,
    streamSimple: streamCursor,
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerProvider("cursor-sdk", cursorCliProvider(bootstrapCursorModels));
  pi.registerCommand("update-catalog", {
    description: "Refresh the Cursor model catalog from `cursor-agent models`",
    handler: async (_args, ctx) => {
      const models = await fetchCursorModels();
      ctx.modelRegistry.registerProvider("cursor-sdk", cursorCliProvider(models));
      if (!ctx.hasUI) return;
      ctx.ui.notify(`Cursor CLI catalog updated with ${models.length} models.`, "info");
    },
  });
}
