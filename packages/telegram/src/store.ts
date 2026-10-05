/**
 * Per-chat session store for the Telegram bot.
 * Prefer a JSON file in demos so a restart keeps the conversation.
 * Production without TELEGRAM_STORE_PATH can stay in memory for this process.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalizeSession } from "./session";
import type { TelegramSession } from "./types";

export interface TelegramStore {
  getSession(chatId: number): TelegramSession | null;
  saveSession(session: TelegramSession): void;
  deleteSession(chatId: number): void;
  deleteExpired(now: number): void;
}

function cloneSession(session: TelegramSession): TelegramSession {
  return structuredClone(session);
}

export function createMemoryTelegramStore(): TelegramStore {
  const sessions = new Map<number, TelegramSession>();
  return {
    getSession(chatId) {
      const row = sessions.get(chatId);
      return row ? normalizeSession(cloneSession(row)) : null;
    },
    saveSession(session) {
      sessions.set(session.chatId, normalizeSession(cloneSession(session)));
    },
    deleteSession(chatId) {
      sessions.delete(chatId);
    },
    deleteExpired(now) {
      for (const [id, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(id);
      }
    },
  };
}

type FileShape = {
  sessions: Record<string, TelegramSession>;
};

/**
 * Durable enough for a hackathon demo: one JSON file under .data/.
 * Not a production database. Concurrent writers can clobber each other.
 */
export function openJsonTelegramStore(filename: string): TelegramStore {
  mkdirSync(dirname(filename), { recursive: true });

  function read(): Map<number, TelegramSession> {
    try {
      const raw = readFileSync(filename, "utf8");
      const parsed = JSON.parse(raw) as FileShape;
      const map = new Map<number, TelegramSession>();
      for (const [key, value] of Object.entries(parsed.sessions ?? {})) {
        const chatId = Number(key);
        if (Number.isFinite(chatId)) map.set(chatId, value);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  function write(map: Map<number, TelegramSession>): void {
    const sessions: Record<string, TelegramSession> = {};
    for (const [chatId, session] of map) {
      sessions[String(chatId)] = session;
    }
    writeFileSync(filename, JSON.stringify({ sessions }, null, 2), "utf8");
  }

  return {
    getSession(chatId) {
      const map = read();
      const row = map.get(chatId);
      return row ? normalizeSession(cloneSession(row)) : null;
    },
    saveSession(session) {
      const map = read();
      map.set(session.chatId, normalizeSession(cloneSession(session)));
      write(map);
    },
    deleteSession(chatId) {
      const map = read();
      map.delete(chatId);
      write(map);
    },
    deleteExpired(now) {
      const map = read();
      let changed = false;
      for (const [id, session] of map) {
        if (session.expiresAt <= now) {
          map.delete(id);
          changed = true;
        }
      }
      if (changed) write(map);
    },
  };
}
