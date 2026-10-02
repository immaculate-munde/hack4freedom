/**
 * Scenario engine stays unimplemented. Parser and profile builders are real.
 */

import { describe, expect, it } from "vitest";
import { parseSmsBatch, parseStatement } from "./parse";
import { buildProfile, computeSurplus } from "./profile";
import { runScenario } from "./scenario";
import { demoProfile } from "./demo-profile";

describe("core stubs", () => {
  it("returns no transactions for nonsense SMS", () => {
    expect(parseStatement({ text: "Confirmed.", source: "mpesa_pdf" })).toEqual([]);
    expect(parseSmsBatch(["Confirmed."])).toEqual([]);
  });

  it("refuses to invent a profile, a surplus or a scenario", () => {
    expect(() => buildProfile({ transactions: [] })).toThrow(
      /Cannot build a profile from zero transactions/,
    );
    expect(() =>
      computeSurplus({
        income: demoProfile.income,
        spending: demoProfile.spending,
        resilience: demoProfile.resilience,
      }),
    ).not.toThrow();
    expect(() =>
      runScenario({ amountKes: 1500, cadence: "monthly", years: 3, prices: [] }),
    ).toThrow(/Not implemented: runScenario/);
  });
});
