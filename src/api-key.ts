export const CURSOR_API_KEY_ENV_VAR = "CURSOR_API_KEY";

/** Sentinel so registerProvider stays visible before a real key exists. */
export const CURSOR_API_KEY_CONFIG_VALUE = "omp-provider-cursor-api-key-placeholder";

const PLACEHOLDERS: Record<string, true> = {
  [CURSOR_API_KEY_ENV_VAR]: true,
  [`$${CURSOR_API_KEY_ENV_VAR}`]: true,
  [`\${${CURSOR_API_KEY_ENV_VAR}}`]: true,
  [CURSOR_API_KEY_CONFIG_VALUE]: true,
};

export function resolveCursorApiKey(apiKey?: string): string | undefined {
  const trimmed = apiKey?.trim();
  if (!trimmed) return undefined;
  if (PLACEHOLDERS[trimmed]) return process.env.CURSOR_API_KEY?.trim() || undefined;
  return trimmed;
}
