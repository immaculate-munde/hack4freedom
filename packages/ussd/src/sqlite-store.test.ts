import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { openSqliteUssdStore } from "./sqlite-store";
import type { PurchaseRecord } from "./types";

describe("sqlite ussd store", () => {
  it("migrates once, indexes phone lookups, and keeps web and USSD purchases", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pesasense-ussd-"));
    const filename = path.join(dir, "ussd.sqlite");
    const store = openSqliteUssdStore(filename);
    store.saveAccount({
      phone: "254712345678",
      profileId: "amina",
      destination: "amina@blink.sv",
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    store.createLinkCode({
      code: "123456",
      profileId: "brian",
      destination: null,
      expiresAt: 5_000,
    });
    expect(store.redeemLinkCode("123456", "254700000111", 1_000)?.profileId).toBe(
      "brian",
    );
    expect(store.redeemLinkCode("123456", "254700000222", 1_000)).toBeNull();

    const older: PurchaseRecord = {
      purchaseId: "WEB-1",
      phone: "254712345678",
      profileId: "amina",
      amountKes: 500,
      amountSats: null,
      destination: "amina@blink.sv",
      status: "awaiting_mpesa",
      source: "web",
      createdAt: "2026-01-01T00:00:00.000Z",
      createdAtMs: 10,
    };
    const newer: PurchaseRecord = {
      ...older,
      purchaseId: "USSD-1",
      amountKes: 1500,
      source: "ussd",
      createdAtMs: 20,
    };
    store.indexPurchase(older);
    store.indexPurchase(newer);
    store.updatePurchase("WEB-1", {
      status: "filled",
      amountSats: 900,
      amountKes: 500,
    });
    expect(store.latestPurchase("254712345678")?.purchaseId).toBe("USSD-1");
    expect(store.listPurchases("254712345678", 5).map((row) => row.purchaseId)).toEqual(
      ["USSD-1", "WEB-1"],
    );
    expect(store.listPurchases("254712345678", 5)[1]?.status).toBe("filled");
    expect(store.hitRate("req:254712345678", 1_000, 60_000)).toBe(1);
    expect(store.hitRate("req:254712345678", 1_100, 60_000)).toBe(2);
    expect(store.hitRate("req:254712345678", 70_000, 60_000)).toBe(1);

    store.saveSession({
      sessionId: "session-0001",
      phone: "254712345678",
      flow: "menu",
      lastText: "",
      lastResponse: "CON PesaSense",
      purchaseId: null,
      closed: false,
      createdAt: 1,
      updatedAt: 1,
      expiresAt: 50,
    });
    store.deleteExpired(50);
    expect(store.getSession("session-0001")).toBeNull();
    store.close();

    const again = openSqliteUssdStore(filename);
    expect(again.getAccount("254712345678")?.profileId).toBe("amina");
    again.close();

    const db = new DatabaseSync(filename);
    const migrations = db.prepare("SELECT id FROM schema_migrations").all();
    expect(migrations).toEqual([{ id: "001_init" }, { id: "002_language" }]);
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'",
      )
      .all()
      .map((row) => (row as { name: string }).name)
      .sort();
    expect(indexes).toEqual([
      "idx_purchase_phone_created",
      "idx_ussd_link_codes_expires",
      "idx_ussd_sessions_expires",
      "idx_ussd_sessions_phone",
    ]);
    db.close();
  });
});
