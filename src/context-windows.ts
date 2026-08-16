import { CURSOR_CONTEXT_WINDOWS as GENERATED_CONTEXT_WINDOWS } from "./catalog.generated.js";

/**
 * Per-model context windows for Cursor SDK ids.
 *
 * Advertised values are the largest `context` label on the live catalog.
 * Models with no catalog label keep the previous generated window, else 200k.
 *
 * Cursor publishes no separate output cap. `maxTokens` mirrors this window
 * the same way omp-provider-xai does.
 */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

export const CURSOR_CONTEXT_WINDOWS: Record<string, number> = GENERATED_CONTEXT_WINDOWS;

export function lookupCursorContextWindow(catalogId: string): number {
  return CURSOR_CONTEXT_WINDOWS[catalogId] ?? DEFAULT_CONTEXT_WINDOW;
}
