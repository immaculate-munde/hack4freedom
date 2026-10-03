/**
 * Server-side phone links, USSD sessions, and the shared purchase index.
 * Financial profiles are not stored here. They stay in @pesasense/core.
 */

import { isUssdLang, type UssdLang } from "./copy";
import type {
  LinkCodeResult,
  ProfileId,
  PurchaseRecord,
  PurchaseSource,
  UssdAccount,
  UssdFlow,
  UssdSession,
} from "./types";

export { isUssdLang, type UssdLang };

export interface PurchasePatch {
  status: string;
  amountSats?: number | null;
  amountKes?: number;
}

export interface NewLinkCode {
  code: string;
  profileId: ProfileId;
  destination: string | null;
  expiresAt: number;
}

export interface UssdStore {
  getAccount(phone: string): UssdAccount | null;
  saveAccount(account: UssdAccount): void;
  getSession(sessionId: string): UssdSession | null;
  saveSession(session: UssdSession): void;
  deleteExpired(now: number): void;
  createLinkCode(input: NewLinkCode): void;
  redeemLinkCode(code: string, phone: string, now: number): LinkCodeResult | null;
  indexPurchase(record: PurchaseRecord): void;
  updatePurchase(purchaseId: string, patch: PurchasePatch): void;
  latestPurchase(phone: string): PurchaseRecord | null;
  listPurchases(phone: string, limit: number): PurchaseRecord[];
  hitRate(bucket: string, now: number, windowMs: number): number;
  getLanguage(phone: string): UssdLang | null;
  setLanguage(phone: string, language: UssdLang): void;
  close(): void;
}

interface LinkCodeRow {
  code: string;
  profileId: ProfileId;
  destination: string | null;
  expiresAt: number;
  redeemedPhone: string | null;
}

export function createMemoryUssdStore(): UssdStore {
  const accounts = new Map<string, UssdAccount>();
  const sessions = new Map<string, UssdSession>();
  const codes = new Map<string, LinkCodeRow>();
  const purchases = new Map<string, PurchaseRecord>();
  const rates = new Map<string, { windowStart: number; count: number }>();
  const languages = new Map<string, UssdLang>();

  return {
    getAccount(phone) {
      return accounts.get(phone) ?? null;
    },
    saveAccount(account) {
      accounts.set(account.phone, account);
    },
    getSession(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    saveSession(session) {
      sessions.set(session.sessionId, session);
    },
    deleteExpired(now) {
      for (const [id, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(id);
      }
      for (const [code, row] of codes) {
        if (row.expiresAt <= now) codes.delete(code);
      }
    },
    createLinkCode(input) {
      codes.set(input.code, {
        code: input.code,
        profileId: input.profileId,
        destination: input.destination,
        expiresAt: input.expiresAt,
        redeemedPhone: null,
      });
    },
    redeemLinkCode(code, phone, now) {
      const row = codes.get(code);
      if (!row || row.expiresAt <= now) return null;
      if (row.redeemedPhone && row.redeemedPhone !== phone) return null;
      row.redeemedPhone = phone;
      return { profileId: row.profileId, destination: row.destination };
    },
    indexPurchase(record) {
      const existing = purchases.get(record.purchaseId);
      if (!existing) {
        purchases.set(record.purchaseId, record);
        return;
      }
      purchases.set(record.purchaseId, {
        ...existing,
        status: record.status,
        amountSats: record.amountSats ?? existing.amountSats,
        amountKes: record.amountKes > 0 ? record.amountKes : existing.amountKes,
      });
    },
    updatePurchase(purchaseId, patch) {
      const existing = purchases.get(purchaseId);
      if (!existing) return;
      purchases.set(purchaseId, {
        ...existing,
        status: patch.status,
        amountSats:
          patch.amountSats === undefined ? existing.amountSats : patch.amountSats,
        amountKes:
          patch.amountKes !== undefined && patch.amountKes > 0
            ? patch.amountKes
            : existing.amountKes,
      });
    },
    latestPurchase(phone) {
      return listFor(purchases.values(), phone, 1)[0] ?? null;
    },
    listPurchases(phone, limit) {
      return listFor(purchases.values(), phone, limit);
    },
    hitRate(bucket, now, windowMs) {
      const current = rates.get(bucket);
      if (!current || now - current.windowStart >= windowMs) {
        rates.set(bucket, { windowStart: now, count: 1 });
        return 1;
      }
      current.count += 1;
      return current.count;
    },
    getLanguage(phone) {
      return languages.get(phone) ?? null;
    },
    setLanguage(phone, language) {
      languages.set(phone, language);
    },
    close() {
      accounts.clear();
      sessions.clear();
      codes.clear();
      purchases.clear();
      rates.clear();
      languages.clear();
    },
  };
}

function listFor(
  records: Iterable<PurchaseRecord>,
  phone: string,
  limit: number,
): PurchaseRecord[] {
  return [...records]
    .filter((record) => record.phone === phone)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, Math.max(0, limit));
}

export function isProfileId(value: string): value is ProfileId {
  return value === "amina" || value === "brian";
}

export function isPurchaseSource(value: string): value is PurchaseSource {
  return value === "web" || value === "ussd";
}

export function isFlow(value: string): value is UssdFlow {
  return value === "menu" || value === "link";
}
