import { describe, expect, it } from "vitest";
import { BitikaLiquidityError } from "./bitika-onramp";
import { clientSafeOnRampError } from "./bitika-public-error";

describe("clientSafeOnRampError", () => {
  it("hides an upstream response body but explains known status codes", () => {
    const error = new Error('Bitika request failed (500): {"phone":"254712345678"}');
    expect(clientSafeOnRampError(error, "Bitika could not complete that request.")).toBe(
      "Bitika could not complete that request.",
    );
    expect(
      clientSafeOnRampError(
        new Error('Bitika request failed (400): {"message":"bad"}'),
        "fallback",
      ),
    ).toMatch(/refused the M-Pesa collect/);
  });

  it("keeps a liquidity explanation and our own validation text", () => {
    expect(clientSafeOnRampError(new BitikaLiquidityError(), "fallback")).toMatch(/short of Bitcoin/);
    expect(clientSafeOnRampError(new Error("Choose a known demo profile."), "fallback")).toBe(
      "Choose a known demo profile.",
    );
  });
});
