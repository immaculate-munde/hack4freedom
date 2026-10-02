import {
  assertInvestAmount,
  investAllowance,
  type FinancialProfile,
  type InvestAllowance,
} from "@pesasense/core";

/** When false, buffer-first messaging and invest blocks are relaxed for this build. */
export function isBufferGateEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_BUFFER_GATE ?? process.env.BUFFER_GATE ?? "true";
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export function appInvestAllowance(profile: FinancialProfile): InvestAllowance {
  return investAllowance(profile, { respectBufferGate: isBufferGateEnabled() });
}

/** Whether overview should show cushion-first UX vs habit-ready UX. */
export function showBufferFirstUx(profile: FinancialProfile): boolean {
  return profile.surplus.bufferFirst && isBufferGateEnabled();
}

export function assertAppInvestAmount(profile: FinancialProfile, amountKes: number): void {
  assertInvestAmount(profile, amountKes, { respectBufferGate: isBufferGateEnabled() });
}
