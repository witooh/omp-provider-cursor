// src/api-key.ts
var CURSOR_API_KEY_ENV_VAR = "CURSOR_API_KEY";
var CURSOR_API_KEY_CONFIG_VALUE = "omp-provider-cursor-api-key-placeholder";
var PLACEHOLDERS = {
  [CURSOR_API_KEY_ENV_VAR]: true,
  [`$${CURSOR_API_KEY_ENV_VAR}`]: true,
  [`\${${CURSOR_API_KEY_ENV_VAR}}`]: true,
  [CURSOR_API_KEY_CONFIG_VALUE]: true
};
function resolveCursorApiKey(apiKey) {
  const trimmed = apiKey?.trim();
  if (!trimmed || PLACEHOLDERS[trimmed]) return process.env.CURSOR_API_KEY?.trim() || void 0;
  return trimmed;
}

// src/catalog.generated.ts
var FALLBACK_CLI_MODELS = [
  { id: "auto", name: "Auto" },
  { id: "gpt-5.3-codex-low", name: "Codex 5.3 Low" },
  { id: "gpt-5.3-codex-low-fast", name: "Codex 5.3 Low Fast" },
  { id: "gpt-5.3-codex", name: "Codex 5.3" },
  { id: "gpt-5.3-codex-fast", name: "Codex 5.3 Fast" },
  { id: "gpt-5.3-codex-high", name: "Codex 5.3 High" },
  { id: "gpt-5.3-codex-high-fast", name: "Codex 5.3 High Fast" },
  { id: "gpt-5.3-codex-xhigh", name: "Codex 5.3 Extra High" },
  { id: "gpt-5.3-codex-xhigh-fast", name: "Codex 5.3 Extra High Fast" },
  { id: "gpt-5.2", name: "GPT-5.2" },
  { id: "cursor-grok-4.6-high-fast", name: "Cursor Grok 4.6 Fast" },
  { id: "composer-2.5", name: "Composer 2.5" },
  { id: "claude-opus-5-thinking-high", name: "Claude Opus 5 1M Thinking" },
  { id: "claude-opus-5-thinking-high-fast", name: "Claude Opus 5 1M Thinking Fast" },
  { id: "gpt-5.6-sol-high", name: "GPT-5.6 Sol 1M High" },
  { id: "gpt-5.6-sol-high-fast", name: "GPT-5.6 Sol High Fast" },
  { id: "gpt-5.6-sol-xhigh", name: "GPT-5.6 Sol 1M Extra High" },
  { id: "gpt-5.6-sol-xhigh-fast", name: "GPT-5.6 Sol Extra High Fast" },
  { id: "claude-fable-5-thinking-high", name: "Claude Fable 5 1M Thinking (NO ZDR)" },
  { id: "claude-fable-5-thinking-xhigh", name: "Claude Fable 5 1M Extra High Thinking (NO ZDR)" },
  { id: "cursor-grok-4.5-high", name: "Cursor Grok 4.5" },
  { id: "cursor-grok-4.5-high-fast", name: "Cursor Grok 4.5 Fast" },
  { id: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash" },
  { id: "claude-sonnet-5-thinking-high", name: "Claude Sonnet 5 1M Thinking" },
  { id: "claude-sonnet-5-thinking-xhigh", name: "Claude Sonnet 5 1M Extra High Thinking" },
  { id: "gpt-5.6-luna-high", name: "GPT-5.6 Luna 1M High" },
  { id: "cursor-grok-4.6-low", name: "Cursor Grok 4.6 Low" },
  { id: "cursor-grok-4.6-low-fast", name: "Cursor Grok 4.6 Low Fast" },
  { id: "cursor-grok-4.6-medium", name: "Cursor Grok 4.6 Medium" },
  { id: "cursor-grok-4.6-medium-fast", name: "Cursor Grok 4.6 Medium Fast" },
  { id: "cursor-grok-4.6-high", name: "Cursor Grok 4.6" },
  { id: "cursor-grok-4.6-xhigh", name: "Cursor Grok 4.6 Extra High" },
  { id: "cursor-grok-4.6-xhigh-fast", name: "Cursor Grok 4.6 Extra High Fast" },
  { id: "composer-2.5-fast", name: "Composer 2.5 Fast" },
  { id: "claude-opus-5-low", name: "Claude Opus 5 1M Low" },
  { id: "claude-opus-5-low-fast", name: "Claude Opus 5 1M Low Fast" },
  { id: "claude-opus-5-medium", name: "Claude Opus 5 1M Medium" },
  { id: "claude-opus-5-medium-fast", name: "Claude Opus 5 1M Medium Fast" },
  { id: "claude-opus-5-high", name: "Claude Opus 5 1M" },
  { id: "claude-opus-5-high-fast", name: "Claude Opus 5 1M Fast" },
  { id: "claude-opus-5-thinking-low", name: "Claude Opus 5 1M Low Thinking" },
  { id: "claude-opus-5-thinking-low-fast", name: "Claude Opus 5 1M Low Thinking Fast" },
  { id: "claude-opus-5-thinking-medium", name: "Claude Opus 5 1M Medium Thinking" },
  { id: "claude-opus-5-thinking-medium-fast", name: "Claude Opus 5 1M Medium Thinking Fast" },
  { id: "claude-opus-5-thinking-xhigh", name: "Claude Opus 5 1M Extra High Thinking" },
  { id: "claude-opus-5-thinking-xhigh-fast", name: "Claude Opus 5 1M Extra High Thinking Fast" },
  { id: "claude-opus-5-thinking-max", name: "Claude Opus 5 1M Max Thinking" },
  { id: "claude-opus-5-thinking-max-fast", name: "Claude Opus 5 1M Max Thinking Fast" },
  { id: "claude-opus-4-8-low", name: "Claude Opus 4.8 1M Low" },
  { id: "claude-opus-4-8-low-fast", name: "Claude Opus 4.8 1M Low Fast" },
  { id: "claude-opus-4-8-medium", name: "Claude Opus 4.8 1M Medium" },
  { id: "claude-opus-4-8-medium-fast", name: "Claude Opus 4.8 1M Medium Fast" },
  { id: "claude-opus-4-8-high", name: "Claude Opus 4.8 1M" },
  { id: "claude-opus-4-8-high-fast", name: "Claude Opus 4.8 1M Fast" },
  { id: "claude-opus-4-8-xhigh", name: "Claude Opus 4.8 1M Extra High" },
  { id: "claude-opus-4-8-xhigh-fast", name: "Claude Opus 4.8 1M Extra High Fast" },
  { id: "claude-opus-4-8-max", name: "Claude Opus 4.8 1M Max" },
  { id: "claude-opus-4-8-max-fast", name: "Claude Opus 4.8 1M Max Fast" },
  { id: "claude-opus-4-8-thinking-low", name: "Claude Opus 4.8 1M Low Thinking" },
  { id: "claude-opus-4-8-thinking-low-fast", name: "Claude Opus 4.8 1M Low Thinking Fast" },
  { id: "claude-opus-4-8-thinking-medium", name: "Claude Opus 4.8 1M Medium Thinking" },
  { id: "claude-opus-4-8-thinking-medium-fast", name: "Claude Opus 4.8 1M Medium Thinking Fast" },
  { id: "claude-opus-4-8-thinking-high", name: "Claude Opus 4.8 1M Thinking" },
  { id: "claude-opus-4-8-thinking-high-fast", name: "Claude Opus 4.8 1M Thinking Fast" },
  { id: "claude-opus-4-8-thinking-xhigh", name: "Claude Opus 4.8 1M Extra High Thinking" },
  { id: "claude-opus-4-8-thinking-xhigh-fast", name: "Claude Opus 4.8 1M Extra High Thinking Fast" },
  { id: "claude-opus-4-8-thinking-max", name: "Claude Opus 4.8 1M Max Thinking" },
  { id: "claude-opus-4-8-thinking-max-fast", name: "Claude Opus 4.8 1M Max Thinking Fast" },
  { id: "gpt-5.6-sol-none", name: "GPT-5.6 Sol 1M None" },
  { id: "gpt-5.6-sol-none-fast", name: "GPT-5.6 Sol None Fast" },
  { id: "gpt-5.6-sol-low", name: "GPT-5.6 Sol 1M Low" },
  { id: "gpt-5.6-sol-low-fast", name: "GPT-5.6 Sol Low Fast" },
  { id: "gpt-5.6-sol-medium", name: "GPT-5.6 Sol 1M" },
  { id: "gpt-5.6-sol-medium-fast", name: "GPT-5.6 Sol Fast" },
  { id: "gpt-5.6-sol-max", name: "GPT-5.6 Sol 1M Max" },
  { id: "gpt-5.6-sol-max-fast", name: "GPT-5.6 Sol Max Fast" },
  { id: "gpt-5.5-none", name: "GPT-5.5 1M None" },
  { id: "gpt-5.5-none-fast", name: "GPT-5.5 None Fast" },
  { id: "gpt-5.5-low", name: "GPT-5.5 1M Low" },
  { id: "gpt-5.5-low-fast", name: "GPT-5.5 Low Fast" },
  { id: "gpt-5.5-medium", name: "GPT-5.5 1M" },
  { id: "gpt-5.5-medium-fast", name: "GPT-5.5 Fast" },
  { id: "gpt-5.5-high", name: "GPT-5.5 1M High" },
  { id: "gpt-5.5-high-fast", name: "GPT-5.5 High Fast" },
  { id: "gpt-5.5-extra-high", name: "GPT-5.5 1M Extra High" },
  { id: "gpt-5.5-extra-high-fast", name: "GPT-5.5 Extra High Fast" },
  { id: "claude-fable-5-low", name: "Claude Fable 5 1M Low (NO ZDR)" },
  { id: "claude-fable-5-medium", name: "Claude Fable 5 1M Medium (NO ZDR)" },
  { id: "claude-fable-5-high", name: "Claude Fable 5 1M (NO ZDR)" },
  { id: "claude-fable-5-xhigh", name: "Claude Fable 5 1M Extra High (NO ZDR)" },
  { id: "claude-fable-5-max", name: "Claude Fable 5 1M Max (NO ZDR)" },
  { id: "claude-fable-5-thinking-low", name: "Claude Fable 5 1M Low Thinking (NO ZDR)" },
  { id: "claude-fable-5-thinking-medium", name: "Claude Fable 5 1M Medium Thinking (NO ZDR)" },
  { id: "claude-fable-5-thinking-max", name: "Claude Fable 5 1M Max Thinking (NO ZDR)" },
  { id: "cursor-grok-4.5-low", name: "Cursor Grok 4.5 Low" },
  { id: "cursor-grok-4.5-low-fast", name: "Cursor Grok 4.5 Low Fast" },
  { id: "cursor-grok-4.5-medium", name: "Cursor Grok 4.5 Medium" },
  { id: "cursor-grok-4.5-medium-fast", name: "Cursor Grok 4.5 Medium Fast" },
  { id: "gemini-3.7-flash-low", name: "Gemini 3.7 Flash Low" },
  { id: "gemini-3.7-flash-medium", name: "Gemini 3.7 Flash Medium" },
  { id: "gpt-5.6-terra-none", name: "GPT-5.6 Terra 1M None" },
  { id: "gpt-5.6-terra-none-fast", name: "GPT-5.6 Terra None Fast" },
  { id: "gpt-5.6-terra-low", name: "GPT-5.6 Terra 1M Low" },
  { id: "gpt-5.6-terra-low-fast", name: "GPT-5.6 Terra Low Fast" },
  { id: "gpt-5.6-terra-medium", name: "GPT-5.6 Terra 1M" },
  { id: "gpt-5.6-terra-medium-fast", name: "GPT-5.6 Terra Fast" },
  { id: "gpt-5.6-terra-high", name: "GPT-5.6 Terra 1M High" },
  { id: "gpt-5.6-terra-high-fast", name: "GPT-5.6 Terra High Fast" },
  { id: "gpt-5.6-terra-xhigh", name: "GPT-5.6 Terra 1M Extra High" },
  { id: "gpt-5.6-terra-xhigh-fast", name: "GPT-5.6 Terra Extra High Fast" },
  { id: "gpt-5.6-terra-max", name: "GPT-5.6 Terra 1M Max" },
  { id: "gpt-5.6-terra-max-fast", name: "GPT-5.6 Terra Max Fast" },
  { id: "claude-sonnet-5-low", name: "Claude Sonnet 5 1M Low" },
  { id: "claude-sonnet-5-medium", name: "Claude Sonnet 5 1M Medium" },
  { id: "claude-sonnet-5-high", name: "Claude Sonnet 5 1M" },
  { id: "claude-sonnet-5-xhigh", name: "Claude Sonnet 5 1M Extra High" },
  { id: "claude-sonnet-5-max", name: "Claude Sonnet 5 1M Max" },
  { id: "claude-sonnet-5-thinking-low", name: "Claude Sonnet 5 1M Low Thinking" },
  { id: "claude-sonnet-5-thinking-medium", name: "Claude Sonnet 5 1M Medium Thinking" },
  { id: "claude-sonnet-5-thinking-max", name: "Claude Sonnet 5 1M Max Thinking" },
  { id: "claude-4.6-sonnet-medium", name: "Claude Sonnet 4.6 1M" },
  { id: "claude-4.6-sonnet-medium-thinking", name: "Claude Sonnet 4.6 1M Thinking" },
  { id: "claude-opus-4-7-low", name: "Claude Opus 4.7 1M Low" },
  { id: "claude-opus-4-7-low-fast", name: "Claude Opus 4.7 1M Low Fast" },
  { id: "claude-opus-4-7-medium", name: "Claude Opus 4.7 1M Medium" },
  { id: "claude-opus-4-7-medium-fast", name: "Claude Opus 4.7 1M Medium Fast" },
  { id: "claude-opus-4-7-high", name: "Claude Opus 4.7 1M High" },
  { id: "claude-opus-4-7-high-fast", name: "Claude Opus 4.7 1M High Fast" },
  { id: "claude-opus-4-7-xhigh", name: "Claude Opus 4.7 1M" },
  { id: "claude-opus-4-7-xhigh-fast", name: "Claude Opus 4.7 1M Fast" },
  { id: "claude-opus-4-7-max", name: "Claude Opus 4.7 1M Max" },
  { id: "claude-opus-4-7-max-fast", name: "Claude Opus 4.7 1M Max Fast" },
  { id: "claude-opus-4-7-thinking-low", name: "Claude Opus 4.7 1M Low Thinking" },
  { id: "claude-opus-4-7-thinking-low-fast", name: "Claude Opus 4.7 1M Low Thinking Fast" },
  { id: "claude-opus-4-7-thinking-medium", name: "Claude Opus 4.7 1M Medium Thinking" },
  { id: "claude-opus-4-7-thinking-medium-fast", name: "Claude Opus 4.7 1M Medium Thinking Fast" },
  { id: "claude-opus-4-7-thinking-high", name: "Claude Opus 4.7 1M High Thinking" },
  { id: "claude-opus-4-7-thinking-high-fast", name: "Claude Opus 4.7 1M High Thinking Fast" },
  { id: "claude-opus-4-7-thinking-xhigh", name: "Claude Opus 4.7 1M Thinking" },
  { id: "claude-opus-4-7-thinking-xhigh-fast", name: "Claude Opus 4.7 1M Thinking Fast" },
  { id: "claude-opus-4-7-thinking-max", name: "Claude Opus 4.7 1M Max Thinking" },
  { id: "claude-opus-4-7-thinking-max-fast", name: "Claude Opus 4.7 1M Max Thinking Fast" },
  { id: "gpt-5.4-low", name: "GPT-5.4 1M Low" },
  { id: "gpt-5.4-medium", name: "GPT-5.4 1M" },
  { id: "gpt-5.4-medium-fast", name: "GPT-5.4 Fast" },
  { id: "gpt-5.4-high", name: "GPT-5.4 1M High" },
  { id: "gpt-5.4-high-fast", name: "GPT-5.4 High Fast" },
  { id: "gpt-5.4-xhigh", name: "GPT-5.4 1M Extra High" },
  { id: "gpt-5.4-xhigh-fast", name: "GPT-5.4 Extra High Fast" },
  { id: "claude-4.6-opus-high", name: "Claude Opus 4.6 1M" },
  { id: "claude-4.6-opus-max", name: "Claude Opus 4.6 1M Max" },
  { id: "claude-4.6-opus-high-thinking", name: "Claude Opus 4.6 1M Thinking" },
  { id: "claude-4.6-opus-max-thinking", name: "Claude Opus 4.6 1M Max Thinking" },
  { id: "claude-4.5-opus-high", name: "Claude Opus 4.5" },
  { id: "claude-4.5-opus-high-thinking", name: "Claude Opus 4.5 Thinking" },
  { id: "gpt-5.2-low", name: "GPT-5.2 Low" },
  { id: "gpt-5.2-low-fast", name: "GPT-5.2 Low Fast" },
  { id: "gpt-5.2-fast", name: "GPT-5.2 Fast" },
  { id: "gpt-5.2-high", name: "GPT-5.2 High" },
  { id: "gpt-5.2-high-fast", name: "GPT-5.2 High Fast" },
  { id: "gpt-5.2-xhigh", name: "GPT-5.2 Extra High" },
  { id: "gpt-5.2-xhigh-fast", name: "GPT-5.2 Extra High Fast" },
  { id: "gpt-5.6-luna-none", name: "GPT-5.6 Luna 1M None" },
  { id: "gpt-5.6-luna-none-fast", name: "GPT-5.6 Luna None Fast" },
  { id: "gpt-5.6-luna-low", name: "GPT-5.6 Luna 1M Low" },
  { id: "gpt-5.6-luna-low-fast", name: "GPT-5.6 Luna Low Fast" },
  { id: "gpt-5.6-luna-medium", name: "GPT-5.6 Luna 1M" },
  { id: "gpt-5.6-luna-medium-fast", name: "GPT-5.6 Luna Fast" },
  { id: "gpt-5.6-luna-high-fast", name: "GPT-5.6 Luna High Fast" },
  { id: "gpt-5.6-luna-xhigh", name: "GPT-5.6 Luna 1M Extra High" },
  { id: "gpt-5.6-luna-xhigh-fast", name: "GPT-5.6 Luna Extra High Fast" },
  { id: "gpt-5.6-luna-max", name: "GPT-5.6 Luna 1M Max" },
  { id: "gpt-5.6-luna-max-fast", name: "GPT-5.6 Luna Max Fast" },
  { id: "gemini-3.6-flash-minimal", name: "Gemini 3.6 Flash Minimal" },
  { id: "gemini-3.6-flash-low", name: "Gemini 3.6 Flash Low" },
  { id: "gemini-3.6-flash-medium", name: "Gemini 3.6 Flash Medium" },
  { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
  { id: "gpt-5.4-mini-none", name: "GPT-5.4 Mini None" },
  { id: "gpt-5.4-mini-low", name: "GPT-5.4 Mini Low" },
  { id: "gpt-5.4-mini-medium", name: "GPT-5.4 Mini" },
  { id: "gpt-5.4-mini-high", name: "GPT-5.4 Mini High" },
  { id: "gpt-5.4-mini-xhigh", name: "GPT-5.4 Mini Extra High" },
  { id: "gpt-5.4-nano-none", name: "GPT-5.4 Nano None" },
  { id: "gpt-5.4-nano-low", name: "GPT-5.4 Nano Low" },
  { id: "gpt-5.4-nano-medium", name: "GPT-5.4 Nano" },
  { id: "gpt-5.4-nano-high", name: "GPT-5.4 Nano High" },
  { id: "gpt-5.4-nano-xhigh", name: "GPT-5.4 Nano Extra High" },
  { id: "claude-4.5-sonnet", name: "Claude Sonnet 4.5" },
  { id: "claude-4.5-sonnet-thinking", name: "Claude Sonnet 4.5 Thinking" },
  { id: "gpt-5.1-low", name: "GPT-5.1 Low" },
  { id: "gpt-5.1", name: "GPT-5.1" },
  { id: "gpt-5.1-high", name: "GPT-5.1 High" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
  { id: "claude-4-sonnet", name: "Claude Sonnet 4" },
  { id: "claude-4-sonnet-thinking", name: "Claude Sonnet 4 Thinking" },
  { id: "gpt-5-mini", name: "GPT-5 Mini" },
  { id: "kimi-k3-low", name: "Kimi K3 Low" },
  { id: "kimi-k3-high", name: "Kimi K3 High" },
  { id: "kimi-k3-max", name: "Kimi K3" },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
  { id: "glm-5.2-high", name: "GLM 5.2" },
  { id: "glm-5.2-max", name: "GLM 5.2 Max" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash" }
];
var CURSOR_CONTEXT_WINDOWS = {
  "claude-fable-5": 1e6,
  "claude-haiku-4-5": 2e5,
  "claude-opus-4-5": 2e5,
  "claude-opus-4-6": 1e6,
  "claude-opus-4-7": 1e6,
  "claude-opus-4-8": 1e6,
  "claude-opus-5": 1e6,
  "claude-sonnet-4": 2e5,
  "claude-sonnet-4-5": 2e5,
  "claude-sonnet-4-6": 1e6,
  "claude-sonnet-5": 1e6,
  "composer-2": 2e5,
  "composer-2.5": 2e5,
  default: 2e5,
  "gemini-2.5-flash": 2e5,
  "gemini-3-flash": 2e5,
  "gemini-3.1-pro": 2e5,
  "gemini-3.5-flash": 2e5,
  "gemini-3.6-flash": 2e5,
  "gemini-3.7-flash": 2e5,
  "glm-5.2": 2e5,
  "gpt-5-mini": 272e3,
  "gpt-5.1": 272e3,
  "gpt-5.2": 272e3,
  "gpt-5.3-codex": 272e3,
  "gpt-5.4": 1e6,
  "gpt-5.4-mini": 272e3,
  "gpt-5.4-nano": 272e3,
  "gpt-5.5": 1e6,
  "gpt-5.6-luna": 1e6,
  "gpt-5.6-sol": 1e6,
  "gpt-5.6-terra": 1e6,
  "grok-4.5": 2e5,
  "grok-4.6": 256e3,
  "kimi-k2.7-code": 2e5,
  "kimi-k3": 2e5
};

// src/cli.ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
function resolveAgentBinary() {
  return process.env.CURSOR_AGENT_PATH?.trim() || process.env.AGENT_PATH?.trim() || "cursor-agent";
}
function buildArgs(options) {
  const args = [
    "--print",
    "--output-format",
    "stream-json",
    // Individual text deltas instead of one accumulated snapshot per turn.
    "--stream-partial-output",
    "--model",
    options.model,
    // The host already resolved the workspace; never prompt for trust.
    "--trust",
    "--workspace",
    options.cwd
  ];
  if (options.apiKey) args.push("--api-key", options.apiKey);
  args.push(options.prompt);
  return args;
}
function spawnAgentRun(options) {
  const child = spawn(resolveAgentBinary(), buildArgs(options), {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env
  });
  const stderrChunks = [];
  child.stderr?.on("data", (chunk) => {
    stderrChunks.push(chunk.toString("utf8"));
  });
  const { promise: outcome, resolve: settle } = Promise.withResolvers();
  child.on("close", (code) => {
    settle({ code, stderr: stderrChunks.join("").trim() });
  });
  child.on("error", (error) => {
    stderrChunks.push(error.message);
    settle({ code: null, stderr: stderrChunks.join("").trim() });
  });
  async function* events() {
    if (!child.stdout) return;
    const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed);
      } catch {
      }
    }
  }
  return {
    events: events(),
    kill: () => {
      child.kill("SIGTERM");
    },
    outcome
  };
}
var runner = spawnAgentRun;
function runAgent(options) {
  return runner(options);
}

// src/context-windows.ts
var DEFAULT_CONTEXT_WINDOW = 2e5;

// src/models.ts
var CURSOR_CLI_BASE_URL = "https://cursor.com";
var ZERO_COST = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
var TEXT_ONLY = ["text"];
var MODELS_TIMEOUT_MS = 2e4;
var REASONING_SUFFIX = /(?:thinking|none|minimal|low|medium|high|xhigh|max)(?:-fast)?$/;
function inferReasoning(id) {
  return REASONING_SUFFIX.test(id);
}
function contextWindowFor(id) {
  let best = 0;
  let window = DEFAULT_CONTEXT_WINDOW;
  for (const [family, size] of Object.entries(CURSOR_CONTEXT_WINDOWS)) {
    if (!id.startsWith(family) || family.length <= best) continue;
    best = family.length;
    window = size;
  }
  return window;
}
function parseAgentModels(output) {
  const models = [];
  const seen = /* @__PURE__ */ new Set();
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
function toProviderModels(items) {
  return items.map((item) => {
    const contextWindow = contextWindowFor(item.id);
    return {
      id: item.id,
      name: item.name || item.id,
      reasoning: inferReasoning(item.id),
      input: [...TEXT_ONLY],
      cost: { ...ZERO_COST },
      contextWindow,
      maxTokens: contextWindow
    };
  });
}
var bootstrapCursorModels = toProviderModels(FALLBACK_CLI_MODELS);
async function fetchCursorModels() {
  const { spawn: spawn2 } = await import("node:child_process");
  const { promise, resolve } = Promise.withResolvers();
  const child = spawn2(resolveAgentBinary(), ["models"], { stdio: ["ignore", "pipe", "pipe"] });
  const chunks = [];
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    resolve(bootstrapCursorModels);
  }, MODELS_TIMEOUT_MS);
  child.stdout?.on("data", (chunk) => {
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

// src/stream.ts
import { createAssistantMessageEventStream } from "@oh-my-pi/pi-ai";

// src/prompt.ts
function partToText(part) {
  if (part.type === "text" && typeof part.text === "string") return part.text;
  if (part.type === "image") {
    return `[image omitted: ${part.mimeType ?? "unknown type"} \u2014 the Cursor CLI cannot receive attachments]`;
  }
  return "";
}
function contentToText(content) {
  if (typeof content === "string") return content;
  return content.map(partToText).filter((text) => text.length > 0).join("\n");
}
function toolCallsOf(content) {
  if (typeof content === "string") return [];
  return content.filter((part) => part.type === "toolCall");
}
function renderAssistant(content, lines) {
  const text = contentToText(content);
  if (text.trim().length > 0) lines.push(`[Assistant]
${text}`);
  for (const call of toolCallsOf(content)) {
    const args = JSON.stringify(call.arguments ?? {});
    lines.push(`[Tool call: ${call.name ?? "unknown"} id=${call.id ?? "?"}]
${args}`);
  }
}
function renderToolResult(message, lines) {
  const body = contentToText(message.content);
  const status = message.isError ? " (failed)" : "";
  lines.push(`[Tool result: ${message.toolName ?? "unknown"} id=${message.toolCallId ?? "?"}${status}]
${body}`);
}
function endsWithToolResults(messages) {
  return messages.at(-1)?.role === "toolResult";
}
function buildCursorPrompt(context) {
  const lines = [];
  if (context.systemPrompt?.length) {
    lines.push(`[System]
${context.systemPrompt.join("\n")}`);
  }
  for (const message of context.messages) {
    if (message.role === "user") {
      lines.push(`[User]
${contentToText(message.content)}`);
      continue;
    }
    if (message.role === "assistant") {
      renderAssistant(message.content, lines);
      continue;
    }
    if (message.role === "toolResult") {
      renderToolResult(message, lines);
    }
  }
  if (endsWithToolResults(context.messages)) {
    lines.push(
      "[Host]\nThe tool calls above already ran on the host and their results are shown. Continue from that state; never repeat a completed call. When you need another tool, call it normally \u2014 the host executes it and returns the result the same way."
    );
  }
  return lines.join("\n\n");
}

// src/tool-map.ts
function cliToolLabel(cliKey) {
  const stripped = cliKey.replace(/ToolCall$/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
function firstString(args, keys) {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return void 0;
}
function editCommand(path, oldString, newString) {
  const encode = (value) => Buffer.from(value, "utf8").toString("base64");
  const script = [
    'const fs=require("fs");',
    'const [p,o,n]=process.argv.slice(1).map((s)=>Buffer.from(s,"base64").toString("utf8"));',
    'const s=fs.readFileSync(p,"utf8");',
    "const hits=s.split(o).length-1;",
    'if(hits!==1){console.error("edit: expected exactly 1 match, found "+hits);process.exit(1);}',
    "fs.writeFileSync(p,s.replace(o,n));",
    'console.log("edited "+p);'
  ].join("");
  return `node -e '${script}' ${encode(path)} ${encode(oldString)} ${encode(newString)}`;
}
function mapCliToolCall(cliKey, args, available) {
  const offer = (name, mapped) => available.has(name) ? { name, args: mapped } : void 0;
  switch (cliKey) {
    case "readToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      return path ? offer("read", { path, i: "Reading file" }) : void 0;
    }
    case "lsToolCall": {
      const path = firstString(args, ["path", "directory", "target_directory"]);
      return path ? offer("read", { path, i: "Listing directory" }) : void 0;
    }
    case "writeToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      const content = firstString(args, ["contents", "content", "text", "newString"]) ?? "";
      return path ? offer("write", { path, content, i: "Writing file" }) : void 0;
    }
    case "editToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      const oldString = firstString(args, ["oldString", "old_string", "old"]);
      const newString = firstString(args, ["newString", "new_string", "new"]) ?? "";
      if (!path || !oldString) return void 0;
      return offer("bash", { command: editCommand(path, oldString, newString), i: "Applying edit" });
    }
    case "deleteToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      return path ? offer("bash", { command: `rm -rf -- ${JSON.stringify(path)}`, i: "Deleting path" }) : void 0;
    }
    case "shellToolCall": {
      const command = firstString(args, ["command", "cmd", "shellCommand"]);
      return command ? offer("bash", { command, i: "Running command" }) : void 0;
    }
    case "grepToolCall": {
      const pattern = firstString(args, ["pattern", "query", "regex"]);
      if (!pattern) return void 0;
      const path = firstString(args, ["path", "directory", "includePattern"]);
      return offer("grep", path ? { pattern, path, i: "Searching" } : { pattern, i: "Searching" });
    }
    case "globToolCall": {
      const pattern = firstString(args, ["globPattern", "pattern", "glob", "path"]);
      return pattern ? offer("glob", { path: pattern, i: "Globbing paths" }) : void 0;
    }
    default:
      return void 0;
  }
}

// src/stream.ts
function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  };
}
function makeMessage(model, stopReason, errorMessage) {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: emptyUsage(),
    stopReason,
    timestamp: Date.now(),
    ...errorMessage ? { errorMessage } : {}
  };
}
var BlockWriter = class {
  constructor(stream, partial, kind) {
    this.stream = stream;
    this.partial = partial;
    this.kind = kind;
  }
  #index = -1;
  #emitted = "";
  /** Emit whatever part of `incoming` the consumer has not seen yet. */
  write(incoming) {
    if (!incoming) return;
    let delta = incoming;
    if (this.#emitted.length > 0) {
      if (incoming.startsWith(this.#emitted)) {
        delta = incoming.slice(this.#emitted.length);
        this.#emitted = incoming;
      } else if (this.#emitted.startsWith(incoming)) {
        return;
      } else {
        this.#emitted += incoming;
      }
    } else {
      this.#emitted = incoming;
    }
    if (!delta) return;
    if (this.#index < 0) {
      if (this.kind === "text") {
        this.partial.content.push({ type: "text", text: "" });
      } else {
        this.partial.content.push({ type: "thinking", thinking: "" });
      }
      this.#index = this.partial.content.length - 1;
      this.stream.push({
        type: this.kind === "text" ? "text_start" : "thinking_start",
        contentIndex: this.#index,
        partial: this.partial
      });
    }
    const block = this.partial.content[this.#index];
    if (this.kind === "text" && block?.type === "text") block.text += delta;
    if (this.kind === "thinking" && block?.type === "thinking") block.thinking += delta;
    this.stream.push({
      type: this.kind === "text" ? "text_delta" : "thinking_delta",
      contentIndex: this.#index,
      delta,
      partial: this.partial
    });
  }
};
function applyUsage(partial, event) {
  const usage = event.usage;
  if (!usage) return;
  partial.usage.input = usage.inputTokens ?? 0;
  partial.usage.output = usage.outputTokens ?? 0;
  partial.usage.cacheRead = usage.cacheReadTokens ?? 0;
  partial.usage.cacheWrite = usage.cacheWriteTokens ?? 0;
  partial.usage.totalTokens = partial.usage.input + partial.usage.output + partial.usage.cacheRead + partial.usage.cacheWrite;
}
function firstToolEntry(event) {
  const call = event.tool_call;
  if (!call) return void 0;
  for (const [cliKey, payload] of Object.entries(call)) {
    if (!cliKey.endsWith("ToolCall")) continue;
    return { cliKey, args: payload?.args ?? {} };
  }
  return void 0;
}
function streamCursor(model, context, options) {
  const stream = createAssistantMessageEventStream();
  const partial = makeMessage(model, "stop");
  void (async () => {
    stream.push({ type: "start", partial });
    const run = runAgent({
      prompt: buildCursorPrompt(context),
      model: model.id,
      cwd: options?.cwd ?? process.cwd(),
      apiKey: resolveCursorApiKey(typeof options?.apiKey === "string" ? options.apiKey : void 0)
    });
    const onAbort = () => {
      run.kill();
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });
    const offered = new Set((context.tools ?? []).map((tool) => tool.name));
    const text = new BlockWriter(stream, partial, "text");
    const thinking = new BlockWriter(stream, partial, "thinking");
    let handedOver;
    try {
      for await (const event of run.events) {
        if (event.type === "thinking") {
          thinking.write(event.text ?? "");
          continue;
        }
        if (event.type === "assistant") {
          for (const block of event.message?.content ?? []) {
            if (block.type === "text") text.write(block.text ?? "");
          }
          continue;
        }
        if (event.type === "tool_call" && event.subtype === "started") {
          const entry = firstToolEntry(event);
          if (!entry) continue;
          const mapped = mapCliToolCall(entry.cliKey, entry.args, offered);
          if (!mapped) {
            text.write(`
[${cliToolLabel(entry.cliKey)} ran inside Cursor]
`);
            continue;
          }
          run.kill();
          handedOver = {
            type: "toolCall",
            id: event.call_id ?? `cursor-${Date.now()}`,
            name: mapped.name,
            arguments: mapped.args
          };
          partial.content.push(handedOver);
          const index = partial.content.length - 1;
          stream.push({ type: "toolcall_start", contentIndex: index, partial });
          stream.push({ type: "toolcall_delta", contentIndex: index, delta: JSON.stringify(mapped.args), partial });
          stream.push({ type: "toolcall_end", contentIndex: index, toolCall: handedOver, partial });
          break;
        }
        if (event.type === "result") {
          applyUsage(partial, event);
          break;
        }
      }
    } finally {
      options?.signal?.removeEventListener("abort", onAbort);
    }
    const { code, stderr } = await run.outcome;
    if (options?.signal?.aborted) {
      const message = makeMessage(model, "aborted", "aborted");
      stream.push({ type: "error", reason: "aborted", error: message });
      stream.end(message);
      return;
    }
    if (handedOver) {
      partial.stopReason = "toolUse";
      stream.push({ type: "done", reason: "toolUse", message: partial });
      stream.end(partial);
      return;
    }
    const producedOutput = partial.content.some(
      (block) => block.type === "text" && block.text.length > 0 || block.type === "thinking"
    );
    if (!producedOutput && code !== 0) {
      const message = makeMessage(model, "error", stderr || `Cursor CLI exited with code ${code}`);
      stream.push({ type: "error", reason: "error", error: message });
      stream.end(message);
      return;
    }
    partial.stopReason = "stop";
    stream.push({ type: "done", reason: "stop", message: partial });
    stream.end(partial);
  })().catch((error) => {
    const detail = error instanceof Error ? error.message : String(error);
    const message = makeMessage(model, "error", detail);
    stream.push({ type: "error", reason: "error", error: message });
    stream.end(message);
  });
  return stream;
}

// src/index.ts
function cursorCliProvider(models) {
  return {
    baseUrl: CURSOR_CLI_BASE_URL,
    api: "cursor-sdk",
    apiKey: CURSOR_API_KEY_CONFIG_VALUE,
    models,
    streamSimple: streamCursor
  };
}
function index_default(pi) {
  pi.registerProvider("cursor-sdk", cursorCliProvider(bootstrapCursorModels));
  pi.registerCommand("update-catalog", {
    description: "Refresh the Cursor model catalog from `cursor-agent models`",
    handler: async (_args, ctx) => {
      const models = await fetchCursorModels();
      ctx.modelRegistry.registerProvider("cursor-sdk", cursorCliProvider(models));
      if (!ctx.hasUI) return;
      ctx.ui.notify(`Cursor CLI catalog updated with ${models.length} models.`, "info");
    }
  });
}
export {
  bootstrapCursorModels,
  index_default as default,
  fetchCursorModels,
  parseAgentModels,
  resolveCursorApiKey,
  streamCursor,
  toProviderModels
};
