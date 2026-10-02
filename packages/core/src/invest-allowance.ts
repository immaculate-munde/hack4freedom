/**
 * Whether a small buy is allowed for a profile.
 * The floor comes from the profile. The caller does not get to raise it.
 * 10 and 10,000 match the Bitika collect limits.
 */

import type { FinancialProfile } from "./financial-profile.schema";

export const INVEST_MIN_KES = 10;
export const INVEST_MAX_KES = 10_000;

export type InvestAllowance =
  | { ok: true; maxKes: number }
  | { ok: false; reason: string };

export type InvestAllowanceOptions = {
  /**
   * When false, `bufferFirst` does not block a buy. Use for demos or when the
   * import under-counted income but the person confirms a strong statement.
   */
  respectBufferGate?: boolean;
};

function surplusCapKes(
  profile: FinancialProfile,
  respectBufferGate: boolean,
): number {
  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  if (respectBufferGate) {
    return floor;
  }
  const relaxed = Math.max(floor, typical, ceiling);
  return Math.min(relaxed, INVEST_MAX_KES);
}

/** The highest whole-shilling buy this profile may start, or why it may not. */
export function investAllowance(
  profile: FinancialProfile,
  options?: InvestAllowanceOptions,
): InvestAllowance {
  const respectBufferGate = options?.respectBufferGate ?? true;

  if (respectBufferGate && profile.resilience.bufferFirst) {
    return { ok: false, reason: "Build a buffer before buying Bitcoin." };
  }

  const cap = surplusCapKes(profile, respectBufferGate);
  if (!Number.isFinite(cap) || cap < INVEST_MIN_KES) {
    return { ok: false, reason: "The surplus floor is too small for a buy." };
  }
  return { ok: true, maxKes: Math.min(Math.round(cap), INVEST_MAX_KES) };
}

/** Reject an amount the profile does not allow. */
export function assertInvestAmount(
  profile: FinancialProfile,
  amountKes: number,
  options?: InvestAllowanceOptions,
): void {
  const allowance = investAllowance(profile, options);
  if (!allowance.ok) {
    throw new Error(allowance.reason);
  }
  if (!Number.isInteger(amountKes)) {
    throw new Error("Amount must be a whole number of shillings.");
  }
  if (amountKes < INVEST_MIN_KES || amountKes > allowance.maxKes) {
    throw new Error(
      `Amount must be between ${INVEST_MIN_KES} and ${allowance.maxKes} KES.`,
    );
  }
}
