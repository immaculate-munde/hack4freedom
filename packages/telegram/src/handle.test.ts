import { demoProfiles } from "@pesasense/core";
import { describe, expect, it } from "vitest";
import { telegramConfigFromEnv } from "./config";
import { handleTelegram, type TelegramDeps } from "./handle";
import { habitPercentOfFloor, profileSummary } from "./summary";
import { createMemoryTelegramStore } from "./store";
import type { TelegramPurchaseInput } from "./types";

function config() {
  return telegramConfigFromEnv({
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_SESSION_TTL_SECONDS: "3600",
  });
}

function harness() {
  const store = createMemoryTelegramStore();
  const purchases: TelegramPurchaseInput[] = [];
  let bitika = true;
  let now = 1_700_000_000_000;
  const deps: TelegramDeps = {
    now: () => now,
    store,
    buildFromSms() {
      return structuredClone(demoProfiles.amina);
    },
    async buildFromPdf() {
      return structuredClone(demoProfiles.amina);
    },
    async downloadFile() {
      return new Uint8Array([1, 2, 3]);
    },
    async startPurchase(input) {
      purchases.push(input);
      return {
        purchaseId: "TG-100",
        status: "awaiting_mpesa",
        amountKes: input.amountKes,
        amountSats: 1400,
      };
    },
    bitikaConfigured: () => bitika,
    newIdempotencyKey: () => "idem-1",
  };

  async function send(
    chatId: number,
    inbound: Parameters<typeof handleTelegram>[1],
  ) {
    return handleTelegram(chatId, inbound, deps, config());
  }

  return {
    send,
    purchases,
    store,
    setBitika(value: boolean) {
      bitika = value;
    },
    advance(ms: number) {
      now += ms;
    },
  };
}

