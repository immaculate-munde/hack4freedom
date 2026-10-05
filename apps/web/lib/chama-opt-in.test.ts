import { describe, expect, it } from "vitest";
import { readOnboardingChamaIntent } from "./chama-opt-in";

describe("readOnboardingChamaIntent", () => {
  it("returns true when wantsChama is true", () => {
    expect(
      readOnboardingChamaIntent(
        JSON.stringify({ wantsChama: true, draft: { wantsChama: true, inChama: false } }),
      ),
    ).toBe(true);
  });

  it("returns true when already in a chama", () => {
    expect(
      readOnboardingChamaIntent(
        JSON.stringify({
          wantsChama: false,
          draft: { wantsChama: false, inChama: true },
          answers: { chamaMemberships: [{ name: "Sisters", monthlyContributionKes: 500 }] },
        }),
      ),
    ).toBe(true);
  });

  it("returns false when both are declined", () => {
    expect(
      readOnboardingChamaIntent(
        JSON.stringify({
          wantsChama: false,
          draft: { wantsChama: false, inChama: false },
          answers: { chamaMemberships: [] },
        }),
      ),
    ).toBe(false);
  });

  it("returns null when skipped", () => {
    expect(
      readOnboardingChamaIntent(
        JSON.stringify({ draft: { wantsChama: null, inChama: null }, answers: { chamaMemberships: [] } }),
      ),
    ).toBeNull();
  });
});
