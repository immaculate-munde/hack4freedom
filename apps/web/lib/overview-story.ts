import type { FinancialProfile } from "@pesasense/core";

/** Short names from the statement for personal copy. */
export function topIncomeLabels(profile: FinancialProfile, limit = 2): string[] {
  return profile.income.sources
    .slice()
    .sort((a, b) => b.value.monthlyKes.typical - a.value.monthlyKes.typical)
    .slice(0, limit)
    .map((row) => row.value.label.trim())
    .filter(Boolean);
}

export function topCommitmentLabels(profile: FinancialProfile, limit = 3): string[] {
  return profile.commitments
    .slice()
    .sort((a, b) => b.amountKes - a.amountKes)
    .slice(0, limit)
    .map((row) => row.label.trim())
    .filter(Boolean);
}

export function topSpendCategories(profile: FinancialProfile, limit = 3): string[] {
  return profile.spending.byCategory
    .slice()
    .sort((a, b) => b.monthlyKes.typical - a.monthlyKes.typical)
    .slice(0, limit)
    .map((row) => row.category.trim())
    .filter(Boolean);
}

export function hasBusinessIncome(profile: FinancialProfile): boolean {
  return profile.income.sources.some((row) => row.value.kind === "business");
}

export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
