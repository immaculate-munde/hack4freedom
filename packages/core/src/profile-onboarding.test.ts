import { describe, expect, it } from "vitest";
import type { Commitment, OnboardingAnswers } from "./financial-profile.schema";
import {
  applyOnboardingToCommitments,
  applyOnboardingToResilience,
  buildProfile,
} from "./profile";
import type { Transaction } from "./types";

function tx(
  partial: Pick<Transaction, "id" | "date" | "direction" | "amountKes"> &
    Partial<Transaction>,
): Transaction {
  return {
    kind: partial.kind ?? "send",
    currency: "KES",
    source: "mpesa_sms",
    raw: partial.raw ?? "demo",
    counterparty: partial.counterparty,
    ...partial,
  };
}

const baseMonth = [
  tx({
    id: "in-1",
    date: "2026-04-01",
    direction: "in",
    amountKes: 40000,
    kind: "receive",
    counterparty: "ACME PAYROLL",
  }),
  tx({
    id: "in-2",
    date: "2026-05-01",
    direction: "in",
    amountKes: 40000,
    kind: "receive",
    counterparty: "ACME PAYROLL",
  }),
  tx({
    id: "in-3",
    date: "2026-06-01",
    direction: "in",
    amountKes: 40000,
    kind: "receive",
    counterparty: "ACME PAYROLL",
  }),
  tx({
    id: "rent-1",
    date: "2026-04-05",
    direction: "out",
    amountKes: 10000,
    counterparty: "Greenview Rent",
    raw: "for account RENT",
  }),
  tx({
    id: "rent-2",
    date: "2026-05-05",
    direction: "out",
    amountKes: 10000,
    counterparty: "Greenview Rent",
    raw: "for account RENT",
  }),
  tx({
    id: "rent-3",
    date: "2026-06-05",
    direction: "out",
    amountKes: 10000,
    counterparty: "Greenview Rent",
    raw: "for account RENT",
  }),
  tx({
    id: "shop-1",
    date: "2026-04-10",
    direction: "out",
    amountKes: 2000,
    counterparty: "CORNER GROCERS",
  }),
  tx({
    id: "shop-2",
    date: "2026-05-10",
    direction: "out",
    amountKes: 2000,
    counterparty: "CORNER GROCERS",
  }),
  tx({
    id: "shop-3",
    date: "2026-06-10",
    direction: "out",
    amountKes: 2000,
    counterparty: "CORNER GROCERS",
  }),
];

describe("applyOnboardingToCommitments", () => {
  it("adds self-reported chama and loan repayments the statement missed", () => {
    const detected: Commitment[] = [
      {
        label: "Greenview Rent",
        category: "rent",
        amountKes: 10000,
        cadence: "monthly",
        confidence: "high",
        observations: 3,
      },
    ];
    const onboarding: OnboardingAnswers = {
      debts: [{ label: "Fuliza catch-up", balanceKes: 12000, monthlyPaymentKes: 2500 }],
      chamaMemberships: [{ name: "Umoja Circle", monthlyContributionKes: 1500 }],
      goal: { kind: "long_horizon" },
    };

    const merged = applyOnboardingToCommitments(detected, onboarding);
    expect(merged).toHaveLength(3);
    expect(merged.find((row) => row.category === "chama")).toMatchObject({
      label: "Umoja Circle",
      amountKes: 1500,
      userConfirmed: true,
    });
    expect(merged.find((row) => row.category === "loan")).toMatchObject({
      label: "Fuliza catch-up",
      amountKes: 2500,
      userConfirmed: true,
    });
  });

  it("outranks a detected chama amount with the self-reported contribution", () => {
    const detected: Commitment[] = [
      {
        label: "Chama Sisters",
        category: "chama",
        amountKes: 500,
        cadence: "monthly",
        confidence: "medium",
        observations: 2,
      },
    ];
    const onboarding: OnboardingAnswers = {
      debts: [],
      chamaMemberships: [{ name: "Chama Sisters", monthlyContributionKes: 2000 }],
      goal: { kind: "other" },
    };

    const merged = applyOnboardingToCommitments(detected, onboarding);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      amountKes: 2000,
      userConfirmed: true,
      observations: 2,
    });
  });
});

describe("applyOnboardingToResilience", () => {
  it("sets bufferFirst when the goal is emergency buffer and cover is thin", () => {
    const next = applyOnboardingToResilience(
      {
        monthsOfExpensesCovered: 1.5,
        borrowingReliance: "none",
        fulizaObservations: 0,
        bufferFirst: false,
      },
      {
        debts: [],
        chamaMemberships: [],
        goal: { kind: "emergency_buffer" },
      },
      40000,
    );
    expect(next.bufferFirst).toBe(true);
  });

  it("sets bufferFirst for large debt balance with no repayment schedule", () => {
    const next = applyOnboardingToResilience(
      {
        monthsOfExpensesCovered: 2,
        borrowingReliance: "none",
        fulizaObservations: 0,
        bufferFirst: false,
      },
      {
        debts: [{ label: "Shop stock loan", balanceKes: 50000 }],
        chamaMemberships: [],
        goal: { kind: "long_horizon" },
      },
      40000,
    );
    expect(next.bufferFirst).toBe(true);
    expect(next.monthsOfExpensesCovered).toBeLessThanOrEqual(1);
  });
});

