# @witooh/omp-provider-cursor

[omp](https://github.com/can1357/oh-my-pi) extension that registers **Cursor SDK** models as provider `cursor-sdk`. Inference goes through `@cursor/sdk` (`Agent.create` / `Agent.send`). Tools stay on the omp tool loop: this provider emits `toolcall_*`, omp executes, the next turn resumes the same live SDK send.

This is **not** the built-in `cursor` provider (`cursor-agent` → `api2.cursor.sh`). Both can be installed at once.

## Install

```bash
omp plugin install github:witooh/omp-provider-cursor
```

Pin a tag:

```bash
omp plugin install github:witooh/omp-provider-cursor#v0.1.0
```

Local checkout (dev):

```bash
omp plugin link /absolute/path/to/omp-provider-cursor
```

Requires omp ≥ 17.2.15 and Node.js 22.13+ (`@cursor/sdk` is pinned to **1.0.28**).

## Auth

API key only. Cursor Desktop / Agent CLI login and the built-in `cursor` OAuth / `CURSOR_ACCESS_TOKEN` are not reused.

1. Create a user or service-account key at [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api).
2. Export `CURSOR_API_KEY`, or start omp with `--api-key`. `/login` is OAuth-only in omp and is not wired for this provider.

If the key lives in a personal env file, `source` that file in the shell before starting omp. This extension never reads that file.

## Usage

```text
/model cursor-sdk/composer-2-5
/cursor-sdk-refresh-models
```

Without a key, a bootstrap catalog still lists `composer-2-5`. After a key is available, `/cursor-sdk-refresh-models` replaces the catalog from `Cursor.models.list`.

## v1 scope

- Local SDK runtime only
- omp tools via `local.customTools` (Cursor built-ins are off; `tools: ["mcp"]` keeps custom tools)
- Live-run state in `options.providerSessionState`, keyed by `sessionId`
- No Cursor Cloud, no MCP bridge server, no native replay cards

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run lint
```

Tests run on **Bun**. `@oh-my-pi/*` ships TypeScript that needs Bun globals.

## License

MIT
