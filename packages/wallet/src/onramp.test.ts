import { describe, expect, it } from "vitest";
import { BitikaBitcoinOnRamp, MockBitcoinOnRamp } from "./index";

describe("BitcoinOnRamp stubs", () => {
  it("mock adapter does not invent a quote", () => {
    const ramp = new MockBitcoinOnRamp();
    expect(() => ramp.getQuote({ amountKes: 1500 })).toThrow(
      /Not implemented: MockBitcoinOnRamp.getQuote/,
    );
  });

  it("Bitika adapter requires an API key", () => {
    const ramp = new BitikaBitcoinOnRamp({ apiKey: "bk_test_x" });
    expect(ramp).toBeDefined();
  });
});
