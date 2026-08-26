import type { ProviderModelConfig } from "@oh-my-pi/pi-coding-agent";
import { CURSOR_CONTEXT_WINDOWS, type CursorCliModelItem, FALLBACK_CLI_MODELS } from "./catalog.generated.js";
import { resolveAgentBinary } from "./cli.js";
import { DEFAULT_CONTEXT_WINDOW } from "./context-windows.js";

export const CURSOR_CLI_BASE_URL = "https://cursor.com";
export { DEFAULT_CONTEXT_WINDOW as FALLBACK_CONTEXT_WINDOW } from "./context-windows.js";

const ZERO_COST = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
/** `cursor-agent --print` takes no attachments, so images never reach the model. */
const TEXT_ONLY = ["text"] as const;
const MODELS_TIMEOUT_MS = 20_000;

/** CLI ids carry their reasoning level, e.g. `-thinking`, `-high`, `-xhigh`. */
const REASONING_SUFFIX = /(?:thinking|none|minimal|low|medium|high|xhigh|max)(?:-fast)?$/;

export function inferReasoning(id: string): boolean {
  return REASONING_SUFFIX.test(id);
}

/**
 * Context windows are published per SDK-style family id, while CLI ids append
 * their reasoning level. Match the longest family prefix, else fall back.
 */
export function contextWindowFor(id: string): number {
  let best = 0;
  let window = DEFAULT_CONTEXT_WINDOW;
  for (const [family, size] of Object.entries(CURSOR_CONTEXT_WINDOWS)) {
    if (!id.startsWith(family) || family.length <= best) continue;
    best = family.length;
    window = size;
  }
  return window;
}

export function parseAgentModels(output: string): CursorCliModelItem[] {
  const models: CursorCliModelItem[] = [];
  const seen = new Set<string>();
  for (const raw of output.split("\n")) {
    const line = raw.trim();
    const match = /^([A-Za-z0-9._@/:-]+) - (.+)$/.exec(line);
    if (!match) continue;
    const id = match[1];
    if (id.endsWith(":")) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, name: match[2].replace(/\s*\(current, default\)$/, "").trim() });
  }
  return models;
}

export function toProviderModels(items: readonly CursorCliModelItem[]): ProviderModelConfig[] {
  return items.map((item) => {
    const contextWindow = contextWindowFor(item.id);
    return {
      id: item.id,
      name: item.name || item.id,
      reasoning: inferReasoning(item.id),
      input: [...TEXT_ONLY],
      cost: { ...ZERO_COST },
      contextWindow,
      maxTokens: contextWindow,
    } satisfies ProviderModelConfig;
  });
}

export const bootstrapCursorModels: ProviderModelConfig[] = toProviderModels(FALLBACK_CLI_MODELS);

/** Live catalog for the signed-in account; falls back to the baked list. */
export async function fetchCursorModels(): Promise<ProviderModelConfig[]> {
  const { spawn } = await import("node:child_process");
  const { promise, resolve } = Promise.withResolvers<ProviderModelConfig[]>();
  const child = spawn(resolveAgentBinary(), ["models"], { stdio: ["ignore", "pipe", "pipe"] });
  const chunks: string[] = [];
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    resolve(bootstrapCursorModels);
  }, MODELS_TIMEOUT_MS);

  child.stdout?.on("data", (chunk: Buffer) => {
    chunks.push(chunk.toString("utf8"));
  });
  child.on("error", () => {
    clearTimeout(timer);
    resolve(bootstrapCursorModels);
  });
  child.on("close", () => {
    clearTimeout(timer);
    const parsed = parseAgentModels(chunks.join(""));
    resolve(parsed.length > 0 ? toProviderModels(parsed) : bootstrapCursorModels);
  });

  return promise;
}
