/**
 * Plain-text financial reading for Telegram.
 * Same surplus / habit / resilience numbers the web overview uses.
 * Aggregates only — profiles do not store raw transaction rows.
 */

import {
  PAST_PERFORMANCE_DISCLAIMER,
  investAllowance,
  type FinancialProfile,
} from "@pesasense/core";

function kes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

function formatIsoDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonths(months: number): string {
  if (Number.isInteger(months)) return String(months);
  return months.toLocaleString("en-KE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

/** Share of the safe floor, whole percent. Amina 1500/2000 = 75. */
export function habitPercentOfFloor(habitKes: number, floorKes: number): number {
  if (floorKes <= 0) return 0;
  return Math.round((habitKes / floorKes) * 100);
}

export type ProfileSummaryOptions = {
  /** True only for the labeled Demo Amina path — never invent a demo tag. */
  isDemo?: boolean;
};

/**
 * Post-import (and ready-state) picture: short sections, whole KES only.
 * Does not invent sats or transaction lines — profiles hold aggregates.
 */
export function profileSummary(
  profile: FinancialProfile,
  options: ProfileSummaryOptions = {},
): string {
  const income = profile.income.monthlyKes;
  const surplus = profile.surplus.monthlyKes;
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const months = profile.resilience.monthsOfExpensesCovered;
  const plan = profile.investmentPlan;
  const floor = Math.round(surplus.floor);
  const sections: string[] = [];

  if (options.isDemo) {
    sections.push("Demo data — invented person (Amina). Not a live statement.");
  } else {
    sections.push("Here is the picture from what you sent.");
  }

  const period = [
    `${formatIsoDate(profile.window.from)} – ${formatIsoDate(profile.window.to)}`,
    `(${profile.window.monthsCovered} month${profile.window.monthsCovered === 1 ? "" : "s"})`,
  ].join(" ");
  sections.push("", "Statement period", period);

  sections.push(
    "",
    "Income (monthly)",
    `${kes(income.floor)} – ${kes(income.ceiling)}`,
    `Typical: ${kes(income.typical)}`,
  );

  const commitmentLines = namedCommitmentLines(profile);
  if (commitmentLines.length > 0) {
    sections.push("", "Named commitments", ...commitmentLines);
  } else {
    sections.push("", "Named commitments", "None detected from this history.");
  }

  const spendLines = topSpendingLines(profile, 4);
  if (spendLines.length > 0) {
    sections.push("", "Top spending", ...spendLines);
  }

  sections.push(
    "",
    "Safe surplus (monthly)",
    `Floor ${kes(surplus.floor)} · Typical ${kes(surplus.typical)} · Ceiling ${kes(surplus.ceiling)}`,
  );

  sections.push(
    "",
    "Resilience",
    `About ${formatMonths(months)} month(s) of expenses covered.`,
  );

  if (bufferFirst || floor <= 0) {
    sections.push(
      "",
      "Habit",
      "The buffer comes first. This history is not ready for a Bitcoin habit yet.",
    );
  } else if (plan) {
    const pct = habitPercentOfFloor(plan.amountKes, floor);
    sections.push(
      "",
      "Habit",
      `${kes(plan.amountKes)} / ${plan.cadence} (${pct}% of the safe floor).`,
      "We'll remind you. You approve each purchase. Nothing is sent on its own.",
    );
  } else {
    sections.push("", "Habit", "No habit yet. You can set one within the safe floor.");
  }

  sections.push(
    "",
    "This is education, not financial advice. Bitcoin can lose value.",
  );
  return sections.join("\n");
}

function namedCommitmentLines(profile: FinancialProfile): string[] {
  const fromParsed = profile.commitments.map(
    (c) => `• ${c.label} — ${kes(c.amountKes)}/${c.cadence}`,
  );
  const onboarding = profile.onboarding;
  const extra: string[] = [];
  if (onboarding) {
    for (const debt of onboarding.debts) {
      const already = profile.commitments.some(
        (c) => c.label.toLowerCase() === debt.label.toLowerCase(),
      );
      if (already) continue;
      if (debt.monthlyPaymentKes && debt.monthlyPaymentKes > 0) {
        extra.push(`• ${debt.label} — ${kes(debt.monthlyPaymentKes)}/month (you entered)`);
      } else if (debt.balanceKes > 0) {
        extra.push(`• ${debt.label} — balance ${kes(debt.balanceKes)} (you entered)`);
      } else {
        extra.push(`• ${debt.label} (you entered)`);
      }
    }
    for (const chama of onboarding.chamaMemberships) {
      const already = profile.commitments.some(
        (c) => c.label.toLowerCase() === chama.name.toLowerCase(),
      );
      if (already) continue;
      if (chama.monthlyContributionKes > 0) {
        extra.push(
          `• ${chama.name} — ${kes(chama.monthlyContributionKes)}/month (you entered)`,
        );
      } else {
        extra.push(`• ${chama.name} (you entered)`);
      }
    }
  }
  return [...fromParsed, ...extra].slice(0, 10);
}

function topSpendingLines(profile: FinancialProfile, limit: number): string[] {
  const ranked = [...profile.spending.byCategory].sort(
    (a, b) => b.monthlyKes.typical - a.monthlyKes.typical,
  );
  return ranked.slice(0, limit).map(
    (row) => `• ${row.category} — typical ${kes(row.monthlyKes.typical)}`,
  );
}

/**
 * Optional second message: largest regular payments by amount.
 * Returns null when there is nothing useful to list.
 */
export function largestPaymentsText(profile: FinancialProfile): string | null {
  const ranked = [...profile.commitments].sort((a, b) => b.amountKes - a.amountKes);
  if (ranked.length === 0) return null;
  const top = ranked.slice(0, 5);
  const lines = [
    "Largest regular payments",
    "",
    ...top.map((c, i) => `${i + 1}. ${c.label} — ${kes(c.amountKes)}/${c.cadence}`),
  ];
  return lines.join("\n");
}

/** Reply-keyboard rows for the ready / post-import actions. */
export function readyButtons(profile: FinancialProfile): string[][] {
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const floor = Math.round(profile.surplus.monthlyKes.floor);
  const rows: string[][] = [];
  if (!bufferFirst && floor > 0) {
    rows.push(["Set habit"]);
  }
  const allowance = investAllowance(profile);
  if (allowance.ok && profile.investmentPlan?.amountKes) {
    rows.push(["Make your first transaction today"]);
  }
  rows.push(["Show breakdown"]);
  rows.push(["Remind me on the 1st"]);
  return rows;
}

export function breakdownText(profile: FinancialProfile): string {
  const lines = ["Breakdown", ""];
  for (const c of profile.commitments.slice(0, 8)) {
    lines.push(`• ${c.label}: ${kes(c.amountKes)} (${c.cadence})`);
  }
  if (profile.commitments.length === 0) {
    lines.push("No fixed commitments detected.");
  }
  const flex = profile.spending.flexibleMonthlyKes;
  lines.push(
    "",
    `Flexible spending: ${kes(flex.floor)} – ${kes(flex.ceiling)} (typical ${kes(flex.typical)})`,
  );
  const spend = topSpendingLines(profile, 6);
  if (spend.length > 0) {
    lines.push("", "By category:", ...spend);
  }
  return lines.join("\n");
}

export function investReviewText(profile: FinancialProfile): string {
  const plan = profile.investmentPlan;
  if (!plan) {
    return "Save a habit amount first. A purchase waits until you review and approve it.";
  }
  return [
    `Review: ${kes(plan.amountKes)} (${plan.cadence}).`,
    "",
    "Bitcoin can lose value. This is education, not financial advice.",
    PAST_PERFORMANCE_DISCLAIMER,
    "",
    "We'll remind you on the 1st. You approve each purchase.",
    "Nothing is sent until you send Approve.",
  ].join("\n");
}