describe("telegram handle", () => {
  it("explains honest upload privacy on /start", async () => {
    const h = harness();
    const result = await h.send(1, { kind: "command", command: "/start", args: "" });
    const text = result.replies.map((r) => r.text).join("\n");
    expect(text).toMatch(/leaves your phone/i);
    expect(text).not.toMatch(/never leave your phone/i);
    expect(text).toMatch(/approve every purchase/i);
    expect(text).toMatch(/never auto-send/i);
  });

  it("skips questions and accepts demo Amina", async () => {
    const h = harness();
    await h.send(7, { kind: "command", command: "/start", args: "" });
    await h.send(7, { kind: "callback", data: "skip" });
    await h.send(7, { kind: "callback", data: "skip" });
    await h.send(7, { kind: "callback", data: "skip" });
    const result = await h.send(7, { kind: "callback", data: "demo:amina" });
    const text = result.replies.map((r) => r.text).join("\n");
    expect(text).toMatch(/Surplus floor/);
    expect(text).toMatch(/1,500/);
    expect(text).toMatch(/75%/);
    const session = h.store.getSession(7);
    expect(session?.profile?.investmentPlan?.amountKes).toBe(1500);
  });

  it("asks for debt name and amount on Yes, then continues to chama", async () => {
    const h = harness();
    await h.send(8, { kind: "command", command: "/start", args: "" });
    const yes = await h.send(8, { kind: "callback", data: "debt:yes" });
    expect(yes.replies.map((r) => r.text).join("\n")).toMatch(/What do you call this debt/i);
    expect(yes.replies.map((r) => r.text).join("\n")).not.toMatch(/web app/i);
    expect(h.store.getSession(8)?.step).toBe("ask_debt_name");

    const named = await h.send(8, { kind: "text", text: "Fuliza" });
    expect(named.replies[0]?.text).toMatch(/Noted: Fuliza/i);
    expect(named.replies[0]?.text).toMatch(/whole KES/i);
    expect(h.store.getSession(8)?.onboarding.debts).toEqual([
      { label: "Fuliza", balanceKes: 0 },
    ]);
    expect(h.store.getSession(8)?.step).toBe("ask_debt_amount");

    const amount = await h.send(8, { kind: "text", text: "12000" });
    expect(amount.replies.map((r) => r.text).join("\n")).toMatch(/Noted: Fuliza — KES 12,000/i);
    expect(amount.replies.map((r) => r.text).join("\n")).toMatch(/chama/i);
    expect(h.store.getSession(8)?.onboarding.debts).toEqual([
      { label: "Fuliza", balanceKes: 12000 },
    ]);
    expect(h.store.getSession(8)?.step).toBe("ask_chama");
  });

  it("allows Skip on debt name without forcing the web app", async () => {
    const h = harness();
    await h.send(9, { kind: "command", command: "/start", args: "" });
    await h.send(9, { kind: "callback", data: "debt:yes" });
    const skipped = await h.send(9, { kind: "callback", data: "skip" });
    const text = skipped.replies.map((r) => r.text).join("\n");
    expect(text).not.toMatch(/web app/i);
    expect(text).toMatch(/chama/i);
    expect(h.store.getSession(9)?.onboarding.debts).toEqual([]);
    expect(h.store.getSession(9)?.step).toBe("ask_chama");
  });

  it("allows Skip on debt amount and keeps the name with balance 0", async () => {
    const h = harness();
    await h.send(10, { kind: "command", command: "/start", args: "" });
    await h.send(10, { kind: "callback", data: "debt:yes" });
    await h.send(10, { kind: "text", text: "School fees" });
    const skipped = await h.send(10, { kind: "callback", data: "skip" });
    expect(skipped.replies.map((r) => r.text).join("\n")).toMatch(/chama/i);
    expect(h.store.getSession(10)?.onboarding.debts).toEqual([
      { label: "School fees", balanceKes: 0 },
    ]);
    expect(h.store.getSession(10)?.step).toBe("ask_chama");
  });

  it("caps habit at the surplus floor and saves reminder without purchasing", async () => {
    const h = harness();
    await h.send(2, { kind: "command", command: "/start", args: "" });
    for (let i = 0; i < 3; i += 1) {
      await h.send(2, { kind: "callback", data: "skip" });
    }
    await h.send(2, { kind: "callback", data: "demo:amina" });
    await h.send(2, { kind: "callback", data: "habit" });
    const tooHigh = await h.send(2, { kind: "text", text: "2500" });
    expect(tooHigh.replies[0]?.text).toMatch(/above the safe floor/i);
    await h.send(2, { kind: "text", text: "1500" });
    await h.send(2, { kind: "callback", data: "cadence:monthly" });
    const remind = await h.send(2, { kind: "callback", data: "remind" });
    expect(remind.replies[0]?.text).toMatch(/Reminder set for the 1st/);
    expect(h.purchases).toHaveLength(0);
    expect(h.store.getSession(2)?.reminder?.amountKes).toBe(1500);
  });

  it("never purchases without Approve and stops when Bitika is missing", async () => {
    const h = harness();
    await h.send(3, { kind: "command", command: "/start", args: "" });
    for (let i = 0; i < 3; i += 1) {
      await h.send(3, { kind: "callback", data: "skip" });
    }
    await h.send(3, { kind: "callback", data: "demo:amina" });
    h.setBitika(false);
    const missing = await h.send(3, { kind: "callback", data: "invest" });
    expect(missing.replies[0]?.text).toMatch(/BITIKA_API_KEY/);
    expect(h.purchases).toHaveLength(0);

    h.setBitika(true);
    await h.send(3, { kind: "callback", data: "invest" });
    await h.send(3, { kind: "text", text: "0712345678" });
    await h.send(3, { kind: "callback", data: "dest:bitcoincke" });
    expect(h.purchases).toHaveLength(0);
    const approved = await h.send(3, { kind: "callback", data: "approve" });
    expect(h.purchases).toHaveLength(1);
    expect(h.purchases[0]?.approvedByUser).toBe(true);
    expect(h.purchases[0]?.amountKes).toBe(1500);
    expect(approved.replies[0]?.text).toMatch(/Purchase started/);
  });

  it("refuses auto-approve before confirm step", async () => {
    const h = harness();
    await h.send(4, { kind: "command", command: "/start", args: "" });
    for (let i = 0; i < 3; i += 1) {
      await h.send(4, { kind: "callback", data: "skip" });
    }
    await h.send(4, { kind: "callback", data: "demo:amina" });
    const early = await h.send(4, { kind: "callback", data: "approve" });
    expect(early.replies[0]?.text).toMatch(/Approve only from the confirm step|Missing purchase/);
    expect(h.purchases).toHaveLength(0);
  });
});

describe("telegram summary", () => {
  it("shows Amina habit as 75% of floor", () => {
    const profile = demoProfiles.amina;
    const floor = profile.surplus.monthlyKes.floor;
    const habit = profile.investmentPlan?.amountKes ?? 0;
    expect(habitPercentOfFloor(habit, floor)).toBe(75);
    expect(profileSummary(profile)).toMatch(/75% of the safe floor/);
  });

  it("says buffer-first for Brian with no invent invest", () => {
    const text = profileSummary(demoProfiles.brian);
    expect(text).toMatch(/buffer comes first/i);
    expect(demoProfiles.brian.investmentPlan).toBeUndefined();
  });
});
