/**
 * SQLite store for phone links, sessions, and the purchase index.
 * Node's built-in driver avoids a new database service. Postgres is not part of this app.
 * Statements and wallet keys are not written here.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  isFlow,
  isProfileId,
  isPurchaseSource,
  type NewLinkCode,
  type PurchasePatch,
  type UssdStore,
} from "./store";
import type { LinkCodeResult, PurchaseRecord, UssdAccount, UssdSession } from "./types";

const MIGRATION_001 = `
CREATE TABLE ussd_accounts (
  phone TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL CHECK (profile_id IN ('amina', 'brian')),
  destination TEXT,
  linked_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web', 'ussd'))
);

CREATE TABLE ussd_sessions (
  session_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  flow TEXT NOT NULL CHECK (flow IN ('menu', 'link')),
  last_text TEXT NOT NULL,
  last_response TEXT NOT NULL,
  purchase_id TEXT,
  closed INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_ussd_sessions_phone ON ussd_sessions(phone);
CREATE INDEX idx_ussd_sessions_expires ON ussd_sessions(expires_at);

CREATE TABLE ussd_link_codes (
  code TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL CHECK (profile_id IN ('amina', 'brian')),
  destination TEXT,
  expires_at INTEGER NOT NULL,
  redeemed_phone TEXT
);
CREATE INDEX idx_ussd_link_codes_expires ON ussd_link_codes(expires_at);

CREATE TABLE purchase_index (
  purchase_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  profile_id TEXT NOT NULL CHECK (profile_id IN ('amina', 'brian')),
  amount_kes INTEGER NOT NULL,
  amount_sats INTEGER,
  destination TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web', 'ussd')),
  created_at TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX idx_purchase_phone_created ON purchase_index(phone, created_at_ms);

CREATE TABLE rate_buckets (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
`;

export function openSqliteUssdStore(filename: string): UssdStore {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  if (filename !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  migrate(db);
  return new SqliteUssdStore(db);
}

export function migrate(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const existing = db
    .prepare("SELECT id FROM schema_migrations WHERE id = ?")
    .get("001_init");
  if (existing) return;
  db.exec("BEGIN");
  try {
    db.exec(MIGRATION_001);
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      "001_init",
      new Date().toISOString(),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

class SqliteUssdStore implements UssdStore {
  constructor(private readonly db: DatabaseSync) {}

  getAccount(phone: string): UssdAccount | null {
    const row = this.db
      .prepare(
        `SELECT phone, profile_id, destination, linked_at, source
         FROM ussd_accounts WHERE phone = ?`,
      )
      .get(phone);
    if (!row) return null;
    return accountFrom(row);
  }

  saveAccount(account: UssdAccount): void {
    this.db
      .prepare(
        `INSERT INTO ussd_accounts (phone, profile_id, destination, linked_at, source)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(phone) DO UPDATE SET
           profile_id = excluded.profile_id,
           destination = excluded.destination,
           linked_at = excluded.linked_at,
           source = excluded.source`,
      )
      .run(
        account.phone,
        account.profileId,
        account.destination,
        account.linkedAt,
        account.source,
      );
  }

  getSession(sessionId: string): UssdSession | null {
    const row = this.db
      .prepare(
        `SELECT session_id, phone, flow, last_text, last_response, purchase_id,
                closed, created_at, updated_at, expires_at
         FROM ussd_sessions WHERE session_id = ?`,
      )
      .get(sessionId);
    if (!row) return null;
    return sessionFrom(row);
  }

  saveSession(session: UssdSession): void {
    this.db
      .prepare(
        `INSERT INTO ussd_sessions (
           session_id, phone, flow, last_text, last_response, purchase_id,
           closed, created_at, updated_at, expires_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           phone = excluded.phone,
           flow = excluded.flow,
           last_text = excluded.last_text,
           last_response = excluded.last_response,
           purchase_id = excluded.purchase_id,
           closed = excluded.closed,
           updated_at = excluded.updated_at,
           expires_at = excluded.expires_at`,
      )
      .run(
        session.sessionId,
        session.phone,
        session.flow,
        session.lastText,
        session.lastResponse,
        session.purchaseId,
        session.closed ? 1 : 0,
        session.createdAt,
        session.updatedAt,
        session.expiresAt,
      );
  }

  deleteExpired(now: number): void {
    this.db.prepare("DELETE FROM ussd_sessions WHERE expires_at <= ?").run(now);
    this.db.prepare("DELETE FROM ussd_link_codes WHERE expires_at <= ?").run(now);
  }

  createLinkCode(input: NewLinkCode): void {
    this.db
      .prepare(
        `INSERT INTO ussd_link_codes (code, profile_id, destination, expires_at, redeemed_phone)
         VALUES (?, ?, ?, ?, NULL)`,
      )
      .run(input.code, input.profileId, input.destination, input.expiresAt);
  }

  redeemLinkCode(code: string, phone: string, now: number): LinkCodeResult | null {
    const row = this.db
      .prepare(
        `SELECT profile_id, destination, expires_at, redeemed_phone
         FROM ussd_link_codes WHERE code = ?`,
      )
      .get(code);
    if (!isRecord(row)) return null;
    const expiresAt = asNumber(row.expires_at);
    const redeemed = row.redeemed_phone;
    if (expiresAt <= now) return null;
    if (typeof redeemed === "string" && redeemed !== phone) return null;
    const profileId = asString(row.profile_id);
    if (!isProfileId(profileId)) return null;
    if (redeemed === null || redeemed === undefined) {
      this.db
        .prepare("UPDATE ussd_link_codes SET redeemed_phone = ? WHERE code = ?")
        .run(phone, code);
    }
    const destination = row.destination;
    return {
      profileId,
      destination: typeof destination === "string" ? destination : null,
    };
  }

  indexPurchase(record: PurchaseRecord): void {
    this.db
      .prepare(
        `INSERT INTO purchase_index (
           purchase_id, phone, profile_id, amount_kes, amount_sats, destination,
           status, source, created_at, created_at_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(purchase_id) DO UPDATE SET
           status = excluded.status,
           amount_sats = COALESCE(excluded.amount_sats, purchase_index.amount_sats),
           amount_kes = CASE
             WHEN excluded.amount_kes > 0 THEN excluded.amount_kes
             ELSE purchase_index.amount_kes
           END`,
      )
      .run(
        record.purchaseId,
        record.phone,
        record.profileId,
        record.amountKes,
        record.amountSats,
        record.destination,
        record.status,
        record.source,
        record.createdAt,
        record.createdAtMs,
      );
  }

  updatePurchase(purchaseId: string, patch: PurchasePatch): void {
    const amountKes =
      patch.amountKes !== undefined && patch.amountKes > 0 ? patch.amountKes : null;
    this.db
      .prepare(
        `UPDATE purchase_index
         SET status = ?,
             amount_sats = COALESCE(?, amount_sats),
             amount_kes = COALESCE(?, amount_kes)
         WHERE purchase_id = ?`,
      )
      .run(patch.status, patch.amountSats ?? null, amountKes, purchaseId);
  }

  latestPurchase(phone: string): PurchaseRecord | null {
    return this.listPurchases(phone, 1)[0] ?? null;
  }

  listPurchases(phone: string, limit: number): PurchaseRecord[] {
    const rows = this.db
      .prepare(
        `SELECT purchase_id, phone, profile_id, amount_kes, amount_sats, destination,
                status, source, created_at, created_at_ms
         FROM purchase_index
         WHERE phone = ?
         ORDER BY created_at_ms DESC
         LIMIT ?`,
      )
      .all(phone, limit);
    return rows.map(purchaseFrom);
  }

  hitRate(bucket: string, now: number, windowMs: number): number {
    const row = this.db
      .prepare("SELECT window_start, count FROM rate_buckets WHERE bucket = ?")
      .get(bucket);
    if (!isRecord(row) || now - asNumber(row.window_start) >= windowMs) {
      this.db
        .prepare(
          `INSERT INTO rate_buckets (bucket, window_start, count) VALUES (?, ?, 1)
           ON CONFLICT(bucket) DO UPDATE SET window_start = excluded.window_start, count = 1`,
        )
        .run(bucket, now);
      return 1;
    }
    this.db
      .prepare("UPDATE rate_buckets SET count = count + 1 WHERE bucket = ?")
      .run(bucket);
    return asNumber(row.count) + 1;
  }

  close(): void {
    this.db.close();
  }
}

function accountFrom(row: unknown): UssdAccount {
  if (!isRecord(row)) throw new Error("Bad account row");
  const profileId = asString(row.profile_id);
  const source = asString(row.source);
  if (!isProfileId(profileId) || !isPurchaseSource(source))
    throw new Error("Bad account row");
  return {
    phone: asString(row.phone),
    profileId,
    destination: typeof row.destination === "string" ? row.destination : null,
    linkedAt: asString(row.linked_at),
    source,
  };
}

function sessionFrom(row: unknown): UssdSession {
  if (!isRecord(row)) throw new Error("Bad session row");
  const flow = asString(row.flow);
  if (!isFlow(flow)) throw new Error("Bad session row");
  return {
    sessionId: asString(row.session_id),
    phone: asString(row.phone),
    flow,
    lastText: asString(row.last_text),
    lastResponse: asString(row.last_response),
    purchaseId: typeof row.purchase_id === "string" ? row.purchase_id : null,
    closed: asNumber(row.closed) === 1,
    createdAt: asNumber(row.created_at),
    updatedAt: asNumber(row.updated_at),
    expiresAt: asNumber(row.expires_at),
  };
}

function purchaseFrom(row: unknown): PurchaseRecord {
  if (!isRecord(row)) throw new Error("Bad purchase row");
  const profileId = asString(row.profile_id);
  const source = asString(row.source);
  if (!isProfileId(profileId) || !isPurchaseSource(source))
    throw new Error("Bad purchase row");
  return {
    purchaseId: asString(row.purchase_id),
    phone: asString(row.phone),
    profileId,
    amountKes: asNumber(row.amount_kes),
    amountSats: typeof row.amount_sats === "number" ? row.amount_sats : null,
    destination: asString(row.destination),
    status: asString(row.status),
    source,
    createdAt: asString(row.created_at),
    createdAtMs: asNumber(row.created_at_ms),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected text");
  return value;
}

function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Expected number");
  return value;
}
