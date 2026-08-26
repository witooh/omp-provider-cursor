import { describe, expect, it } from "bun:test";
import { cliToolLabel, mapCliToolCall } from "../src/tool-map.js";

const OMP_TOOLS = new Set(["read", "write", "bash", "grep", "glob"]);

describe("mapCliToolCall", () => {
  it("maps reads and directory listings onto omp read", () => {
    expect(mapCliToolCall("readToolCall", { path: "a.ts" }, OMP_TOOLS)).toEqual({
      name: "read",
      args: { path: "a.ts", i: "Reading file" },
    });
    expect(mapCliToolCall("lsToolCall", { path: "src" }, OMP_TOOLS)).toEqual({
      name: "read",
      args: { path: "src", i: "Listing directory" },
    });
  });

  it("maps writes, shells, greps and globs", () => {
    expect(mapCliToolCall("writeToolCall", { path: "a.ts", contents: "x" }, OMP_TOOLS)).toEqual({
      name: "write",
      args: { path: "a.ts", content: "x", i: "Writing file" },
    });
    expect(mapCliToolCall("shellToolCall", { command: "ls -a" }, OMP_TOOLS)).toEqual({
      name: "bash",
      args: { command: "ls -a", i: "Running command" },
    });
    expect(mapCliToolCall("grepToolCall", { pattern: "TODO", path: "src" }, OMP_TOOLS)).toEqual({
      name: "grep",
      args: { pattern: "TODO", path: "src", i: "Searching" },
    });
    expect(mapCliToolCall("globToolCall", { globPattern: "**/*.ts" }, OMP_TOOLS)).toEqual({
      name: "glob",
      args: { path: "**/*.ts", i: "Globbing paths" },
    });
  });

  it("turns an edit into an exact single-match replacement through bash", () => {
    const mapped = mapCliToolCall(
      "editToolCall",
      { path: "a.ts", oldString: "let x = 1", newString: "let x = 2" },
      OMP_TOOLS,
    );
    if (!mapped) throw new Error("edit was not mapped");
    expect(mapped.name).toBe("bash");
    const command = String(mapped.args.command);
    expect(command.startsWith("node -e ")).toBe(true);
    // Payloads travel base64 so quoting and newlines cannot break the command.
    expect(command).toContain(Buffer.from("let x = 1", "utf8").toString("base64"));
    expect(command).toContain(Buffer.from("let x = 2", "utf8").toString("base64"));
    expect(command).toContain("expected exactly 1 match");
  });

  it("declines when the host does not offer the mapped tool", () => {
    expect(mapCliToolCall("readToolCall", { path: "a.ts" }, new Set(["bash"]))).toBeUndefined();
    expect(mapCliToolCall("shellToolCall", { command: "ls" }, new Set())).toBeUndefined();
  });

  it("declines unknown tools and tools with unusable arguments", () => {
    expect(mapCliToolCall("todoToolCall", { items: [] }, OMP_TOOLS)).toBeUndefined();
    expect(mapCliToolCall("readToolCall", {}, OMP_TOOLS)).toBeUndefined();
    expect(mapCliToolCall("editToolCall", { path: "a.ts" }, OMP_TOOLS)).toBeUndefined();
  });

  it("labels CLI-owned tools for narration", () => {
    expect(cliToolLabel("todoToolCall")).toBe("Todo");
    expect(cliToolLabel("webSearchToolCall")).toBe("WebSearch");
  });
});
