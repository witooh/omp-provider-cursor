export type CursorSdkModule = typeof import("@cursor/sdk");

// @cursor/sdk loads native local-agent bits on first import; keep it off the
// extension startup path until a Cursor turn actually needs it.
export async function loadCursorSdk(): Promise<CursorSdkModule> {
  return import("@cursor/sdk");
}
