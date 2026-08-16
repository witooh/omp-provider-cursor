import type { ModelListItem } from "@cursor/sdk";
import type { ProviderModelConfig } from "@oh-my-pi/pi-coding-agent";

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
const selectionIdByOmpId: Record<string, string> = {
  "composer-2-5": "composer-2.5",
};

export const bootstrapCursorModels: ProviderModelConfig[] = [
  {
    id: "composer-2-5",
    name: "Composer 2.5",
    reasoning: false,
    input: [...TEXT_AND_IMAGE],
    cost: ZERO_COST,
    contextWindow: FALLBACK_CONTEXT_WINDOW,
    maxTokens: FALLBACK_MAX_TOKENS,
  },
];

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
