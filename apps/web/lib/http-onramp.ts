import type { FinancialProfile } from "@pesasense/core";
import type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  QuoteRequest,
  StartPurchaseRequest,
} from "@pesasense/wallet";

/** Browser client for on-ramp API routes. Keys never leave the server. */
export class HttpOnRamp implements BitcoinOnRamp {
  async getQuote(request: QuoteRequest): Promise<OnRampQuote> {
    const res = await fetch("/api/onramp/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Could not fetch a quote.");
    }
    return (await res.json()) as OnRampQuote;
  }

  async startPurchase(
    request: StartPurchaseRequest & {
      profileId: string;
      profile?: FinancialProfile;
    },
  ): Promise<OnRampPurchase> {
    const res = await fetch("/api/onramp/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Could not start the purchase.");
    }
    return (await res.json()) as OnRampPurchase;
  }

  async checkStatus(purchaseId: string): Promise<OnRampPurchase> {
    const res = await fetch(`/api/onramp/status/${encodeURIComponent(purchaseId)}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Could not read purchase status.");
    }
    return (await res.json()) as OnRampPurchase;
  }
}
