/**
 * Read the same demo profiles and invest rules the web app uses.
 * USSD does not keep a second copy of the surplus numbers.
 */

import {
  assertInvestAmount,
  demoProfiles,
  investAllowance,
  type FinancialProfile,
} from "@pesasense/core";
import type { ProfileId } from "./types";

export interface ProfileFacts {
  id: ProfileId;
  label: string;
  floorKes: number;
  typicalKes: number;
  ceilingKes: number;
  bufferFirst: boolean;
  habitKes: number | null;
  habitCadence: "weekly" | "monthly" | null;
  chamaName: string | null;
  chamaMonthlyKes: number | null;
  buyAllowed: boolean;
  buyRefusal: string | null;
  maxKes: number;
}

const LABELS: Record<ProfileId, string> = {
  amina: "Amina",
  brian: "Brian",
};

export function factsFromProfile(id: ProfileId, profile: FinancialProfile): ProfileFacts {
  const allowance = investAllowance(profile);
  const chama = profile.onboarding?.chamaMemberships[0];
  return {
    id,
    label: LABELS[id],
    floorKes: profile.surplus.monthlyKes.floor,
    typicalKes: profile.surplus.monthlyKes.typical,
    ceilingKes: profile.surplus.monthlyKes.ceiling,
    bufferFirst: profile.resilience.bufferFirst || profile.surplus.bufferFirst,
    habitKes: profile.investmentPlan?.amountKes ?? null,
    habitCadence: profile.investmentPlan?.cadence ?? null,
    chamaName: chama?.name ?? null,
    chamaMonthlyKes: chama?.monthlyContributionKes ?? null,
    buyAllowed: allowance.ok,
    buyRefusal: allowance.ok ? null : allowance.reason,
    maxKes: allowance.ok ? allowance.maxKes : 0,
  };
}

export function demoFacts(id: ProfileId): ProfileFacts {
  return factsFromProfile(id, demoProfiles[id]);
}

/** Same rejection the invest screen uses, shortened only by that function's own text. */
export function amountRefusal(id: ProfileId, amountKes: number): string | null {
  try {
    assertInvestAmount(demoProfiles[id], amountKes);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "This amount is not allowed.";
  }
}
