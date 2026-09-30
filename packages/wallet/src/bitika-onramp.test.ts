import { describe, expect, it, vi } from "vitest";
import { BitikaBitcoinOnRamp } from "./bitika-onramp";

describe("BitikaBitcoinOnRamp", () => {
  const apiKey = "bk_test_000000000000";

  it("sends collect with idempotency key and canonical phone", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/exchange/rate")) {
        return new Response(JSON.stringify({ sats: 1500 }), { status: 200 });
      }
      if (url.includes("/xwift/collect")) {
        const headers = init?.headers as Record<string, string>;
        expect(headers["Idempotency-Key"]).toBe("idem-1");
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        expect(body.phone).toBe("254712345678");
        expect(body.lightningAddress).toBe("user@blink.sv");
        return new Response(
          JSON.stringify({ transaction_code: "SBX-1", status: "processing" }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected ${url}`);
    });

    const ramp = new BitikaBitcoinOnRamp({ apiKey, fetchImpl });
    const purchase = await ramp.startPurchase({
      amountKes: 100,
      payerPhone: "254712345678",
      destination: "user@blink.sv",
      approvedByUser: true,
      idempotencyKey: "idem-1",
    });
    expect(purchase.purchaseId).toBe("SBX-1");
    expect(purchase.status).toBe("awaiting_mpesa");
  });

});
