import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

/** Cursor Agent CLI binary; overridable for installs outside PATH. */
export function resolveAgentBinary(): string {
  return process.env.CURSOR_AGENT_PATH?.trim() || process.env.AGENT_PATH?.trim() || "cursor-agent";
}

export interface AgentRunOptions {
  prompt: string;
  model: string;
  cwd: string;
  apiKey?: string;
}

/** One NDJSON line from `--output-format stream-json`. */
export interface AgentEvent {
  type: string;
  subtype?: string;
  text?: string;
  message?: { role: string; content: Array<{ type: string; text?: string }> };
  tool_call?: Record<string, { args?: Record<string, unknown>; result?: Record<string, unknown> }>;
  call_id?: string;
  model_call_id?: string;
  session_id?: string;
  is_error?: boolean;
  result?: string;
  usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number };
}

export interface AgentRun {
  /** NDJSON events in arrival order; ends when the process exits. */
  events: AsyncIterable<AgentEvent>;
  /** Stop the run; the child is signalled and the event stream ends. */
  kill: () => void;
  /** Exit code plus captured stderr, available after the stream ends. */
  outcome: Promise<{ code: number | null; stderr: string }>;
}

export type AgentRunner = (options: AgentRunOptions) => AgentRun;

function buildArgs(options: AgentRunOptions): string[] {
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
    options.cwd,
  ];
  if (options.apiKey) args.push("--api-key", options.apiKey);
  args.push(options.prompt);
  return args;
}

function spawnAgentRun(options: AgentRunOptions): AgentRun {
  const child = spawn(resolveAgentBinary(), buildArgs(options), {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const stderrChunks: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk.toString("utf8"));
  });

  const { promise: outcome, resolve: settle } = Promise.withResolvers<{ code: number | null; stderr: string }>();
  child.on("close", (code) => {
    settle({ code, stderr: stderrChunks.join("").trim() });
  });
  child.on("error", (error: Error) => {
    stderrChunks.push(error.message);
    settle({ code: null, stderr: stderrChunks.join("").trim() });
  });

  async function* events(): AsyncGenerator<AgentEvent> {
    if (!child.stdout) return;
    const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as AgentEvent;
      } catch {
        // A malformed line is never fatal: the CLI also writes human notices.
      }
    }
  }

  return {
    events: events(),
    kill: () => {
      child.kill("SIGTERM");
    },
    outcome,
  };
}

let runner: AgentRunner = spawnAgentRun;

/** Test seam: replace the process runner with a scripted event source. */
export function setAgentRunner(next: AgentRunner | undefined): void {
  runner = next ?? spawnAgentRun;
}

export function runAgent(options: AgentRunOptions): AgentRun {
  return runner(options);
}
