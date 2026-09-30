/**
 * Demo profile loader.
 *
 * Amina Wanjiku is invented. The JSON fixture is the single source of her profile
 * so the app and the tests cannot drift apart.
 *
 * Surplus math, in whole KES, so the fixture stays checkable:
 * fixed commitments 21,500 (rent 15,000 + study loan 3,000 + power 1,500 + chama 2,000).
 * Worst month: income floor 40,000 − 21,500 − flexible ceiling 16,500 = surplus floor 2,000.
 * Typical month: 45,000 − 21,500 − 12,000 = 11,500.
 * Best month: 48,000 − 21,500 − flexible floor 11,000 = 15,500.
 * A scheduled buy must stay under the floor, so the draft plan is 1,500.
 * One Fuliza use is in the SMS. It does not make borrowing look frequent.
 * Scenarios stay empty until runScenario exists. This file does not invent a backtest.
 */

import type { FinancialProfile } from "./financial-profile.schema";
import amina from "./fixtures/profiles/amina.profile.json";

/**
 * JSON imports widen literals (`1` becomes `number`), so `satisfies` cannot
 * see the contract. Check the version, then trust the fixture.
 * The fixture test still checks the surplus range and the plan cap.
 */
function loadDemoProfile(value: unknown): FinancialProfile {
  if (typeof value !== "object" || value === null || !("version" in value)) {
    throw new Error("Demo profile must be an object");
  }
  if (value.version !== 1) {
    throw new Error("Demo profile must be contract version 1");
  }
  return value as FinancialProfile;
}

/** Synthetic profile used by the demo shell. Not a real person. */
export const demoProfile = loadDemoProfile(amina);
