import { describe, expect, it } from "vitest";
import { demoProfiles } from "./demo-profile";
import { assertInvestAmount, investAllowance } from "./invest-allowance";

describe("invest allowance", () => {
  it("caps Amina at her surplus floor", () => {
    const allowance = investAllowance(demoProfiles.amina);
    expect(allowance).toEqual({ ok: true, maxKes: 2000 });
    expect(() => assertInvestAmount(demoProfiles.amina, 2000)).not.toThrow();
    expect(() => assertInvestAmount(demoProfiles.amina, 2001)).toThrow(/2,000|2000/);
    expect(() => assertInvestAmount(demoProfiles.amina, 9)).toThrow(/between/);
  });

  it("blocks Brian because the buffer comes first", () => {
    const allowance = investAllowance(demoProfiles.brian);
    expect(allowance.ok).toBe(false);
    expect(() => assertInvestAmount(demoProfiles.brian, 10)).toThrow(/buffer/i);
  });
});
