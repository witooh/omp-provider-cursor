# Cursor SDK provider

Vocabulary for the omp extension that exposes Cursor models through the Cursor SDK.

## Language

**cursor-sdk**:
The omp provider id for this extension. Distinct from the built-in `cursor` provider.
_Avoid_: cursor (the built-in), cursor-agent

**Cursor SDK**:
Cursor's local agent runtime (`@cursor/sdk`) used for inference. Not the built-in HTTP/2 Cursor Agent protocol.
_Avoid_: cursor-agent, api2.cursor.sh

**bootstrap catalog**:
The baked-in model list registered at startup. Not fetched from Cursor unless the user runs `/update-catalog`.
_Avoid_: fallback models, dummy catalog

**live catalog**:
The model list returned by Cursor for the current API key. Loaded only by `/update-catalog`.
_Avoid_: dynamic models (omp hook name)

**context window**:
The per-model token limit shown on `/model`. Taken from the catalog `context` parameter when present, otherwise from the observed SDK checkpoint table. `maxTokens` mirrors it.
_Avoid_: a single 128k/16k fallback for every model

**omp tool loop**:
The shared omp contract: the provider emits tool calls, omp executes them, the next turn carries tool results. Same loop as other omp providers.
_Avoid_: Cursor-native tools, Cursor built-in tools, MCP bridge

**live-run**:
One in-flight Cursor SDK send that stays open across omp tool-loop turns until the assistant finishes or the session is closed.
_Avoid_: session pooling, MCP bridge
