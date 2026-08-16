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
The static model list shown before a Cursor API key is available.
_Avoid_: fallback models, dummy catalog

**live catalog**:
The model list returned by Cursor for the current API key after refresh.
_Avoid_: dynamic models (omp hook name)

**omp tool loop**:
The shared omp contract: the provider emits tool calls, omp executes them, the next turn carries tool results. Same loop as other omp providers.
_Avoid_: Cursor-native tools, Cursor built-in tools, MCP bridge

**live-run**:
One in-flight Cursor SDK send that stays open across omp tool-loop turns until the assistant finishes or the session is closed.
_Avoid_: session pooling, MCP bridge
