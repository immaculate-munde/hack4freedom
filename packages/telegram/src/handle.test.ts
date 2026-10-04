import { demoProfiles } from "@pesasense/core";
import { describe, expect, it } from "vitest";
import { telegramConfigFromEnv } from "./config";
import { handleTelegram, type TelegramDeps } from "./handle";
import {
  habitPercentOfFloor,
  largestPaymentsText,
  profileSummary,
} from "./summary";
import { createMemoryTelegramStore } from "./store";
import type { TelegramPurchaseInput, TelegramReply } from "./types";

function config() {
  return telegramConfigFromEnv({
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_SESSION_TTL_SECONDS: "3600",
  });
}

function harness(options?: {
  buildFromPdf?: TelegramDeps["buildFromPdf"];
}) {
  const store = createMemoryTelegramStore();
  const purchases: TelegramPurchaseInput[] = [];
  let bitika = true;
  let now = 1_700_000_000_000;
  const pdfPasswords: string[] = [];
  const deps: TelegramDeps = {
    now: () => now,
    store,
    buildFromSms() {
      return structuredClone(demoProfiles.amina);
    },
    async buildFromPdf(_bytes, password, _onboarding) {
      pdfPasswords.push(password);
      if (options?.buildFromPdf) {
        return options.buildFromPdf(_bytes, password, _onboarding);
      }
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

  /** /start then choose the investment / habit path via reply-keyboard label. */
  async function startHabit(chatId: number) {
    await send(chatId, { kind: "command", command: "/start", args: "" });
    return send(chatId, { kind: "text", text: "Start a small habit" });
  }

  async function reachImport(chatId: number) {
    await startHabit(chatId);
    for (let i = 0; i < 3; i += 1) {
      await send(chatId, { kind: "text", text: "Skip" });
    }
  }

  return {
    send,
    startHabit,
    reachImport,
    purchases,
    pdfPasswords,
    store,
    setBitika(value: boolean) {
      bitika = value;
    },
    advance(ms: number) {
      now += ms;
    },
  };
}

/** Labels from reply keyboards (preferred) or legacy inline buttons. */
function buttonLabels(result: { replies: TelegramReply[] }) {
  return result.replies.flatMap((r) => {
    if (r.replyKeyboard) return r.replyKeyboard.flat();
    return (r.buttons ?? []).flatMap((row) => row.map((b) => b.text));
  });
}

function allText(result: { replies: { text: string }[] }) {
  return result.replies.map((r) => r.text).join("\n");
}

function firstBody(result: { replies: { text: string }[] }) {
  return result.replies[0]?.text ?? "";
}

describe("telegram handle", () => {
  it("shows path menu after /start with honest privacy", async () => {
    const h = harness();
    const result = await h.send(1, { kind: "command", command: "/start", args: "" });
    const text = result.replies.map((r) => r.text).join("\n");
    expect(text).toMatch(/leaves your phone/i);
    expect(text).not.toMatch(/never leave your phone/i);
    expect(text).toMatch(/approve every purchase/i);
    expect(text).toMatch(/never auto-send/i);
    expect(buttonLabels(result)).toEqual([
      "Start a small habit",
      "Learn about Bitcoin",
    ]);
    expect(result.replies[0]?.replyKeyboard).toBeDefined();
    expect(h.store.getSession(1)?.step).toBe("menu");
    expect(h.purchases).toHaveLength(0);
  });

  it("/start resets to the menu from mid-flow", async () => {
    const h = harness();
    await h.startHabit(11);
    expect(h.store.getSession(11)?.step).toBe("ask_debt");
    const again = await h.send(11, { kind: "command", command: "/start", args: "" });
    expect(h.store.getSession(11)?.step).toBe("menu");
    expect(buttonLabels(again)).toContain("Learn about Bitcoin");
  });

  it("/help mentions both paths", async () => {
    const h = harness();
    await h.send(12, { kind: "command", command: "/start", args: "" });
    const help = await h.send(12, { kind: "command", command: "/help", args: "" });
    const text = help.replies.map((r) => r.text).join("\n");
    expect(text).toMatch(/Start a small habit/i);
    expect(text).toMatch(/Learn about Bitcoin/i);
    expect(text).toMatch(/no statement/i);
  });

  it("treats reply-keyboard labels as user text with no bot echo", async () => {
    const h = harness();
    await h.send(30, { kind: "command", command: "/start", args: "" });
    const started = await h.send(30, { kind: "text", text: "Start a small habit" });
    expect(allText(started)).not.toMatch(/You chose:/);
    expect(started.callbackAnswerText).toBeUndefined();
    expect(allText(started)).toMatch(/optional questions/i);
    expect(buttonLabels(started)).toEqual(["Yes", "No", "Skip"]);

    const yes = await h.send(30, { kind: "text", text: "Yes" });
    expect(allText(yes)).not.toMatch(/You chose:/);
    expect(firstBody(yes)).toMatch(/What do you call this debt/i);
  });

  it("Start a small habit enters the existing debt → import flow", async () => {
    const h = harness();
    const started = await h.startHabit(7);
    expect(allText(started)).toMatch(/optional questions/i);
    expect(h.store.getSession(7)?.step).toBe("ask_debt");
    await h.send(7, { kind: "text", text: "Skip" });
    await h.send(7, { kind: "text", text: "Skip" });
    await h.send(7, { kind: "text", text: "Skip" });
    const result = await h.send(7, { kind: "text", text: "Demo Amina (labeled demo)" });
    const text = allText(result);
    expect(text).not.toMatch(/You chose:/);
    expect(text).toMatch(/Demo data/);
    expect(text).toMatch(/Safe surplus/i);
    expect(text).toMatch(/1,500/);
    expect(text).toMatch(/75%/);
    expect(text).toMatch(/Largest regular payments/i);
    expect(text).toMatch(/Greenview Apartments/);
    expect(buttonLabels(result)).toContain("Set habit");
    expect(buttonLabels(result)).toContain("Make your first transaction today");
    expect(buttonLabels(result)).toContain("Remind me on the 1st");
    expect(buttonLabels(result)).toContain("Show breakdown");
    expect(buttonLabels(result)).not.toContain("Review investment");
    const session = h.store.getSession(7);
    expect(session?.profile?.investmentPlan?.amountKes).toBe(1500);
  });

  it("asks for PDF password, retries wrong PIN without re-upload, then opens", async () => {
    let attempts = 0;
    const h = harness({
      async buildFromPdf(_bytes, password) {
        attempts += 1;
        if (password !== "demo-statement") {
          throw new Error(
            "Could not open the PDF. Check the statement password and try again.",
          );
        }
        return structuredClone(demoProfiles.amina);
      },
    });
    await h.reachImport(50);
    const uploaded = await h.send(50, {
      kind: "document",
      fileId: "pdf-file-1",
      fileName: "amina-statement.pdf",
      mimeType: "application/pdf",
    });
    expect(allText(uploaded)).toMatch(
      /Enter the password for this M-Pesa statement PDF/i,
    );
    expect(allText(uploaded)).toMatch(/demo-statement/);
    expect(allText(uploaded)).toMatch(/never your national ID/i);
    expect(buttonLabels(uploaded)).toContain("Skip (no password)");
    expect(h.store.getSession(50)?.step).toBe("awaiting_pdf_password");
    expect(h.store.getSession(50)?.pendingPdfFileId).toBe("pdf-file-1");

    const wrong = await h.send(50, { kind: "text", text: "wrong-pin" });
    expect(allText(wrong)).toMatch(/did not open the PDF/i);
    expect(allText(wrong)).toMatch(
      /Enter the password for this M-Pesa statement PDF/i,
    );
    expect(h.store.getSession(50)?.step).toBe("awaiting_pdf_password");
    expect(h.store.getSession(50)?.pendingPdfFileId).toBe("pdf-file-1");
    expect(attempts).toBe(1);

    const ok = await h.send(50, { kind: "text", text: "demo-statement" });
    expect(allText(ok)).toMatch(/Safe surplus/i);
    expect(allText(ok)).toMatch(/Named commitments/i);
    expect(h.store.getSession(50)?.step).toBe("ready");
    expect(h.store.getSession(50)?.pendingPdfFileId).toBeNull();
    expect(h.pdfPasswords).toEqual(["wrong-pin", "demo-statement"]);
    expect(attempts).toBe(2);
  });

  it("SMS paste imports without asking for a PDF password", async () => {
    const h = harness();
    await h.reachImport(51);
    const pasted = await h.send(51, {
      kind: "text",
      text: [
        "ABC123 Confirmed. Ksh1,000.00 received from JOHN 07XXXXXXXX on 1/4/26.",
        "",
        "DEF456 Confirmed. Ksh500.00 sent to JANE 07XXXXXXXX on 2/4/26 at 10:00 AM. New M-Pesa balance is Ksh2,000.",
      ].join("\n"),
    });
    expect(allText(pasted)).not.toMatch(/statement PDF/i);
    expect(allText(pasted)).toMatch(/Safe surplus|Here is the picture/i);
    expect(h.store.getSession(51)?.step).toBe("ready");
    expect(h.pdfPasswords).toHaveLength(0);
  });

  it("Learn about Bitcoin educates without statement or purchase", async () => {
    const h = harness();
    await h.send(20, { kind: "command", command: "/start", args: "" });
    const page0 = await h.send(20, { kind: "text", text: "Learn about Bitcoin" });
    expect(h.store.getSession(20)?.step).toBe("learn");
    expect(h.store.getSession(20)?.learnPage).toBe(0);
    expect(allText(page0)).not.toMatch(/You chose:/);
    expect(firstBody(page0)).toMatch(/small Bitcoin habit/i);
    expect(firstBody(page0)).toMatch(/monthly/i);
    expect(firstBody(page0)).not.toMatch(/\d+\s*sats/i);
    expect(buttonLabels(page0)).toContain("Next");

    const page1 = await h.send(20, { kind: "text", text: "Next" });
    expect(allText(page1)).not.toMatch(/You chose:/);
    expect(firstBody(page1)).toMatch(/Lightning/i);
    expect(firstBody(page1)).toMatch(/does not send/i);
    expect(firstBody(page1)).toMatch(/approve each purchase/i);
    expect(h.store.getSession(20)?.learnPage).toBe(1);

    const page2 = await h.send(20, { kind: "text", text: "Next" });
    expect(firstBody(page2)).toMatch(/lose value/i);
    expect(firstBody(page2)).toMatch(/not financial advice/i);
    expect(firstBody(page2)).toMatch(/surplus floor/i);
    expect(buttonLabels(page2)).toEqual([
      "Start a small habit",
      "Ask something else",
    ]);
    expect(h.purchases).toHaveLength(0);
    expect(h.store.getSession(20)?.profile).toBeNull();

    const blocked = await h.send(20, {
      kind: "document",
      fileId: "f1",
      fileName: "stmt.pdf",
      mimeType: "application/pdf",
    });
    expect(allText(blocked)).toMatch(/do not need a statement/i);
    expect(h.store.getSession(20)?.step).toBe("learn");
    expect(h.purchases).toHaveLength(0);

    const toHabit = await h.send(20, { kind: "text", text: "Start a small habit" });
    expect(allText(toHabit)).not.toMatch(/You chose:/);
    expect(allText(toHabit)).toMatch(/optional questions/i);
    expect(h.store.getSession(20)?.step).toBe("ask_debt");
  });

  it("Ask something else returns to the menu", async () => {
    const h = harness();
    await h.send(21, { kind: "command", command: "/start", args: "" });
    await h.send(21, { kind: "text", text: "Learn about Bitcoin" });
    await h.send(21, { kind: "text", text: "Next" });
    await h.send(21, { kind: "text", text: "Next" });
    const menu = await h.send(21, { kind: "text", text: "Ask something else" });
    expect(h.store.getSession(21)?.step).toBe("menu");
    expect(buttonLabels(menu)).toContain("Learn about Bitcoin");
  });

  it("asks for debt name and amount on Yes, then continues to chama", async () => {
    const h = harness();
    await h.startHabit(8);
    const yes = await h.send(8, { kind: "text", text: "Yes" });
    expect(allText(yes)).not.toMatch(/You chose:/);
    expect(allText(yes)).toMatch(/What do you call this debt/i);
    expect(allText(yes)).not.toMatch(/web app/i);
    expect(h.store.getSession(8)?.step).toBe("ask_debt_name");

    const named = await h.send(8, { kind: "text", text: "Fuliza" });
    expect(named.replies[0]?.text).toMatch(/Noted: Fuliza/i);
    expect(named.replies[0]?.text).toMatch(/whole KES/i);
    expect(h.store.getSession(8)?.onboarding.debts).toEqual([
      { label: "Fuliza", balanceKes: 0 },
    ]);
    expect(h.store.getSession(8)?.step).toBe("ask_debt_amount");

    const amount = await h.send(8, { kind: "text", text: "12000" });
    expect(allText(amount)).toMatch(/Noted: Fuliza — KES 12,000/i);
    expect(allText(amount)).toMatch(/chama/i);
    expect(h.store.getSession(8)?.onboarding.debts).toEqual([
      { label: "Fuliza", balanceKes: 12000 },
    ]);
    expect(h.store.getSession(8)?.step).toBe("ask_chama");
  });

  it("allows Skip on debt name without forcing the web app", async () => {
    const h = harness();
    await h.startHabit(9);
    await h.send(9, { kind: "text", text: "Yes" });
    const skipped = await h.send(9, { kind: "text", text: "Skip" });
    const text = allText(skipped);
    expect(text).not.toMatch(/You chose:/);
    expect(text).not.toMatch(/web app/i);
    expect(text).toMatch(/chama/i);
    expect(h.store.getSession(9)?.onboarding.debts).toEqual([]);
    expect(h.store.getSession(9)?.step).toBe("ask_chama");
  });

  it("allows Skip on debt amount and keeps the name with balance 0", async () => {
    const h = harness();
    await h.startHabit(10);
    await h.send(10, { kind: "text", text: "Yes" });
    await h.send(10, { kind: "text", text: "School fees" });
    const skipped = await h.send(10, { kind: "text", text: "Skip" });
    expect(allText(skipped)).toMatch(/chama/i);
    expect(h.store.getSession(10)?.onboarding.debts).toEqual([
      { label: "School fees", balanceKes: 0 },
    ]);
    expect(h.store.getSession(10)?.step).toBe("ask_chama");
  });

  it("asks for chama name and monthly contribution on Yes, then continues to goal", async () => {
    const h = harness();
    await h.startHabit(40);
    await h.send(40, { kind: "text", text: "Skip" }); // debt
    const yes = await h.send(40, { kind: "text", text: "Yes" });
    expect(allText(yes)).not.toMatch(/You chose:/);
    expect(allText(yes)).toMatch(/What do you call this chama/i);
    expect(allText(yes)).not.toMatch(/web app|refine/i);
    expect(h.store.getSession(40)?.step).toBe("ask_chama_name");

    const named = await h.send(40, { kind: "text", text: "Office merry-go-round" });
    expect(named.replies[0]?.text).toMatch(/Noted: Office merry-go-round/i);
    expect(named.replies[0]?.text).toMatch(/contribute monthly/i);
    expect(h.store.getSession(40)?.onboarding.chamaMemberships).toEqual([
      { name: "Office merry-go-round", monthlyContributionKes: 0, kind: "other" },
    ]);
    expect(h.store.getSession(40)?.step).toBe("ask_chama_amount");

    const amount = await h.send(40, { kind: "text", text: "2000" });
    expect(allText(amount)).toMatch(/Noted: Office merry-go-round — KES 2,000\/month/i);
    expect(allText(amount)).toMatch(/What matters most/i);
    expect(h.store.getSession(40)?.onboarding.chamaMemberships).toEqual([
      { name: "Office merry-go-round", monthlyContributionKes: 2000, kind: "other" },
    ]);
    expect(h.store.getSession(40)?.step).toBe("ask_goal");
  });

  it("allows Skip on chama name → empty memberships, then goal", async () => {
    const h = harness();
    await h.startHabit(41);
    await h.send(41, { kind: "text", text: "Skip" });
    await h.send(41, { kind: "text", text: "Yes" });
    const skipped = await h.send(41, { kind: "text", text: "Skip" });
    expect(allText(skipped)).toMatch(/No chama details noted/i);
    expect(allText(skipped)).toMatch(/What matters most/i);
    expect(h.store.getSession(41)?.onboarding.chamaMemberships).toEqual([]);
    expect(h.store.getSession(41)?.step).toBe("ask_goal");
  });

  it("allows Skip on chama amount and keeps the name with contribution 0", async () => {
    const h = harness();
    await h.startHabit(42);
    await h.send(42, { kind: "text", text: "Skip" });
    await h.send(42, { kind: "text", text: "Yes" });
    await h.send(42, { kind: "text", text: "Table banking" });
    const skipped = await h.send(42, { kind: "text", text: "Skip" });
    expect(allText(skipped)).toMatch(/What matters most/i);
    expect(h.store.getSession(42)?.onboarding.chamaMemberships).toEqual([
      { name: "Table banking", monthlyContributionKes: 0, kind: "other" },
    ]);
    expect(h.store.getSession(42)?.step).toBe("ask_goal");
  });

  it("caps habit at the surplus floor and saves reminder without purchasing", async () => {
    const h = harness();
    await h.startHabit(2);
    for (let i = 0; i < 3; i += 1) {
      await h.send(2, { kind: "text", text: "Skip" });
    }
    await h.send(2, { kind: "text", text: "Demo Amina (labeled demo)" });
    await h.send(2, { kind: "text", text: "Set habit" });
    const tooHigh = await h.send(2, { kind: "text", text: "2500" });
    expect(tooHigh.replies[0]?.text).toMatch(/above the safe floor/i);
    const amountOk = await h.send(2, { kind: "text", text: "1500" });
    expect(firstBody(amountOk)).toMatch(/Monthly \(default\)/i);
    expect(firstBody(amountOk)).toMatch(/Weekly/i);
    expect(buttonLabels(amountOk)).toEqual(
      expect.arrayContaining(["Monthly", "Weekly"]),
    );
    await h.send(2, { kind: "text", text: "Monthly" });
    const remind = await h.send(2, { kind: "text", text: "Remind me on the 1st" });
    expect(allText(remind)).not.toMatch(/You chose:/);
    expect(firstBody(remind)).toMatch(/Reminder set for the 1st/);
    expect(h.purchases).toHaveLength(0);
    expect(h.store.getSession(2)?.reminder?.amountKes).toBe(1500);
  });

  it("never purchases without Approve and stops when Bitika is missing", async () => {
    const h = harness();
    await h.startHabit(3);
    for (let i = 0; i < 3; i += 1) {
      await h.send(3, { kind: "text", text: "Skip" });
    }
    await h.send(3, { kind: "text", text: "Demo Amina (labeled demo)" });
    h.setBitika(false);
    const missing = await h.send(3, {
      kind: "text",
      text: "Make your first transaction today",
    });
    expect(firstBody(missing)).toMatch(/BITIKA_API_KEY/);
    expect(h.purchases).toHaveLength(0);

    h.setBitika(true);
    await h.send(3, { kind: "text", text: "Make your first transaction today" });
    await h.send(3, { kind: "text", text: "0712345678" });
    await h.send(3, { kind: "text", text: "Use 07…@bitcoin.co.ke" });
    expect(h.purchases).toHaveLength(0);
    const approved = await h.send(3, { kind: "text", text: "Approve" });
    expect(h.purchases).toHaveLength(1);
    expect(h.purchases[0]?.approvedByUser).toBe(true);
    expect(h.purchases[0]?.amountKes).toBe(1500);
    expect(allText(approved)).not.toMatch(/You chose:/);
    expect(firstBody(approved)).toMatch(/Purchase started/);
  });

  it("refuses auto-approve before confirm step", async () => {
    const h = harness();
    await h.startHabit(4);
    for (let i = 0; i < 3; i += 1) {
      await h.send(4, { kind: "text", text: "Skip" });
    }
    await h.send(4, { kind: "text", text: "Demo Amina (labeled demo)" });
    const early = await h.send(4, { kind: "text", text: "Approve" });
    // "Approve" is only wired at invest_confirm; otherwise summary / ready buttons.
    expect(allText(early)).not.toMatch(/Purchase started/);
    expect(h.purchases).toHaveLength(0);
  });

  it("still accepts legacy inline callbacks without echoing You chose", async () => {
    const h = harness();
    await h.send(60, { kind: "command", command: "/start", args: "" });
    const started = await h.send(60, { kind: "callback", data: "path:habit" });
    expect(allText(started)).not.toMatch(/You chose:/);
    expect(started.callbackAnswerText).toBeNull();
    expect(h.store.getSession(60)?.step).toBe("ask_debt");
  });
});

describe("telegram summary", () => {
  it("shows Amina habit as 75% of floor with sectioned reading", () => {
    const profile = demoProfiles.amina;
    const floor = profile.surplus.monthlyKes.floor;
    const habit = profile.investmentPlan?.amountKes ?? 0;
    expect(habitPercentOfFloor(habit, floor)).toBe(75);
    const text = profileSummary(profile, { isDemo: true });
    expect(text).toMatch(/Demo data/);
    expect(text).toMatch(/Statement period/);
    expect(text).toMatch(/Income \(monthly\)/);
    expect(text).toMatch(/Named commitments/);
    expect(text).toMatch(/Greenview Apartments/);
    expect(text).toMatch(/Chama Sisters/);
    expect(text).toMatch(/Top spending/);
    expect(text).toMatch(/groceries/);
    expect(text).toMatch(/Safe surplus \(monthly\)/);
    expect(text).toMatch(/Floor KES 2,000/);
    expect(text).toMatch(/Resilience/);
    expect(text).toMatch(/75% of the safe floor/);
    expect(text).toMatch(/education, not financial advice/i);
    expect(text).not.toMatch(/\d+\s*sats/i);
    const largest = largestPaymentsText(profile);
    expect(largest).toMatch(/Largest regular payments/);
    expect(largest).toMatch(/Greenview Apartments — KES 15,000/);
  });

  it("says buffer-first for Brian with no invent invest", () => {
    const text = profileSummary(demoProfiles.brian);
    expect(text).toMatch(/buffer comes first/i);
    expect(text).not.toMatch(/^Demo data/m);
    expect(demoProfiles.brian.investmentPlan).toBeUndefined();
  });
});
