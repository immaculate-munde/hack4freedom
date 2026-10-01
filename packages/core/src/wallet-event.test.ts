import { describe, expect, it } from "vitest";
import { walletEventFromPurchase, walletEventStatus } from "./wallet-event";

describe("wallet event status", () => {
  it("keeps a quote and an in-flight payment distinct from a fill", () => {
    expect(walletEventStatus("quoted")).toBe("quoted");
    expect(walletEventStatus("awaiting_mpesa")).toBe("submitted");
    expect(walletEventStatus("sending_sats")).toBe("submitted");
    expect(walletEventStatus("filled")).toBe("filled");
  });

  it("records an unpaid failure and a paid-but-missing payout as failed", () => {
    expect(walletEventStatus("failed")).toBe("failed");
    expect(walletEventStatus("paid_not_delivered")).toBe("failed");
    expect(walletEventStatus("cannot_fill")).toBe("cannot_fill");
  });

  it("builds a purchase event without inventing sats", () => {
    const event = walletEventFromPurchase({
      id: "SBX-1",
      at: "2026-10-01T10:00:00.000Z",
      amountKes: 100,
      destination: "user@blink.sv",
      progress: "awaiting_mpesa",
      approvedByUser: true,
    });
    expect(event).toEqual({
      id: "SBX-1",
      at: "2026-10-01T10:00:00.000Z",
      kind: "purchase",
      amountKes: 100,
      amountSats: undefined,
      status: "submitted",
      destination: "user@blink.sv",
      approvedByUser: true,
    });
  });
});
