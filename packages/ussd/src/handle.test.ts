import { describe, expect, it } from "vitest";
import { ussdConfigFromEnv, type UssdConfig } from "./config";
import { handleUssd, type UssdDeps, type UssdPurchaseInput } from "./handle";
import { ussdIdempotencyKey } from "./idempotency";
import { parseUssdBody } from "./parse-request";
import { createMemoryUssdStore, type UssdStore } from "./store";
import { USSD_SCREEN_LIMIT } from "./text";
import type { PurchaseRecord } from "./types";

const SERVICE = "*384*40401#";
const PHONE = "254712345678";
const DEST = "amina@blink.sv";

function config(overrides: Partial<UssdConfig> = {}): UssdConfig {
  return {
    provider: "africastalking",
    serviceCode: SERVICE,
    apiKey: "test-key",
    requireApiKey: true,
    sessionTtlMs: 180_000,
    maxRequestsPerMinute: 30,
    maxBuysPerHour: 3,
    ...overrides,
  };
}

function harness(store: UssdStore = createMemoryUssdStore()) {
  let now = 1_700_000_000_000;
  const purchases: UssdPurchaseInput[] = [];
  const statusCalls: string[] = [];
  let purchaseStatus = "awaiting_mpesa";
  const deps: UssdDeps = {
    now: () => now,
    store,
    async startPurchase(input) {
      purchases.push(input);
      return {
        purchaseId: "SBX-100",
        status: purchaseStatus,
        amountKes: input.amountKes,
        amountSats: 1400,
      };
    },
    async checkStatus(purchaseId) {
      statusCalls.push(purchaseId);
      const row = store.latestPurchase(PHONE);
      return {
        purchaseId,
        status: "filled",
        amountKes: row?.amountKes ?? 0,
        amountSats: 1400,
      };
    },
  };
  async function dial(
    text: string,
    extra?: { sessionId?: string; phone?: string; key?: string },
  ) {
    const result = await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId: extra?.sessionId ?? "session-0001",
          serviceCode: SERVICE,
          phoneNumber: extra?.phone ?? PHONE,
          text,
        }),
        apiKey: extra?.key === undefined ? "test-key" : extra.key,
      },
      deps,
      config(),
    );
    expect(result.body.length).toBeLessThanOrEqual(USSD_SCREEN_LIMIT);
    expect(result.body).toMatch(/^(CON|END) /);
    expect(result.body).not.toMatch(/sqlite|BITIKA|stack|Error:/i);
    return result;
  }
  return {
    dial,
    purchases,
    statusCalls,
    store,
    setNow(value: number) {
      now = value;
    },
    advance(ms: number) {
      now += ms;
    },
    setPurchaseStatus(status: string) {
      purchaseStatus = status;
    },
    deps,
  };
}

function webPurchase(store: UssdStore, amountKes: number, at: number): void {
  const record: PurchaseRecord = {
    purchaseId: "WEB-1",
    phone: PHONE,
    profileId: "amina",
    amountKes,
    amountSats: null,
    destination: DEST,
    status: "awaiting_mpesa",
    source: "web",
    createdAt: new Date(at).toISOString(),
    createdAtMs: at,
  };
  store.indexPurchase(record);
}

