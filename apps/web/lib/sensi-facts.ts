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
    `Months of M-Pesa history on this phone: ${facts.monthsCovered}`,
    `Typical monthly income (from profile): KES ${facts.incomeTypicalKes}`,
    `Safe money left after bills (floor): KES ${facts.surplusFloorKes}`,
    `Typical money left after bills: KES ${facts.surplusTypicalKes}`,
    `Higher money-left estimate (ceiling): KES ${facts.surplusCeilingKes}`,
    `Recurring bills / commitments counted: ${facts.commitmentCount}`,
    `Small Bitcoin habit amount: ${habit}`,
  ].join("\n");
}
