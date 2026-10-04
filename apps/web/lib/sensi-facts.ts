import type { FinancialProfile } from "@pesasense/core";

/**
 * Numbers taken only from the device profile. The model must not invent figures.
 */
export type SensiFacts = {
  surplusFloorKes: number;
  surplusTypicalKes: number;
  surplusCeilingKes: number;
  habitKes: number | null;
  habitCadence: "weekly" | "monthly" | null;
  incomeTypicalKes: number;
  commitmentCount: number;
  monthsCovered: number;
};

export function factsFromProfile(profile: FinancialProfile): SensiFacts {
  const plan = profile.investmentPlan;
  return {
    surplusFloorKes: Math.round(profile.surplus.monthlyKes.floor),
    surplusTypicalKes: Math.round(profile.surplus.monthlyKes.typical),
    surplusCeilingKes: Math.round(profile.surplus.monthlyKes.ceiling),
    habitKes:
      plan && plan.amountKes > 0 && Number.isInteger(plan.amountKes)
        ? plan.amountKes
        : null,
    habitCadence: plan?.cadence === "weekly" || plan?.cadence === "monthly" ? plan.cadence : null,
    incomeTypicalKes: Math.round(profile.income.monthlyKes.typical),
    commitmentCount: profile.commitments.length,
    monthsCovered: profile.window.monthsCovered,
  };
}

export function factsPromptBlock(facts: SensiFacts): string {
  const habit =
    facts.habitKes != null && facts.habitCadence
      ? `KES ${facts.habitKes} / ${facts.habitCadence}`
      : "not set";
  return [
    `Months covered: ${facts.monthsCovered}`,
    `Typical monthly income (profile): KES ${facts.incomeTypicalKes}`,
    `Safe surplus floor: KES ${facts.surplusFloorKes}`,
    `Typical surplus: KES ${facts.surplusTypicalKes}`,
    `Surplus ceiling: KES ${facts.surplusCeilingKes}`,
    `Recurring commitments counted: ${facts.commitmentCount}`,
    `Bitcoin habit: ${habit}`,
  ].join("\n");
}
