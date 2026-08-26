# @witooh/omp-provider-cursor

[omp](https://github.com/can1357/oh-my-pi) extension that registers **Cursor** models as provider `cursor-sdk`. Inference runs through the **Cursor Agent CLI** (`cursor-agent --print --output-format stream-json`), one process per turn.

Tools stay on the omp tool loop. When the CLI announces a tool call, this provider intercepts the announcement, maps it onto the matching omp tool, and ends the turn — omp asks for approval, executes it, and the next turn ships the result back in the transcript. Nothing is executed inside the Cursor process when a host tool matches.

This is **not** the built-in `cursor` provider. Both can be installed at once.

## Requirements

| Requirement | Details |
|---|---|
| omp | ≥ 17.2.15 |
| Cursor Agent CLI | `cursor-agent` on `PATH` (override with `CURSOR_AGENT_PATH`) |
| Cursor account | Free or paid; the model list follows your subscription |

## Install

```bash
omp plugin install github:witooh/omp-provider-cursor
```

Pin a tag:

```bash
omp plugin install github:witooh/omp-provider-cursor#v0.2.0
```

Local checkout (dev):

```bash
omp plugin link /absolute/path/to/omp-provider-cursor
```

## Auth

Either channel works, checked in this order:

1. `CURSOR_API_KEY` (or `--api-key`) — forwarded to the CLI as `--api-key`.
2. The CLI's own login — run `cursor-agent login` once; credentials live in `~/.cursor/`.

omp `/login` is OAuth-only and is not wired for this provider. If the key lives in a personal env file, `source` it before starting omp; this extension never reads that file.

## Usage

```text
/model cursor-sdk/auto
/model cursor-sdk/composer-2.5
/model cursor-sdk/cursor-grok-4.6-high
/update-catalog
```

Model ids are the CLI's own ids, so the reasoning level is part of the id (`-thinking`, `-high`, `-xhigh`, `-fast`). The list is baked into the plugin; `/update-catalog` refreshes it from `cursor-agent models` for the current session.

## Behaviour notes

- **Stateless turns.** Every turn sends the whole transcript — system prompt, messages, tool calls, tool results — as one CLI prompt. There is no live session to wedge between tool rounds.
- **Tool mapping.** `read`/`ls` → `read`, `write` → `write`, `shell`/`delete` → `bash`, `grep` → `grep`, `glob` → `glob`. An `edit` announcement becomes a `bash` command that performs one exact, single-match replacement, so the change still passes omp's approval path.
- **CLI-owned tools.** A tool with no omp counterpart (todo, web search) stays inside Cursor and is narrated in the output instead of being intercepted.
- **Images.** `cursor-agent --print` takes no attachments; image parts are replaced with a placeholder note.
- **Usage.** Token counts come from the CLI's `result` event. Cost is always 0 — billing goes through your Cursor subscription.

## Development

```bash
bun install
bun test
npm run check
npm run build
```

`npm run catalog:refresh` regenerates `src/catalog.generated.ts` from `cursor-agent models`.
