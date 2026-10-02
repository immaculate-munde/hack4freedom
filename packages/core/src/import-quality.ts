/**
 * Reject imports that parsed technically but are not usable for the product UI.
 */

import type { FinancialProfile } from "./financial-profile.schema";
import type { Transaction } from "./types";

export function validateImportedProfile(
  profile: FinancialProfile,
  transactions: readonly Transaction[],
): string | null {
  if (transactions.length < 8) {
    return `We only found ${transactions.length} transactions in that file. Export about six months from M-Pesa, or paste SMS messages instead.`;
  }

  const moneyIn = transactions.filter((t) => t.direction === "in");
  const moneyOut = transactions.filter((t) => t.direction === "out");
  if (moneyIn.length < 2) {
    return "We could not see regular money coming in (salary or transfers). This PDF layout may not be supported yet — paste your M-Pesa SMS messages instead.";
  }
  if (moneyOut.length < 3) {
    return "We could not see enough spending or bill payments. Paste M-Pesa SMS messages for a fuller picture.";
  }

  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  const incomeTypical = profile.income.monthlyKes.typical;

  if (ceiling < 500 && incomeTypical < 1_000) {
    return "The numbers do not look like a real six-month picture (income and surplus are near zero). Paste M-Pesa SMS messages instead of this PDF for now.";
  }

  if (floor === 0 && ceiling === 0 && incomeTypical === 0) {
    return "We could not build a surplus range from this PDF. Paste M-Pesa SMS messages — that path works today.";
  }

  if (typical < 200 && profile.commitments.length === 0 && moneyIn.length < 4) {
    return "The profile looks too thin to trust. Try SMS paste, or export a longer statement period.";
  }

  return null;
}
