/**
 * Per-model context windows for Cursor SDK ids.
 *
 * Advertised values are the largest `context` label on the public catalog
 * (`fitchmultz/pi-cursor-sdk` `cursor-fallback-models.generated.ts`,
 * @cursor/sdk@1.0.23). Models with no catalog label use observed SDK
 * checkpoint limits from `bundled-context-windows.ts` (2026-08-02).
 *
 * Cursor publishes no separate output cap. `maxTokens` mirrors this window
 * the same way omp-provider-xai does.
 */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

export const CURSOR_CONTEXT_WINDOWS: Record<string, number> = {
  default: 200_000,
  "claude-fable-5": 1_000_000,
  "claude-haiku-4-5": 200_000,
  "claude-opus-4-5": 200_000,
  "claude-opus-4-6": 1_000_000,
  "claude-opus-4-7": 1_000_000,
  "claude-opus-4-8": 1_000_000,
  "claude-opus-5": 1_000_000,
  "claude-sonnet-4": 200_000,
  "claude-sonnet-4-5": 200_000,
  "claude-sonnet-4-6": 1_000_000,
  "claude-sonnet-5": 1_000_000,
  "composer-2": 200_000,
  "composer-2.5": 200_000,
  "gemini-2.5-flash": 200_000,
  "gemini-3-flash": 200_000,
  "gemini-3.1-pro": 200_000,
  "gemini-3.5-flash": 200_000,
  "gemini-3.6-flash": 200_000,
  "glm-5.2": 200_000,
  "gpt-5-mini": 272_000,
  "gpt-5.1": 272_000,
  "gpt-5.2": 272_000,
  "gpt-5.3-codex": 272_000,
  "gpt-5.4": 1_000_000,
  "gpt-5.4-mini": 272_000,
  "gpt-5.4-nano": 272_000,
  "gpt-5.5": 1_000_000,
  "gpt-5.6-luna": 1_000_000,
  "gpt-5.6-sol": 1_000_000,
  "gpt-5.6-terra": 1_000_000,
  "grok-4.5": 256_000,
  "kimi-k2.7-code": 200_000,
  "kimi-k3": 200_000,
};

export function lookupCursorContextWindow(catalogId: string): number {
  return CURSOR_CONTEXT_WINDOWS[catalogId] ?? DEFAULT_CONTEXT_WINDOW;
}
