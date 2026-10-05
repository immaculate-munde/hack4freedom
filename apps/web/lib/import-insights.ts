import type { FinancialProfile } from "@pesasense/core";

export type ImportInsights = {
  periodLabel: string;
  monthsCovered: number;
  incomeTypical: number;
  incomeFloor: number;
  incomeCeiling: number;
  surplusFloor: number;
  surplusTypical: number;
  surplusCeiling: number;
  bufferFirst: boolean;
  monthsOfCushion: number;
  fulizaCount: number;
  borrowing: "none" | "occasional" | "frequent";
  incomeSources: Array<{ label: string; typical: number; regularity: string }>;
  commitments: Array<{
    label: string;
    category: string;
    amountKes: number;
    cadence: string;
    observations: number;
  }>;
  spendCategories: Array<{ category: string; typical: number }>;
  flexibleTypical: number;
  commitmentTotal: number;
  verdictKey: "bufferFirst" | "habitReady" | "thinHistory";
};

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Derive a clear post-import story from the built profile (no invented amounts). */
export function buildImportInsights(profile: FinancialProfile): ImportInsights {
  const incomeSources = profile.income.sources
    .slice(0, 5)
    .map((row) => ({
      label: row.value.label,
      typical: Math.round(row.value.monthlyKes.typical),
      regularity: row.value.regularity,
    }));

  const commitments = profile.commitments.slice(0, 8).map((c) => ({
    label: c.label,
    category: titleCase(c.category),
    amountKes: c.amountKes,
    cadence: c.cadence,
    observations: c.observations,
  }));

  const spendCategories = profile.spending.byCategory.slice(0, 5).map((row) => ({
    category: titleCase(row.category),
    typical: Math.round(row.monthlyKes.typical),
  }));

  const commitmentTotal = profile.commitments.reduce((sum, c) => sum + c.amountKes, 0);
  const bufferFirst = profile.resilience.bufferFirst || profile.surplus.bufferFirst;
  const monthsCovered = profile.window.monthsCovered;

  let verdictKey: ImportInsights["verdictKey"] = "habitReady";
  if (monthsCovered < 2) verdictKey = "thinHistory";
  else if (bufferFirst || profile.surplus.monthlyKes.floor <= 0) verdictKey = "bufferFirst";

  return {
    periodLabel: `${profile.window.from} – ${profile.window.to}`,
    monthsCovered,
    incomeTypical: Math.round(profile.income.monthlyKes.typical),
    incomeFloor: Math.round(profile.income.monthlyKes.floor),
    incomeCeiling: Math.round(profile.income.monthlyKes.ceiling),
    surplusFloor: Math.round(profile.surplus.monthlyKes.floor),
    surplusTypical: Math.round(profile.surplus.monthlyKes.typical),
    surplusCeiling: Math.round(profile.surplus.monthlyKes.ceiling),
    bufferFirst,
    monthsOfCushion: profile.resilience.monthsOfExpensesCovered,
    fulizaCount: profile.resilience.fulizaObservations,
    borrowing: profile.resilience.borrowingReliance,
    incomeSources,
    commitments,
    spendCategories,
    flexibleTypical: Math.round(profile.spending.flexibleMonthlyKes.typical),
    commitmentTotal,
    verdictKey,
  };
}