describe("buildProfile onboarding surplus", () => {
  it("lowers the surplus floor when onboarding adds a monthly repayment and chama", () => {
    const without = buildProfile({ transactions: baseMonth });
    const withAnswers = buildProfile({
      transactions: baseMonth,
      onboarding: {
        debts: [{ label: "Study loan", balanceKes: 3000, monthlyPaymentKes: 3000 }],
        chamaMemberships: [{ name: "Umoja", monthlyContributionKes: 2000 }],
        goal: { kind: "long_horizon" },
      },
    });

    expect(withAnswers.surplus.monthlyKes.floor).toBeLessThan(without.surplus.monthlyKes.floor);
    expect(withAnswers.surplus.monthlyKes.typical).toBeLessThan(
      without.surplus.monthlyKes.typical,
    );
    expect(withAnswers.commitments.some((row) => row.userConfirmed)).toBe(true);
  });
});

describe("buildProfile income & commitment accuracy", () => {
  it("ignores tiny credits so they cannot drag the income floor to KES 10", () => {
    const withNoise = [
      ...baseMonth,
      tx({
        id: "noise-1",
        date: "2026-04-12",
        direction: "in",
        amountKes: 10,
        kind: "receive",
        counterparty: "SAFARICOM",
      }),
      tx({
        id: "noise-2",
        date: "2026-05-12",
        direction: "in",
        amountKes: 50,
        kind: "receive",
        counterparty: "AIRTIME REFUND",
      }),
    ];
    const profile = buildProfile({ transactions: withNoise });
    expect(profile.income.monthlyKes.floor).toBeGreaterThanOrEqual(40000);
    expect(profile.income.monthlyKes.typical).toBeGreaterThanOrEqual(40000);
    expect(profile.income.sources.every((s) => s.value.monthlyKes.typical >= 200)).toBe(true);
  });

  it("detects rent, utilities, and a stable unnamed landlord-style debit", () => {
    const txs = [
      ...baseMonth,
      tx({
        id: "kplc-1",
        date: "2026-04-08",
        direction: "out",
        amountKes: 1200,
        counterparty: "KPLC PREPAID",
        raw: "Paybill CITY POWER",
      }),
      tx({
        id: "kplc-2",
        date: "2026-05-08",
        direction: "out",
        amountKes: 1300,
        counterparty: "KPLC PREPAID",
        raw: "Paybill CITY POWER",
      }),
      tx({
        id: "kplc-3",
        date: "2026-06-08",
        direction: "out",
        amountKes: 1250,
        counterparty: "KPLC PREPAID",
        raw: "Paybill CITY POWER",
      }),
      tx({
        id: "land-1",
        date: "2026-04-03",
        direction: "out",
        amountKes: 5000,
        counterparty: "JANE WANGARI",
      }),
      tx({
        id: "land-2",
        date: "2026-05-03",
        direction: "out",
        amountKes: 5000,
        counterparty: "JANE WANGARI",
      }),
      tx({
        id: "land-3",
        date: "2026-06-03",
        direction: "out",
        amountKes: 5000,
        counterparty: "JANE WANGARI",
      }),
    ];
    const profile = buildProfile({ transactions: txs });
    const cats = profile.commitments.map((c) => c.category);
    expect(cats).toContain("rent");
    expect(cats).toContain("utilities");
    expect(profile.commitments.some((c) => c.label === "JANE WANGARI")).toBe(true);
    expect(profile.commitments.length).toBeGreaterThanOrEqual(3);
  });

  it("does not crush surplus with a fixed 11k flex floor on a modest income", () => {
    const modest = [
      tx({
        id: "m-in-1",
        date: "2026-04-01",
        direction: "in",
        amountKes: 12000,
        kind: "receive",
        counterparty: "CASUAL WORK",
      }),
      tx({
        id: "m-in-2",
        date: "2026-05-01",
        direction: "in",
        amountKes: 12000,
        kind: "receive",
        counterparty: "CASUAL WORK",
      }),
      tx({
        id: "m-in-3",
        date: "2026-06-01",
        direction: "in",
        amountKes: 12000,
        kind: "receive",
        counterparty: "CASUAL WORK",
      }),
      tx({
        id: "m-shop-1",
        date: "2026-04-10",
        direction: "out",
        amountKes: 1500,
        counterparty: "CORNER GROCERS",
      }),
      tx({
        id: "m-shop-2",
        date: "2026-05-10",
        direction: "out",
        amountKes: 1500,
        counterparty: "CORNER GROCERS",
      }),
      tx({
        id: "m-shop-3",
        date: "2026-06-10",
        direction: "out",
        amountKes: 1500,
        counterparty: "CORNER GROCERS",
      }),
    ];
    const profile = buildProfile({ transactions: modest });
    // With 3 months of history, flex should track detected spend + cash uplift, not 11k.
    expect(profile.spending.flexibleMonthlyKes.typical).toBeLessThan(8000);
    expect(profile.surplus.monthlyKes.typical).toBeGreaterThan(0);
  });
});
