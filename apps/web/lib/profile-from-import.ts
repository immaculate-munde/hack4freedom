import {
  buildProfile,
  validateImportedProfile,
  type FinancialProfile,
  type OnboardingAnswers,
  type Transaction,
} from "@pesasense/core";

export function readOnboardingAnswers(): OnboardingAnswers {
  const fallback: OnboardingAnswers = {
    debts: [],
    chamaMemberships: [],
    goal: { kind: "other" },
  };
  try {
    const raw = sessionStorage.getItem("pesasense.onboarding");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { answers?: OnboardingAnswers };
    if (parsed?.answers) return parsed.answers;
  } catch {
    // ignore
  }
  return fallback;
}

export function clearOnboardingDraft(): void {
  try {
    sessionStorage.removeItem("pesasense.onboarding");
  } catch {
    // ignore
  }
}

export function buildProfileFromTransactions(transactions: Transaction[]): FinancialProfile {
  const profile = buildProfile({
    transactions,
    onboarding: readOnboardingAnswers(),
  });
  const problem = validateImportedProfile(profile, transactions);
  if (problem) {
    throw new Error(problem);
  }
  return profile;
}

/**
 * After a successful parse, a profile with a surplus floor and no plan goes
 * to the habit editor. This does not invent an amount or start a purchase.
 * Buffer-first profiles, and anyone who already has a plan, open Overview.
 */
export function routeAfterImport(profile: FinancialProfile): "/habit" | "/overview" {
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const floor = profile.surplus.monthlyKes.floor;
  if (!bufferFirst && floor > 0 && !profile.investmentPlan) {
    return "/habit";
  }
  return "/overview";
}
