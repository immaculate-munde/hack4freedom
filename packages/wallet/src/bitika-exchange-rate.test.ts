import { describe, expect, it } from "vitest";
import { extractEstimatedSats, fetchMarketEstimateSats } from "./bitika-exchange-rate";

describe("extractEstimatedSats", () => {
  it("reads direct sats", () => {
    expect(extractEstimatedSats({ sats: 1200 }, 100)).toBe(1200);
  });

  it("scales when amount_kes differs", () => {
    expect(extractEstimatedSats({ amount_kes: 100, sats: 1200 }, 300)).toBe(3600);
  });

  it("reads kes_per_btc", () => {
    const sats = extractEstimatedSats({ kes_per_btc: 10_000_000 }, 100);
    expect(sats).toBe(1000);
  });

  it("reads nested BTC.KES", () => {
    const sats = extractEstimatedSats({ BTC: { KES: 10_000_000 } }, 100);
    expect(sats).toBe(1000);
  });
});

describe("fetchMarketEstimateSats", () => {
  it("uses bitcoin.co.ke btcpay rates", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ BTC: { KES: 10_000_000 } }), { status: 200 });
    const sats = await fetchMarketEstimateSats(100, fetchImpl);
    expect(sats).toBe(1000);
  });
});
