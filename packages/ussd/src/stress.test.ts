/**
 * Overlapping sessions, gateway retries, and the buy cap.
 * One Node process, same as the Next.js server. The lock and the rate
 * bucket have to hold when many handsets reply at once.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { UssdConfig } from "./config";
import { handleUssd, type UssdDeps, type UssdPurchaseInput } from "./handle";
import { openSqliteUssdStore } from "./sqlite-store";
import { createMemoryUssdStore, type UssdStore } from "./store";
import { USSD_SCREEN_LIMIT } from "./text";

const SERVICE = "*384*40401#";
const DEST = "amina@blink.sv";

function phoneFor(index: number): string {
  return `2547${String(10000000 + index).slice(0, 8)}`;
}

function config(overrides: Partial<UssdConfig> = {}): UssdConfig {
  return {
    provider: "africastalking",
    serviceCode: SERVICE,
    apiKey: "test-key",
    requireApiKey: true,
    sessionTtlMs: 180_000,
    maxRequestsPerMinute: 500,
    maxBuysPerHour: 3,
    ...overrides,
  };
}

function harness(store: UssdStore, purchaseDelayMs = 0) {
  let now = 1_700_000_000_000;
  const purchases: UssdPurchaseInput[] = [];
  const deps: UssdDeps = {
    now: () => now,
    store,
    log() {},
    async startPurchase(input) {
      if (purchaseDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, purchaseDelayMs));
      }
      purchases.push(input);
      return {
        purchaseId: `SBX-${purchases.length}`,
        status: "awaiting_mpesa",
        amountKes: input.amountKes,
      };
    },
    async checkStatus(purchaseId) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { purchaseId, status: "filled", amountKes: 1500, amountSats: 1400 };
    },
  };

  async function dial(sessionId: string, text: string, phone = phoneFor(0)) {
    const result = await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId,
          serviceCode: SERVICE,
          phoneNumber: phone,
          text,
        }),
        apiKey: "test-key",
      },
      deps,
      config(),
    );
    expect(result.status).toBe(200);
    expect(result.body.length).toBeLessThanOrEqual(USSD_SCREEN_LIMIT);
    expect(result.body).toMatch(/^(CON|END) /);
    expect(result.body).not.toMatch(/sqlite|stack|BITIKA_API_KEY/i);
    return result;
  }

  return { dial, purchases, store, deps };
}

function linkAmina(store: UssdStore, phone: string) {
  store.saveAccount({
    phone,
    profileId: "amina",
    destination: DEST,
    linkedAt: "2026-01-01T00:00:00.000Z",
    source: "web",
  });
}

describe("USSD stress", () => {
  it("collapses a burst of retries for one confirm into a single collect", async () => {
    const { dial, purchases, store } = harness(createMemoryUssdStore(), 20);
    const phone = phoneFor(0);
    linkAmina(store, phone);
    await dial("retry-session", "");
    await dial("retry-session", "3*1500");
    const burst = await Promise.all(
      Array.from({ length: 40 }, () => dial("retry-session", "3*1500*1")),
    );
    expect(new Set(burst.map((result) => result.body)).size).toBe(1);
    expect(burst[0]?.body).toContain("M-Pesa prompt sent");
    expect(purchases).toHaveLength(1);
    expect(store.listPurchases(phone, 10)).toHaveLength(1);
  });

  it("lets many handsets read surplus at the same time", async () => {
    const { dial } = harness(createMemoryUssdStore());
    const results = await Promise.all(
      Array.from({ length: 30 }, async (_, index) => {
        const phone = phoneFor(index + 1);
        const sessionId = `surplus-${index}`;
        await dial(sessionId, "", phone);
        await dial(sessionId, "2", phone);
        return dial(sessionId, "2*1", phone);
      }),
    );
    expect(results).toHaveLength(30);
    for (const result of results) {
      expect(result.body).toContain("KES 2,000");
      expect(result.body).toContain("11,500");
    }
  });

  it("stops a buy stampede at the hourly cap", async () => {
    const store = createMemoryUssdStore();
    const phone = phoneFor(50);
    linkAmina(store, phone);
    const { dial, purchases } = harness(store, 15);
    const sessionIds = Array.from(
      { length: 12 },
      (_, index) => `buycap-${String(index).padStart(2, "0")}`,
    );
    await Promise.all(sessionIds.map((sessionId) => dial(sessionId, "", phone)));
    const results = await Promise.all(
      sessionIds.map((sessionId) => dial(sessionId, "3*1500*1", phone)),
    );
    const sent = results.filter((result) => result.body.includes("M-Pesa prompt sent"));
    const limited = results.filter((result) => result.body.includes("Buy limit"));
    expect(sent).toHaveLength(3);
    expect(limited).toHaveLength(9);
    expect(purchases).toHaveLength(3);
    expect(store.listPurchases(phone, 20)).toHaveLength(3);
  });

  it("keeps the same caps when the store is SQLite", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pesasense-ussd-stress-"));
    const store = openSqliteUssdStore(path.join(dir, "ussd.sqlite"));
    const phone = phoneFor(60);
    linkAmina(store, phone);
    const { dial, purchases } = harness(store, 10);
    try {
      const sessionIds = Array.from({ length: 8 }, (_, index) => `sql-buy-${index}`);
      await Promise.all(sessionIds.map((sessionId) => dial(sessionId, "", phone)));
      const confirms = await Promise.all(
        sessionIds.map((sessionId) => dial(sessionId, "3*1500*1", phone)),
      );
      expect(
        confirms.filter((result) => result.body.includes("M-Pesa prompt sent")),
      ).toHaveLength(3);
      expect(purchases).toHaveLength(3);
      expect(store.listPurchases(phone, 20)).toHaveLength(3);

      await dial("sql-status", "", phone);
      const refreshes = await Promise.all(
        Array.from({ length: 10 }, () => dial("sql-status", "4*1", phone)),
      );
      expect(refreshes.every((result) => result.body.includes("Filled"))).toBe(true);
      expect(store.latestPurchase(phone)?.status).toBe("filled");
    } finally {
      store.close();
    }
  });

  it("answers a burst of bad gateway bodies without throwing", async () => {
    const store = createMemoryUssdStore();
    const deps: UssdDeps = {
      now: () => 1_700_000_000_000,
      store,
      log() {},
      async startPurchase() {
        throw new Error("should not collect");
      },
      async checkStatus() {
        throw new Error("should not check");
      },
    };
    const bodies = [
      "{",
      "",
      "sessionId=short",
      JSON.stringify({ sessionId: "bad", phoneNumber: "0712", text: "" }),
      JSON.stringify({
        sessionId: "session-bad-1",
        serviceCode: SERVICE,
        phoneNumber: "not-a-phone",
        text: "hello",
      }),
    ];
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        handleUssd(
          {
            contentType: index % 2 === 0 ? "application/json" : "text/plain",
            bodyText: bodies[index % bodies.length] ?? "",
            apiKey: "test-key",
          },
          deps,
          config(),
        ),
      ),
    );
    expect(results).toHaveLength(100);
    for (const result of results) {
      expect(result.body.startsWith("END ")).toBe(true);
      expect(result.status).toBe(200);
    }
  });
});
