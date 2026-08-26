/**
 * The Cursor CLI owns its native tools: it announces each call as a
 * `tool_call` event and then runs it inside its own process. To keep execution
 * on the host — with omp's permissions, skills and session record — the stream
 * layer intercepts the announcement, maps it onto an omp tool, and ends the
 * segment before the CLI's own execution can matter.
 */

export interface MappedToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Human label for a CLI tool event key, used when no omp tool maps to it. */
export function cliToolLabel(cliKey: string): string {
  const stripped = cliKey.replace(/ToolCall$/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function firstString(args: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * An exact single-occurrence replacement, run through omp's bash tool so the
 * mutation passes the host's approval path. Cursor's edit event carries only
 * old/new strings, which omp's hashline `edit` tool cannot express.
 */
function editCommand(path: string, oldString: string, newString: string): string {
  const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
  const script = [
    'const fs=require("fs");',
    'const [p,o,n]=process.argv.slice(1).map((s)=>Buffer.from(s,"base64").toString("utf8"));',
    'const s=fs.readFileSync(p,"utf8");',
    "const hits=s.split(o).length-1;",
    'if(hits!==1){console.error("edit: expected exactly 1 match, found "+hits);process.exit(1);}',
    "fs.writeFileSync(p,s.replace(o,n));",
    'console.log("edited "+p);',
  ].join("");
  return `node -e '${script}' ${encode(path)} ${encode(oldString)} ${encode(newString)}`;
}

/**
 * Translate one CLI tool announcement into an omp tool call. Returns undefined
 * when the host does not offer a matching tool, in which case the CLI keeps
 * ownership of that call.
 */
export function mapCliToolCall(
  cliKey: string,
  args: Record<string, unknown>,
  available: ReadonlySet<string>,
): MappedToolCall | undefined {
  const offer = (name: string, mapped: Record<string, unknown>): MappedToolCall | undefined =>
    available.has(name) ? { name, args: mapped } : undefined;

  switch (cliKey) {
    case "readToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      return path ? offer("read", { path, i: "Reading file" }) : undefined;
    }
    case "lsToolCall": {
      const path = firstString(args, ["path", "directory", "target_directory"]);
      return path ? offer("read", { path, i: "Listing directory" }) : undefined;
    }
    case "writeToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      const content = firstString(args, ["contents", "content", "text", "newString"]) ?? "";
      return path ? offer("write", { path, content, i: "Writing file" }) : undefined;
    }
    case "editToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      const oldString = firstString(args, ["oldString", "old_string", "old"]);
      const newString = firstString(args, ["newString", "new_string", "new"]) ?? "";
      if (!path || !oldString) return undefined;
      return offer("bash", { command: editCommand(path, oldString, newString), i: "Applying edit" });
    }
    case "deleteToolCall": {
      const path = firstString(args, ["path", "target_file", "file"]);
      return path ? offer("bash", { command: `rm -rf -- ${JSON.stringify(path)}`, i: "Deleting path" }) : undefined;
    }
    case "shellToolCall": {
      const command = firstString(args, ["command", "cmd", "shellCommand"]);
      return command ? offer("bash", { command, i: "Running command" }) : undefined;
    }
    case "grepToolCall": {
      const pattern = firstString(args, ["pattern", "query", "regex"]);
      if (!pattern) return undefined;
      const path = firstString(args, ["path", "directory", "includePattern"]);
      return offer("grep", path ? { pattern, path, i: "Searching" } : { pattern, i: "Searching" });
    }
    case "globToolCall": {
      const pattern = firstString(args, ["globPattern", "pattern", "glob", "path"]);
      return pattern ? offer("glob", { path: pattern, i: "Globbing paths" }) : undefined;
    }
    default:
      return undefined;
  }
}
