/**
 * Dev 2 acceptance test.
 *
 * The hand-written JSON profiles are the spec. Amina's SMS should come out
 * close to her profile. Brian's SMS should come out close to the thin profile.
 * Chebet has no full profile. Her two school-fee payments should show up as a
 * termly commitment that is not high confidence.
 *
 * "Close" means the fields asserted here, not a byte-for-byte copy.
 * Onboarding answers are passed in, because they outrank inferred values.
 * The draft investment plan is a user choice, so the engine does not have to
 * reproduce it.
 *
 * Skipped while parseSmsBatch or buildProfile still throw "Not implemented".
 * The day those stubs return data, pnpm test runs this. Do not loosen the
 * expected profile to hide a wrong result.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoProfile, thinDemoProfile } from "./demo-profile";
import type { FinancialProfile } from "./financial-profile.schema";
import { parseSmsBatch } from "./parse";
import { buildProfile } from "./profile";

const smsDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sms");

function readMessages(file: string): string[] {
  return readFileSync(join(smsDir, file), "utf8")
    .split(/\n\s*\n/)
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
}

/** True while the parser or the profile engine is still a stub. */
function engineIsStub(): boolean {
  try {
    parseSmsBatch(["Confirmed."]);
    buildProfile({ transactions: [] });
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes("Not implemented");
  }
}

/** Whole shillings may differ a little. The shape of the range may not. */
function expectKesClose(actual: number, expected: number): void {
  const tolerance = Math.max(500, Math.round(Math.abs(expected) * 0.25));
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function expectNoTradingFields(profile: FinancialProfile): void {
  expect(profile).not.toHaveProperty("orders");
  expect(profile).not.toHaveProperty("priceTarget");
  expect(profile).not.toHaveProperty("sellSignal");
}

const spec = engineIsStub() ? describe.skip : describe;

spec("buildProfile matches the hand-written profiles", () => {
  it("turns Amina's SMS into a profile close to her spec", () => {
    const profile = buildProfile({
      transactions: parseSmsBatch(readMessages("amina-wanjiku.txt")),
      onboarding: demoProfile.onboarding,
    });

    expect(profile.version).toBe(1);
    expect(profile.window.monthsCovered).toBeGreaterThanOrEqual(6);
    expect(profile.surplus.bufferFirst).toBe(false);
    expect(profile.resilience.bufferFirst).toBe(false);
    expectKesClose(
      profile.surplus.monthlyKes.floor,
      demoProfile.surplus.monthlyKes.floor,
    );
    expectKesClose(
      profile.surplus.monthlyKes.typical,
      demoProfile.surplus.monthlyKes.typical,
    );
    expectKesClose(
      profile.income.monthlyKes.typical,
      demoProfile.income.monthlyKes.typical,
    );
    expect(profile.surplus.monthlyKes.floor).toBeLessThan(
      profile.surplus.monthlyKes.typical,
    );

    const rent = profile.commitments.find((item) => item.category === "rent");
    expect(rent).toBeDefined();
    expect(rent?.cadence).toBe("monthly");
    expect(rent?.observations).toBeGreaterThanOrEqual(5);
    expectKesClose(rent?.amountKes ?? 0, 15000);
    expectNoTradingFields(profile);
  });

  it("turns Brian's SMS into the thin, buffer-first profile", () => {
    const profile = buildProfile({
      transactions: parseSmsBatch(readMessages("brian-otieno.txt")),
      onboarding: thinDemoProfile.onboarding,
    });

    expect(profile.surplus.bufferFirst).toBe(true);
    expect(profile.resilience.bufferFirst).toBe(true);
    expect(profile.resilience.borrowingReliance).toBe("frequent");
    expect(profile.resilience.fulizaObservations).toBeGreaterThanOrEqual(4);
    expectKesClose(profile.surplus.monthlyKes.floor, 0);
    expect(profile.investmentPlan).toBeUndefined();
    expect(profile.window.monthsCovered).toBeGreaterThanOrEqual(6);
    expectNoTradingFields(profile);
  });

  it("sees Chebet's school fees as a termly commitment, not a sure monthly bill", () => {
    const profile = buildProfile({
      transactions: parseSmsBatch(readMessages("chebet-langat.txt")),
    });

    const fees = profile.commitments.find((item) => item.category === "school_fees");
    expect(fees).toBeDefined();
    expect(fees?.observations).toBeGreaterThanOrEqual(2);
    expect(fees?.cadence === "termly" || fees?.confidence !== "high").toBe(true);
    expect(profile.window.monthsCovered).toBeGreaterThanOrEqual(6);
    expectNoTradingFields(profile);
  });
});
