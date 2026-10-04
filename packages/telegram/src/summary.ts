/**
 * Plain-text financial reading for Telegram.
 * Same surplus / habit / resilience numbers the web overview uses.
 */

import {
  PAST_PERFORMANCE_DISCLAIMER,
  investAllowance,
  type FinancialProfile,
} from "@pesasense/core";
import type { InlineButton } from "./types";

function kes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/** Share of the safe floor, whole percent. Amina 1500/2000 = 75. */
export function habitPercentOfFloor(habitKes: number, floorKes: number): number {
  if (floorKes <= 0) return 0;
  return Math.round((habitKes / floorKes) * 100);
}

export function profileSummary(profile: FinancialProfile): string {
  const income = profile.income.monthlyKes;
  const commitments = profile.commitments.reduce((sum, c) => sum + c.amountKes, 0);
  const surplus = profile.surplus.monthlyKes;
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const months = profile.resilience.monthsOfExpensesCovered;
  const plan = profile.investmentPlan;
  const floor = Math.round(surplus.floor);

  const lines = [
    "Here is the picture from what you sent.",
    "",
    `Income (monthly): ${kes(income.floor)} – ${kes(income.ceiling)} (typical ${kes(income.typical)})`,
    `Commitments total: ${kes(commitments)}`,
    `Surplus floor / typical / ceiling: ${kes(surplus.floor)} / ${kes(surplus.typical)} / ${kes(surplus.ceiling)}`,
    `Resilience: about ${months} month(s) of expenses covered.`,
  ];

  if (bufferFirst || floor <= 0) {
    lines.push("", "The buffer comes first. This history is not ready for a Bitcoin habit yet.");
  } else if (plan) {
    const pct = habitPercentOfFloor(plan.amountKes, floor);
    lines.push(
      "",
      `Habit: ${kes(plan.amountKes)} / ${plan.cadence} (${pct}% of the safe floor).`,
      "We'll remind you. You approve each purchase. Nothing is sent on its own.",
    );
  } else {
    lines.push("", "No habit yet. You can set one within the safe floor.");
  }

  lines.push("", "This is education, not financial advice. Bitcoin can lose value.");
  return lines.join("\n");
}

export function readyButtons(profile: FinancialProfile): InlineButton[][] {
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const floor = Math.round(profile.surplus.monthlyKes.floor);
  const rows: InlineButton[][] = [];
  if (!bufferFirst && floor > 0) {
    rows.push([{ text: "Set habit", callbackData: "habit" }]);
  }
  const allowance = investAllowance(profile);
  if (allowance.ok && profile.investmentPlan?.amountKes) {
    rows.push([{ text: "Review investment", callbackData: "invest" }]);
  }
  rows.push([{ text: "Show breakdown", callbackData: "breakdown" }]);
  rows.push([{ text: "Remind me on the 1st", callbackData: "remind" }]);
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
    "Nothing is sent until you tap Approve.",
  ].join("\n");
}
