# Cursor CLI provider

Vocabulary for the omp extension that exposes Cursor models through the Cursor Agent CLI.

## Language

**cursor-sdk**:
The omp provider id for this extension. Kept from the SDK era so existing sessions and configs keep resolving. Distinct from the built-in `cursor` provider.
_Avoid_: cursor (the built-in), cursor-acp

**Cursor Agent CLI**:
The `cursor-agent` binary that runs inference. Invoked once per turn with `--print --output-format stream-json`. Not the in-process `@cursor/sdk` runtime, which this provider no longer uses.
_Avoid_: Cursor SDK, cursor-agent protocol, api2.cursor.sh

**turn run**:
One CLI process serving one omp turn. It ends when the model finishes, when a tool call is intercepted, or when the host aborts. Nothing survives between runs.
_Avoid_: live-run, session, resume

**transcript prompt**:
The single text prompt each run receives: system prompt, every message, the tool calls the model made, and the results the host produced.
_Avoid_: history replay, context window dump

**interception**:
Turning a CLI tool announcement into an omp tool call: the run is killed, the mapped call is emitted, and the turn ends with `toolUse`. This is what keeps execution, approval and the session record on the host.
_Avoid_: proxying, tool bridge, MCP bridge

**CLI-owned tool**:
A tool the CLI announces that has no omp counterpart (todo, web search). It runs inside Cursor and is narrated in the assistant text.
_Avoid_: native tool leak, unsupported tool

**baked catalog**:
The model list generated from `cursor-agent models` into `catalog.generated.ts`, registered at startup. `/update-catalog` refreshes it live.
_Avoid_: fallback models, dummy catalog

**context window**:
Taken from the family prefix table in `catalog.generated.ts`; unknown families fall back to 200k. `maxTokens` mirrors it.
_Avoid_: per-variant window table
