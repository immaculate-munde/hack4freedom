/**
 * One Telegram session store for this server process.
 * Dev defaults to a JSON file under .data/ so demos survive a restart.
 *
 * Env (see apps/web/.env.example):
 * - TELEGRAM_BOT_TOKEN — BotFather token (required for live webhook replies)
 * - TELEGRAM_WEBHOOK_SECRET — optional; set the same value when calling setWebhook
 * - TELEGRAM_BOT_USERNAME / NEXT_PUBLIC_TELEGRAM_BOT_USERNAME — for t.me links
 * - TELEGRAM_STORE_PATH — optional JSON file path
 */

import path from "node:path";
import {
  createMemoryTelegramStore,
  openJsonTelegramStore,
  type TelegramStore,
} from "@pesasense/telegram";

const globalStore = globalThis as { __pesasenseTelegramStore?: TelegramStore };

export function getTelegramStore(): TelegramStore {
  if (!globalStore.__pesasenseTelegramStore) {
    const configured = process.env.TELEGRAM_STORE_PATH?.trim();
    if (configured === ":memory:") {
      globalStore.__pesasenseTelegramStore = createMemoryTelegramStore();
    } else {
      const filename = configured
        ? configured
        : process.env.NODE_ENV === "production"
          ? ""
          : path.join(process.cwd(), ".data", "telegram-sessions.json");
      globalStore.__pesasenseTelegramStore = filename
        ? openJsonTelegramStore(filename)
        : createMemoryTelegramStore();
    }
    console.info(
      JSON.stringify({
        source: "telegram",
        event: "store",
        mode:
          process.env.TELEGRAM_STORE_PATH === ":memory:" ||
          (!configured && process.env.NODE_ENV === "production")
            ? "memory"
            : "file",
      }),
    );
  }
  return globalStore.__pesasenseTelegramStore;
}
