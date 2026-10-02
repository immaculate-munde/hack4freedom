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
