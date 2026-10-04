/**
 * Build a FinancialProfile from Telegram SMS paste or PDF text.
 * Reuses core parse + buildProfile. No UI.
 */

import {
  buildProfile,
  parseSmsBatch,
  parseStatement,
  validateImportedProfile,
  type FinancialProfile,
  type OnboardingAnswers,
} from "@pesasense/core";

function splitSmsPaste(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildProfileFromSmsText(
  text: string,
  onboarding: OnboardingAnswers,
): FinancialProfile {
  const batch = splitSmsPaste(text);
  const transactions = parseSmsBatch(batch.length > 0 ? batch : [text]);
  const profile = buildProfile({ transactions, onboarding });
  const problem = validateImportedProfile(profile, transactions);
  if (problem) throw new Error(problem);
  return profile;
}

export function buildProfileFromStatementText(
  text: string,
  onboarding: OnboardingAnswers,
): FinancialProfile {
  const transactions = parseStatement({ text, source: "mpesa_pdf" });
  const profile = buildProfile({ transactions, onboarding });
  const problem = validateImportedProfile(profile, transactions);
  if (problem) throw new Error(problem);
  return profile;
}
