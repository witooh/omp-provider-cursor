import type { Context, Message } from "@oh-my-pi/pi-ai";

/**
 * The CLI takes one text prompt per run and keeps no state between runs, so
 * every turn ships the whole transcript: system prompt, messages, the tool
 * calls the model asked for, and the results the host produced.
 */

interface ContentPart {
  type: string;
  text?: string;
  thinking?: string;
  mimeType?: string;
  data?: string;
  name?: string;
  id?: string;
  arguments?: unknown;
}

function partToText(part: ContentPart): string {
  if (part.type === "text" && typeof part.text === "string") return part.text;
  if (part.type === "image") {
    // `cursor-agent --print` takes no attachments; keep the intent visible.
    return `[image omitted: ${part.mimeType ?? "unknown type"} — the Cursor CLI cannot receive attachments]`;
  }
  return "";
}

function contentToText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map(partToText)
    .filter((text) => text.length > 0)
    .join("\n");
}

function toolCallsOf(content: string | ContentPart[]): ContentPart[] {
  if (typeof content === "string") return [];
  return content.filter((part) => part.type === "toolCall");
}

function renderAssistant(content: string | ContentPart[], lines: string[]): void {
  const text = contentToText(content);
  if (text.trim().length > 0) lines.push(`[Assistant]\n${text}`);
  for (const call of toolCallsOf(content)) {
    const args = JSON.stringify(call.arguments ?? {});
    lines.push(`[Tool call: ${call.name ?? "unknown"} id=${call.id ?? "?"}]\n${args}`);
  }
}

function renderToolResult(
  message: Message & { toolName?: string; toolCallId?: string; isError?: boolean },
  lines: string[],
): void {
  const body = contentToText(message.content as string | ContentPart[]);
  const status = message.isError ? " (failed)" : "";
  lines.push(`[Tool result: ${message.toolName ?? "unknown"} id=${message.toolCallId ?? "?"}${status}]\n${body}`);
}

function endsWithToolResults(messages: Message[]): boolean {
  return messages.at(-1)?.role === "toolResult";
}

export function buildCursorPrompt(context: Context): string {
  const lines: string[] = [];

  if (context.systemPrompt?.length) {
    lines.push(`[System]\n${context.systemPrompt.join("\n")}`);
  }

  for (const message of context.messages) {
    if (message.role === "user") {
      lines.push(`[User]\n${contentToText(message.content as string | ContentPart[])}`);
      continue;
    }
    if (message.role === "assistant") {
      renderAssistant(message.content as string | ContentPart[], lines);
      continue;
    }
    if (message.role === "toolResult") {
      renderToolResult(message, lines);
    }
  }

  if (endsWithToolResults(context.messages)) {
    lines.push(
      "[Host]\nThe tool calls above already ran on the host and their results are shown." +
        " Continue from that state; never repeat a completed call." +
        " When you need another tool, call it normally — the host executes it and returns the result the same way.",
    );
  }

  return lines.join("\n\n");
}
