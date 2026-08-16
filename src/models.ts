import type { ModelListItem } from "@cursor/sdk";
import type { ProviderModelConfig } from "@oh-my-pi/pi-coding-agent";
import { resolveCursorApiKey } from "./api-key.js";
import { loadCursorSdk } from "./sdk.js";

export const CURSOR_SDK_BASE_URL = "https://cursor.com";
export const FALLBACK_CONTEXT_WINDOW = 128_000;
export const FALLBACK_MAX_TOKENS = 16_384;

const ZERO_COST = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
const TEXT_AND_IMAGE = ["text", "image"] as const;

type Thinking = NonNullable<ProviderModelConfig["thinking"]>;

const EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;
const KNOWN_EFFORT: Record<string, true> = {
  minimal: true,
  low: true,
  medium: true,
  high: true,
  xhigh: true,
  max: true,
};
const selectionIdByOmpId: Record<string, string> = {};

// Compact snapshot of the 34 public Cursor catalog ids from
// fitchmultz/pi-cursor-sdk `cursor-fallback-models.generated.ts`
// (generated with @cursor/sdk@1.0.23). Live list still comes from Cursor.models.list.
const FALLBACK_CATALOG_ITEMS: readonly ModelListItem[] = [
  { id: "claude-fable-5", displayName: "Fable 5" },
  { id: "claude-haiku-4-5", displayName: "Haiku 4.5" },
  { id: "claude-opus-4-5", displayName: "Opus 4.5" },
  { id: "claude-opus-4-6", displayName: "Opus 4.6" },
  { id: "claude-opus-4-7", displayName: "Opus 4.7" },
  { id: "claude-opus-4-8", displayName: "Opus 4.8" },
  { id: "claude-opus-5", displayName: "Opus 5" },
  { id: "claude-sonnet-4", displayName: "Sonnet 4" },
  { id: "claude-sonnet-4-5", displayName: "Sonnet 4.5" },
  { id: "claude-sonnet-4-6", displayName: "Sonnet 4.6" },
  { id: "claude-sonnet-5", displayName: "Sonnet 5" },
  { id: "composer-2", displayName: "Composer 2" },
  { id: "composer-2.5", displayName: "Composer 2.5" },
  { id: "default", displayName: "Auto" },
  { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  { id: "gemini-3-flash", displayName: "Gemini 3 Flash" },
  { id: "gemini-3.1-pro", displayName: "Gemini 3.1 Pro" },
  { id: "gemini-3.5-flash", displayName: "Gemini 3.5 Flash" },
  { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash" },
  { id: "glm-5.2", displayName: "GLM 5.2" },
  { id: "gpt-5-mini", displayName: "GPT-5 Mini" },
  { id: "gpt-5.1", displayName: "GPT-5.1" },
  { id: "gpt-5.2", displayName: "GPT-5.2" },
  { id: "gpt-5.3-codex", displayName: "Codex 5.3" },
  { id: "gpt-5.4", displayName: "GPT-5.4" },
  { id: "gpt-5.4-mini", displayName: "GPT-5.4 Mini" },
  { id: "gpt-5.4-nano", displayName: "GPT-5.4 Nano" },
  { id: "gpt-5.5", displayName: "GPT-5.5" },
  { id: "gpt-5.6-luna", displayName: "GPT-5.6 Luna" },
  { id: "gpt-5.6-sol", displayName: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", displayName: "GPT-5.6 Terra" },
  { id: "grok-4.5", displayName: "Cursor Grok 4.5" },
  { id: "kimi-k2.7-code", displayName: "Kimi K2.7 Code" },
  { id: "kimi-k3", displayName: "Kimi K3" },
];

function toProviderModels(items: readonly ModelListItem[]): ProviderModelConfig[] {
  return items.map((item) => {
    const thinking = thinkingFromItem(item);
    const ompId = item.id.replace(/(\d)\.(\d)/g, "$1-$2");
    selectionIdByOmpId[ompId] = item.id;
    return {
      id: ompId,
      name: item.displayName || item.id,
      reasoning: thinking !== undefined,
      ...(thinking ? { thinking } : {}),
      input: [...TEXT_AND_IMAGE],
      cost: { ...ZERO_COST },
      contextWindow: contextWindowFromItem(item),
      maxTokens: FALLBACK_MAX_TOKENS,
    };
  });
}

export const bootstrapCursorModels: ProviderModelConfig[] = toProviderModels(FALLBACK_CATALOG_ITEMS);

export function cursorSelectionId(ompId: string): string {
  return selectionIdByOmpId[ompId] ?? ompId;
}

function getParameter(item: ModelListItem, id: string) {
  return item.parameters?.find((parameter) => parameter.id === id);
}

function parseContextWindow(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)([km])$/i.exec(value.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!Number.isFinite(amount)) return undefined;
  return Math.round(amount * (unit === "m" ? 1_000_000 : 1_000));
}

function contextWindowFromItem(item: ModelListItem): number {
  const values = getParameter(item, "context")?.values ?? [];
  let largest = 0;
  for (const entry of values) {
    const parsed = parseContextWindow(entry.value);
    if (parsed !== undefined && parsed > largest) largest = parsed;
  }
  return largest > 0 ? largest : FALLBACK_CONTEXT_WINDOW;
}

function thinkingFromItem(item: ModelListItem): Thinking | undefined {
  const effort = getParameter(item, "effort") ?? getParameter(item, "reasoning");
  if (!effort) return undefined;
  const values = effort.values.map((entry) => entry.value.toLowerCase()).filter((value) => KNOWN_EFFORT[value]);
  const ordered = EFFORT_ORDER.filter((level) => values.includes(level));
  if (ordered.length === 0) return undefined;
  return {
    mode: "effort",
    efforts: ordered as unknown as Thinking["efforts"],
  };
}

export function mapCursorModels(items: readonly ModelListItem[]): ProviderModelConfig[] {
  if (items.length === 0) return bootstrapCursorModels;
  return toProviderModels(items);
}

export async function fetchCursorModels(apiKey: string | undefined): Promise<ProviderModelConfig[]> {
  const key = resolveCursorApiKey(apiKey);
  if (!key) return bootstrapCursorModels;
  try {
    const sdk = await loadCursorSdk();
    return mapCursorModels(await sdk.Cursor.models.list({ apiKey: key }));
  } catch {
    return bootstrapCursorModels;
  }
}
