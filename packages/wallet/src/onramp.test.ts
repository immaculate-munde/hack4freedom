/**
 * The on-ramp stubs must not report a successful buy.
 */

import { describe, expect, it } from "vitest";
import { BitikaBitcoinOnRamp, MockBitcoinOnRamp } from "./index";

describe("BitcoinOnRamp stubs", () => {
  it("mock adapter does not invent a quote", () => {
    const ramp = new MockBitcoinOnRamp();
    expect(() =>
      ramp.getQuote({ amountKes: 1500, destination: "amina@walletdemo.invalid" }),
    ).toThrow(/Not implemented: MockBitcoinOnRamp.getQuote/);
  });

  it("Bitika adapter stays blocked until docs exist", () => {
    const ramp = new BitikaBitcoinOnRamp();
    expect(() => ramp.checkStatus("purchase-demo")).toThrow(
      /Bitika API docs are not supplied/,
    );
  });
});
