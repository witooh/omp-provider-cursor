---
name: update-catalog
description: >
  Refresh the baked Cursor model catalog in @witooh/omp-provider-cursor from
  Cursor.models.list, then update tests and rebuild. Use when asked to update
  catalog, refresh models, sync Cursor models, pull the latest Cursor model
  list, add a missing Cursor model, or อัปเดต catalog / รีเฟรชโมเดล /
  sync รายการ model จาก Cursor.
---

# Update catalog

Replace the baked Cursor model list from a live `Cursor.models.list` call.
Startup stays static — this skill is how the snapshot is renewed.

Do not ship. Do not commit unless the user asks. Do not read personal env
files such as `~/.zshrc_myenv`.

## 1. Preflight

`CURSOR_API_KEY` must already be in this shell.

```bash
node -e 'if (!process.env.CURSOR_API_KEY?.trim()) process.exit(1)'
```

If that fails, stop and tell the user to `export CURSOR_API_KEY=...` (or
`source` their own env file) and invoke the skill again.

## 2. Fetch and rewrite

From the repo root:

```bash
bun .omp/skills/update-catalog/scripts/refresh-catalog.ts
```

- lists models from `Cursor.models.list`
- keeps `id`, `displayName`, and catalog parameters `effort`, `reasoning`, `thinking`, and `context`
- sets each context window from the catalog `context` label when present,
  otherwise the previous generated window, otherwise `200_000`
- aborts on an empty list

Print the JSON summary (`count`, `added`, `removed`).

## 3. Align tests

Open `test/models.test.ts`.

- Set the bootstrap length assertion to the new `count`.
- Keep assertions only for ids that still exist. Drop ids in `removed`.
- Add a name assertion for each id in `added` using the live `displayName`.
- Do not invent token windows. Read the new `CURSOR_CONTEXT_WINDOWS` entry.

- Confirm models that advertise `effort` or `reasoning` still expose `thinking.mode === "effort"` after the rewrite.

## 4. Gates

```bash
npm run check
npx biome check .
npm test
npm run build
```

A failing gate ends the skill. Leave the generated file in the tree and
report the failure.

## 5. Report

List added, removed, and any window that changed. Remind: a new omp session
is required to see the baked list. Ship only if the user asks.

## Rules

- Live Cursor list is the source of truth for ids and display names.
- Do not add a model that `Cursor.models.list` did not return.
- Do not replace a Cursor-side window with an API-advertised number from
  another vendor unless the live catalog item itself has that `context` label.
- `/update-catalog` updates the in-session catalog only. This skill rewrites the baked snapshot.
- `/cursor-sdk-refresh-models` is the old name and must not be registered.