describe("USSD handler", () => {
  it("shows the link menu to a new number", async () => {
    const { dial } = harness();
    const result = await dial("");
    expect(result.status).toBe(200);
    expect(result.body).toContain("CON ");
    expect(result.body).toContain("1 Link with code");
    expect(result.body).toContain("2 Demo Amina");
  });

  it("links a demo profile and reads the same surplus as the web profile", async () => {
    const { dial, store } = harness();
    await dial("");
    const linked = await dial("2");
    expect(linked.body).toContain("1 Surplus");
    expect(store.getAccount(PHONE)?.profileId).toBe("amina");
    const surplus = await dial("2*1");
    expect(surplus.body).toContain("END ");
    expect(surplus.body).toContain("KES 2,000");
    expect(surplus.body).toContain("11,500");
    expect(surplus.body).toContain("15,500");
  });

  it("refuses Brian's buy with the buffer rule", async () => {
    const { dial, purchases } = harness();
    await dial("");
    await dial("3");
    const refused = await dial("3*3");
    expect(refused.body).toContain("buffer");
    expect(purchases).toHaveLength(0);
  });

  it("shows habit, learn, and chama from the profile", async () => {
    const { dial } = harness();
    await dial("");
    await dial("2");
    const habit = await dial("2*2");
    expect(habit.body).toContain("KES 1,500 monthly");
    expect(habit.body).toContain("75%");

    await dial("", { sessionId: "session-learn" });
    const learn = await dial("5", { sessionId: "session-learn" });
    expect(learn.body).toContain("CON ");
    expect(learn.body).toContain("What is Bitcoin");
    expect((await dial("5*1", { sessionId: "session-learn" })).body).toContain(
      "hold yourself",
    );

    await dial("", { sessionId: "session-chama" });
    const chama = await dial("6", { sessionId: "session-chama" });
    expect(chama.body).toContain("Chama Sisters");
    expect(chama.body).toContain("holds no sats");
  });

  it("buys only after an explicit confirm and stores it for the web app", async () => {
    const { dial, purchases, store } = harness();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    await dial("");
    expect((await dial("3")).body).toContain("Enter amount");
    expect((await dial("3*1500")).body).toContain("1 Confirm");
    expect((await dial("3*1500")).body).toContain(DEST);
    const bought = await dial("3*1500*1");
    expect(bought.body).toContain("M-Pesa prompt sent");
    expect(bought.body).toContain("SBX-100");
    expect(purchases).toEqual([
      {
        amountKes: 1500,
        phone: PHONE,
        destination: DEST,
        approvedByUser: true,
        idempotencyKey: ussdIdempotencyKey("session-0001", 1500),
        profileId: "amina",
      },
    ]);
    const saved = store.listPurchases(PHONE, 5);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.source).toBe("ussd");
    expect(saved[0]?.amountKes).toBe(1500);
  });

  it("does not buy on cancel, a bad amount, or a missing Lightning address", async () => {
    const { dial, purchases, store } = harness();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    await dial("");
    expect((await dial("3*1500*2")).body).toContain("Cancelled");
    await dial("", { sessionId: "session-0002" });
    expect((await dial("3*9", { sessionId: "session-0002" })).body).toContain(
      "between 10 and 2000",
    );
    expect(purchases).toHaveLength(0);

    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: "amina@walletdemo.invalid",
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    await dial("", { sessionId: "session-0003" });
    const blocked = await dial("3*1500", { sessionId: "session-0003" });
    expect(blocked.body).toContain("Lightning address");
    expect(purchases).toHaveLength(0);
  });

  it("returns the cached screen for a duplicate and does not collect twice", async () => {
    const { dial, purchases, store } = harness();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    await dial("");
    await dial("3*1500");
    const first = await dial("3*1500*1");
    const second = await dial("3*1500*1");
    expect(second.body).toBe(first.body);
    expect(purchases).toHaveLength(1);
  });

  it("serialises concurrent retries of the same confirm", async () => {
    const { dial, purchases, store } = harness();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    await dial("");
    await dial("3*1500");
    const [left, right] = await Promise.all([dial("3*1500*1"), dial("3*1500*1")]);
    expect(left.body).toBe(right.body);
    expect(purchases).toHaveLength(1);
  });

  it("shows a web purchase and refreshes it through the same status call", async () => {
    const { dial, statusCalls, store, setNow } = harness();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    webPurchase(store, 800, 1_700_000_000_000);
    await dial("");
    const listed = await dial("4");
    expect(listed.body).toContain("KES 800");
    expect(listed.body).toContain("Waiting for M-Pesa PIN");
    setNow(1_700_000_000_500);
    const refreshed = await dial("4*1");
    expect(statusCalls).toEqual(["WEB-1"]);
    expect(refreshed.body).toContain("Filled");
    expect(store.latestPurchase(PHONE)?.status).toBe("filled");
    expect(store.latestPurchase(PHONE)?.source).toBe("web");
  });

  it("redeems a link code and rejects a bad, expired, or reused code", async () => {
    const { dial, store, advance } = harness();
    store.createLinkCode({
      code: "123456",
      profileId: "amina",
      destination: DEST,
      expiresAt: 1_700_000_000_000 + 60_000,
    });
    await dial("");
    const linked = await dial("1*123456");
    expect(linked.body).toContain("1 Surplus");
    expect(store.getAccount(PHONE)?.destination).toBe(DEST);
    expect((await dial("1*123456*1")).body).toContain("KES 2,000");

    const other = harness(store);
    await other.dial("", { sessionId: "session-0099", phone: "254700000111" });
    const stolen = await other.dial("1*123456", {
      sessionId: "session-0099",
      phone: "254700000111",
    });
    expect(stolen.body).toContain("not recognised");

    store.createLinkCode({
      code: "654321",
      profileId: "brian",
      destination: null,
      expiresAt: 1_700_000_000_000 + 1_000,
    });
    advance(5_000);
    const freshPhone = "254733333333";
    await dial("", { sessionId: "session-0008", phone: freshPhone });
    const expired = await dial("1*654321", {
      sessionId: "session-0008",
      phone: freshPhone,
    });
    expect(expired.body).toContain("not recognised");
  });

  it("ends an unknown, expired, or mismatched session", async () => {
    const { dial, store, advance } = harness();
    const orphan = await dial("1");
    expect(orphan.body).toContain("Session expired");
    expect(store.getSession("session-0001")).toBeNull();

    await dial("", { sessionId: "session-0002" });
    advance(181_000);
    const expired = await dial("1", { sessionId: "session-0002" });
    expect(expired.body).toContain("Session expired");

    await dial("", { sessionId: "session-0003" });
    const mismatch = await dial("1", {
      sessionId: "session-0003",
      phone: "0712000000",
    });
    expect(mismatch.body).toContain("does not match");
  });

  it("rejects a bad key, the wrong short code, and malformed input", async () => {
    const { deps, store } = harness();
    const denied = await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId: "session-0001",
          serviceCode: SERVICE,
          phoneNumber: PHONE,
          text: "",
        }),
        apiKey: "nope",
      },
      deps,
      config(),
    );
    expect(denied.status).toBe(401);

    const wrongCode = await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId: "session-0001",
          serviceCode: "*100#",
          phoneNumber: PHONE,
          text: "",
        }),
        apiKey: "test-key",
      },
      deps,
      config(),
    );
    expect(wrongCode.body).toContain("Wrong short code");

    for (const [index, liveCode] of ["*384*65246#", "*789*12350#"].entries()) {
      const live = await handleUssd(
        {
          contentType: "application/json",
          bodyText: JSON.stringify({
            sessionId: `session-live-${index}`,
            serviceCode: liveCode,
            phoneNumber: PHONE,
            text: "",
          }),
          apiKey: "test-key",
        },
        deps,
        config(),
      );
      expect(live.body).toContain("Welcome to PesaSense");
      expect(live.body).not.toContain("Wrong short code");
    }

    const form = await handleUssd(
      {
        contentType: "application/x-www-form-urlencoded",
        bodyText: new URLSearchParams({
          sessionId: "session-form1",
          serviceCode: SERVICE,
          phoneNumber: "0712345678",
          text: "",
        }).toString(),
        apiKey: "test-key",
      },
      deps,
      config(),
    );
    expect(form.body).toContain("Link with code");
    expect(store.getSession("session-form1")?.phone).toBe(PHONE);

    const garbage = await handleUssd(
      { contentType: "application/json", bodyText: "{", apiKey: "test-key" },
      deps,
      config(),
    );
    expect(garbage.body).toContain("Could not read");
  });

  it("rate limits repeats and buy attempts", async () => {
    const store = createMemoryUssdStore();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    const limited = harness(store);
    const tight = config({ maxRequestsPerMinute: 2 });
    async function once(sessionId: string) {
      return handleUssd(
        {
          contentType: "application/json",
          bodyText: JSON.stringify({
            sessionId,
            serviceCode: SERVICE,
            phoneNumber: PHONE,
            text: "",
          }),
          apiKey: "test-key",
        },
        limited.deps,
        tight,
      );
    }
    await once("session-a");
    await once("session-b");
    const blocked = await once("session-c");
    expect(blocked.body).toContain("Too many tries");

    const buyer = harness();
    buyer.store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    const buying = config({ maxBuysPerHour: 1 });
    async function buy(sessionId: string) {
      await handleUssd(
        {
          contentType: "application/json",
          bodyText: JSON.stringify({
            sessionId,
            serviceCode: SERVICE,
            phoneNumber: PHONE,
            text: "",
          }),
          apiKey: "test-key",
        },
        buyer.deps,
        buying,
      );
      return handleUssd(
        {
          contentType: "application/json",
          bodyText: JSON.stringify({
            sessionId,
            serviceCode: SERVICE,
            phoneNumber: PHONE,
            text: "3*1500*1",
          }),
          apiKey: "test-key",
        },
        buyer.deps,
        buying,
      );
    }
    expect((await buy("session-buy-1")).body).toContain("M-Pesa prompt");
    expect((await buy("session-buy-2")).body).toContain("Buy limit");
    expect(buyer.purchases).toHaveLength(1);
  });

  it("hides an upstream failure from the handset", async () => {
    const store = createMemoryUssdStore();
    store.saveAccount({
      phone: PHONE,
      profileId: "amina",
      destination: DEST,
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "web",
    });
    let now = 1_700_000_000_000;
    const deps: UssdDeps = {
      now: () => now,
      store,
      async startPurchase() {
        now += 1;
        throw new Error("Bitika request failed (500): phone 254712345678");
      },
      async checkStatus() {
        throw new Error("down");
      },
    };
    await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId: "session-err",
          serviceCode: SERVICE,
          phoneNumber: PHONE,
          text: "",
        }),
        apiKey: "test-key",
      },
      deps,
      config(),
    );
    const failed = await handleUssd(
      {
        contentType: "application/json",
        bodyText: JSON.stringify({
          sessionId: "session-err",
          serviceCode: SERVICE,
          phoneNumber: PHONE,
          text: "3*1500*1",
        }),
        apiKey: "test-key",
      },
      deps,
      config(),
    );
    expect(failed.body).toContain("Could not start the buy");
    expect(failed.body).not.toContain("254712345678");
    expect(failed.body).not.toContain("Bitika");
  });

  it("fails closed in production when the key is missing", () => {
    const parsed = ussdConfigFromEnv({}, "production");
    expect(parsed.requireApiKey).toBe(true);
    expect(parsed.apiKey).toBeNull();
    expect(
      ussdConfigFromEnv({ USSD_SERVICE_CODE: SERVICE }, "development").serviceCode,
    ).toBe(SERVICE);
  });
});

describe("request parsing", () => {
  it("reads an Africa's Talking form body and a JSON body", () => {
    const form = parseUssdBody(
      "application/x-www-form-urlencoded",
      "sessionId=abc12345&serviceCode=%2A384%2A40401%23&phoneNumber=254712345678&text=1*2",
    );
    expect(form).toEqual({
      sessionId: "abc12345",
      serviceCode: SERVICE,
      phoneNumber: PHONE,
      text: "1*2",
    });
    const json = parseUssdBody(
      "application/json",
      JSON.stringify({
        session_id: "abc12345",
        service_code: SERVICE,
        msisdn: PHONE,
        text: "",
      }),
    );
    expect(json.phoneNumber).toBe(PHONE);
    expect(json.text).toBe("");
  });

  it("rejects a body that is not a gateway request", () => {
    expect(() => parseUssdBody("application/json", "[]")).toThrow(/read/i);
    expect(() => parseUssdBody("text/plain", "hello")).toThrow(/read/i);
  });
});
