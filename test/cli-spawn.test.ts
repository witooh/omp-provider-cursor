import { afterEach, describe, expect, it } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAgentBinary, runAgent } from "../src/cli.js";
import { fetchCursorModels } from "../src/models.js";

const previousPath = process.env.CURSOR_AGENT_PATH;

/** Write an executable stub that stands in for the real cursor-agent. */
function stubBinary(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "cursor-stub-"));
  const file = join(dir, "cursor-agent");
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
  process.env.CURSOR_AGENT_PATH = file;
  return file;
}

afterEach(() => {
  if (previousPath === undefined) delete process.env.CURSOR_AGENT_PATH;
  else process.env.CURSOR_AGENT_PATH = previousPath;
});

describe("resolveAgentBinary", () => {
  it("prefers the configured path over the default name", () => {
    const file = stubBinary("exit 0");
    expect(resolveAgentBinary()).toBe(file);
  });
});

describe("runAgent", () => {
  it("parses NDJSON lines, skips noise, and reports the exit code", async () => {
    stubBinary(
      [
        'echo \'{"type":"system","subtype":"init"}\'',
        "echo 'not json at all'",
        'echo \'{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"hi"}]}}\'',
        'echo \'{"type":"result","subtype":"success"}\'',
        "exit 0",
      ].join("\n"),
    );

    const run = runAgent({ prompt: "p", model: "auto", cwd: process.cwd() });
    const types: string[] = [];
    for await (const event of run.events) types.push(event.type);

    expect(types).toEqual(["system", "assistant", "result"]);
    expect((await run.outcome).code).toBe(0);
  });

  it("captures stderr and a non-zero exit", async () => {
    stubBinary(["echo 'boom' >&2", "exit 7"].join("\n"));

    const run = runAgent({ prompt: "p", model: "auto", cwd: process.cwd() });
    for await (const _event of run.events) {
      // Drain: the stub writes nothing to stdout.
    }
    const outcome = await run.outcome;

    expect(outcome.code).toBe(7);
    expect(outcome.stderr).toBe("boom");
  });

  it("passes the prompt, model, workspace and api key to the binary", async () => {
    stubBinary('printf \'{"type":"result","args":"%s"}\\n\' "$*"');

    const run = runAgent({ prompt: "hello", model: "composer-2.5", cwd: "/repo", apiKey: "key-live" });
    const events = [];
    for await (const event of run.events) events.push(event);
    await run.outcome;

    const args = String((events[0] as { args?: string }).args);
    expect(args).toContain("--print --output-format stream-json --stream-partial-output");
    expect(args).toContain("--model composer-2.5");
    expect(args).toContain("--trust --workspace /repo");
    expect(args).toContain("--api-key key-live");
    expect(args.endsWith("hello")).toBe(true);
  });

  it("kills a run on demand", async () => {
    stubBinary(['echo \'{"type":"system"}\'', "sleep 30"].join("\n"));

    const run = runAgent({ prompt: "p", model: "auto", cwd: process.cwd() });
    const iterator = run.events[Symbol.asyncIterator]();
    await iterator.next();
    run.kill();

    expect((await run.outcome).code).toBeNull();
  });
});

describe("fetchCursorModels", () => {
  it("parses the live list from the CLI", async () => {
    stubBinary(
      [
        "echo 'Available models'",
        "echo ''",
        "echo 'auto - Auto (current, default)'",
        "echo 'composer-2.5 - Composer 2.5'",
      ].join("\n"),
    );

    const models = await fetchCursorModels();

    expect(models.map((model) => model.id)).toEqual(["auto", "composer-2.5"]);
  });

  it("falls back to the baked catalog when the CLI fails", async () => {
    stubBinary("exit 1");

    const models = await fetchCursorModels();

    expect(models.length).toBeGreaterThan(50);
  });
});
