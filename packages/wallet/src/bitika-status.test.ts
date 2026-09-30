import { describe, expect, it } from "vitest";
import {
  mapBitikaStatus,
  normalizeBitikaTransaction,
  purchaseFromBitika,
} from "./bitika-status";

describe("bitika status mapping", () => {
  it("maps processing to awaiting_mpesa", () => {
    expect(mapBitikaStatus("processing")).toBe("awaiting_mpesa");
  });

  it("maps payment_failed to paid_not_delivered", () => {
    expect(mapBitikaStatus("payment_failed")).toBe("paid_not_delivered");
  });

  it("normalizes amount string from collect response", () => {
    const tx = normalizeBitikaTransaction({
      transaction_code: "SBX-1",
      status: "fulfilled",
      amount: "1500",
      sats: 13378,
    });
    expect(tx.amount_kes).toBe(1500);
  });

  it("normalizes camelCase collect response", () => {
    const tx = normalizeBitikaTransaction({
      transactionCode: "SBX-ABC",
      status: "processing",
      amountKes: 100,
    });
    expect(tx.transaction_code).toBe("SBX-ABC");
  });

  it("builds purchase from payload", () => {
    const p = purchaseFromBitika({
      transaction_code: "SBX-ABC",
      status: "fulfilled",
      amount_kes: 100,
      sats: 1200,
      mpesa_receipt: "R1",
    });
    expect(p.status).toBe("filled");
    expect(p.amountSats).toBe(1200);
    expect(p.mpesaReceipt).toBe("R1");
  });
});
