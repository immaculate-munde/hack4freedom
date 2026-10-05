import type { BuyCadence, FinancialProfile, InvestmentPlan } from "@pesasense/core";
import { showBufferFirstUx } from "./buffer-gate";

/** Matches Amina's draft horizon when a new plan has none yet. */
const DEFAULT_HORIZON_YEARS = 3;

/**
 * A habit is allowed only when the safe floor is above zero and the buffer
 * is not the next step. The cap is that floor, in whole shillings.
 */
export function habitOffer(
  profile: FinancialProfile,
): { ok: true; maxKes: number } | { ok: false; reason: string } {
  const floor = Math.round(profile.surplus.monthlyKes.floor);
  if (showBufferFirstUx(profile) || floor <= 0) {
    return {
      ok: false,
      reason: "habit.bufferFirst",
    };
  }
  return { ok: true, maxKes: floor };
}

/** Whole shillings only. Empty, decimals, and zero are not an amount. */
export function parseWholeKes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

/**
 * Writes a plan onto a profile copy.
 * Keeps destination, horizon, and status when they already exist so the
 * object stays a valid InvestmentPlan. Does not start a purchase.
 */
export function planWithAmount(
  profile: FinancialProfile,
  amountKes: number,
  cadence: BuyCadence,
): FinancialProfile {
  const existing = profile.investmentPlan;
  const plan: InvestmentPlan = {
    amountKes,
    cadence,
    horizonYears: existing?.horizonYears ?? DEFAULT_HORIZON_YEARS,
    destination: existing?.destination ?? "",
    status: existing?.status ?? "draft",
  };
  return { ...profile, investmentPlan: plan };
}
