/**
 * Habit helpers for Telegram — same floor cap and whole-KES rules as the web app.
 */

import type { BuyCadence, FinancialProfile, InvestmentPlan } from "@pesasense/core";

const DEFAULT_HORIZON_YEARS = 3;

export function habitOffer(
  profile: FinancialProfile,
): { ok: true; maxKes: number } | { ok: false; reason: string } {
  const floor = Math.round(profile.surplus.monthlyKes.floor);
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  if (bufferFirst || floor <= 0) {
    return {
      ok: false,
      reason:
        "The buffer comes first. A habit waits until the safe surplus floor is above zero.",
    };
  }
  return { ok: true, maxKes: floor };
}

export function parseWholeKes(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

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
