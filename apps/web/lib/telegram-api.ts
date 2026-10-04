/**
 * Minimal Telegram Bot API client for sendMessage / answerCallbackQuery / getFile.
 */

import type { InlineButton, TelegramReply } from "@pesasense/telegram";

const API = "https://api.telegram.org";

export async function telegramCall<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram ${method} failed`);
  }
  return json.result as T;
}

function inlineKeyboard(buttons: InlineButton[][]) {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.callbackData })),
    ),
  };
}

function replyKeyboard(rows: string[][]) {
  return {
    keyboard: rows.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function replyMarkup(reply: TelegramReply): Record<string, unknown> | undefined {
  if (reply.replyKeyboard && reply.replyKeyboard.length > 0) {
    return replyKeyboard(reply.replyKeyboard);
  }
  if (reply.removeKeyboard) {
    return { remove_keyboard: true };
  }
  if (reply.buttons && reply.buttons.length > 0) {
    return inlineKeyboard(reply.buttons);
  }
  return undefined;
}

export async function sendTelegramReplies(
  botToken: string,
  chatId: number,
  replies: TelegramReply[],
): Promise<void> {
  for (const reply of replies) {
    const markup = replyMarkup(reply);
    await telegramCall(botToken, "sendMessage", {
      chat_id: chatId,
      text: reply.text,
      ...(markup ? { reply_markup: markup } : {}),
    });
  }
}

export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text?: string | null,
): Promise<void> {
  await telegramCall(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function downloadTelegramFile(
  botToken: string,
  fileId: string,
): Promise<Uint8Array> {
  const file = await telegramCall<{ file_path?: string }>(botToken, "getFile", {
    file_id: fileId,
  });
  if (!file.file_path) {
    throw new Error("Telegram did not return a file path.");
  }
  const res = await fetch(`${API}/file/bot${botToken}/${file.file_path}`);
  if (!res.ok) {
    throw new Error("Could not download the file from Telegram.");
  }
  return new Uint8Array(await res.arrayBuffer());
}
