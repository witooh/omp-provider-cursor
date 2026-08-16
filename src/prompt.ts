import type { SDKImage, SDKUserMessage } from "@cursor/sdk";
import type { Context, ImageContent, Message } from "@oh-my-pi/pi-ai";

function textOf(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function latestUser(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === "user") return message;
  }
  return undefined;
}

function imagesOf(content: string | Array<{ type: string }>): SDKImage[] {
  if (typeof content === "string") return [];
  const images: SDKImage[] = [];
  for (const part of content) {
    if (part.type !== "image") continue;
    const image = part as ImageContent;
    images.push({ data: image.data, mimeType: image.mimeType });
  }
  return images;
}

export function buildCursorPrompt(context: Context): SDKUserMessage {
  const user = latestUser(context.messages);
  const latest = user ? textOf(user.content) : "Continue.";
  const history: string[] = [];
  if (context.systemPrompt?.length) history.push(context.systemPrompt.join("\n"));
  for (const message of context.messages) {
    if (message === user) continue;
    if (message.role === "user") history.push(`User: ${textOf(message.content)}`);
    if (message.role === "assistant") history.push(`Assistant: ${textOf(message.content)}`);
  }
  const text = history.length > 0 ? `${history.join("\n\n")}\n\nUser: ${latest}` : latest;
  const images = user ? imagesOf(user.content) : [];
  return images.length > 0 ? { text, images } : { text };
}
