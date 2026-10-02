/**
 * Profile engine.
 *
 * Builds a financial profile from parsed history and onboarding answers.
 * Self-reported answers outrank inferred values. Nothing here is a score.
 * This package has no UI code so the engine can be tested on its own.
 */

import type {
  FinancialProfile,
  IncomeSummary,
  OnboardingAnswers,
  Resilience,
  SpendingSummary,
  Surplus,
} from "./financial-profile.schema";
import type { Transaction } from "./types";

/** Everything the engine needs. Crypto rows are optional and still a stretch. */
export interface BuildProfileInput {
  transactions: readonly Transaction[];
  onboarding?: OnboardingAnswers;
  /**
   * Optional crypto history CSV text.
   * TODO: crypto import is a stretch feature. Leave this unused until then.
   */
  cryptoCsv?: string;
}

/**
 * Build a profile from about six months of transactions.
 * Onboarding answers override anything the statements only imply.
 *
 * TODO: detect income, commitments, spending, resilience, then call computeSurplus.
 */
export function buildProfile(input: BuildProfileInput): FinancialProfile {
  const answered = input.onboarding ? "with onboarding" : "without onboarding";
  throw new Error(
    `Not implemented: buildProfile (${input.transactions.length} transactions, ${answered})`,
  );
}

/** The slices of a profile that the surplus calculation reads. */
export interface SurplusInput {
  income: IncomeSummary;
  spending: SpendingSummary;
  resilience: Resilience;
}

/**
 * Compute a safe surplus range from the user's own history.
 * The floor is the worst typical month. Do not apply a fixed 50/30/20 split.
 * Set `bufferFirst` when resilience is thin.
 *
 * TODO: derive the range from income, commitments and flexible spending.
 */
export function computeSurplus(input: SurplusInput): Surplus {
  throw new Error(
    `Not implemented: computeSurplus (bufferFirst ${input.resilience.bufferFirst}, income typical ${input.income.monthlyKes.typical})`,
  );
}
