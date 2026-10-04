/**
 * Narrow Telegram Bot API Update → our inbound event.
 * Only the fields we use. Full API types are not required.
 */

import type { TelegramInbound } from "./types";

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number; type?: string };
    text?: string;
    document?: {
      file_id?: string;
      file_name?: string;
      mime_type?: string;
    };
  };
  callback_query?: {
    id?: string;
    data?: string;
    message?: {
      chat?: { id?: number };
    };
  };
};

export function chatIdFromUpdate(update: TelegramUpdate): number | null {
  const fromMessage = update.message?.chat?.id;
  if (typeof fromMessage === "number") return fromMessage;
  const fromCallback = update.callback_query?.message?.chat?.id;
  if (typeof fromCallback === "number") return fromCallback;
  return null;
}

export function callbackQueryId(update: TelegramUpdate): string | null {
  const id = update.callback_query?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function inboundFromUpdate(update: TelegramUpdate): TelegramInbound | null {
  const callback = update.callback_query?.data;
  if (typeof callback === "string" && callback.length > 0) {
    return { kind: "callback", data: callback };
  }

  const doc = update.message?.document;
  if (doc?.file_id) {
    return {
      kind: "document",
      fileId: doc.file_id,
      fileName: doc.file_name ?? "statement.pdf",
      mimeType: doc.mime_type ?? null,
    };
  }

  const text = update.message?.text?.trim();
  if (!text) return null;

  if (text.startsWith("/")) {
    const [rawCommand, ...rest] = text.split(/\s+/);
    const command = (rawCommand ?? "").split("@")[0]?.toLowerCase() ?? "";
    return {
      kind: "command",
      command,
      args: rest.join(" ").trim(),
    };
  }

  return { kind: "text", text };
}
