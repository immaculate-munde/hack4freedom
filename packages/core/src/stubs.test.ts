/**
 * The stubs must fail loudly until each lane implements them.
 * A silent empty result would look like a person had no transactions.
 */

import { describe, expect, it } from "vitest";
import { parseSmsBatch, parseStatement } from "./parse";
import { buildProfile, computeSurplus } from "./profile";
import { runScenario } from "./scenario";
import { demoProfile } from "./demo-profile";

describe("core stubs", () => {
  it("refuses to pretend a statement was parsed", () => {
    expect(() => parseStatement({ text: "Confirmed.", source: "mpesa_pdf" })).toThrow(
      /Not implemented: parseStatement/,
    );
    expect(() => parseSmsBatch(["Confirmed."])).toThrow(
      /Not implemented: parseSmsBatch/,
    );
  });

  it("refuses to invent a profile, a surplus or a scenario", () => {
    expect(() => buildProfile({ transactions: [] })).toThrow(
      /Not implemented: buildProfile/,
    );
    expect(() =>
      computeSurplus({
        income: demoProfile.income,
        spending: demoProfile.spending,
        resilience: demoProfile.resilience,
      }),
    ).toThrow(/Not implemented: computeSurplus/);
    expect(() =>
      runScenario({ amountKes: 1500, cadence: "monthly", years: 3, prices: [] }),
    ).toThrow(/Not implemented: runScenario/);
  });
});
