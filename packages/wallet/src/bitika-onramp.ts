import {
  BITIKA_BASE_URL,
  BITIKA_MAX_KES,
  BITIKA_MIN_KES,
  assertBitikaKeyAllowed,
} from "./bitika-config";
import {
  extractEstimatedSats,
  fetchMarketEstimateSats,
} from "./bitika-exchange-rate";
import {
  normalizeBitikaTransaction,
  purchaseFromBitika,
} from "./bitika-status";
import type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  QuoteRequest,
  StartPurchaseRequest,
} from "./onramp";

export type BitikaFetch = typeof fetch;

export interface BitikaBitcoinOnRampOptions {
  apiKey: string;
  fetchImpl?: BitikaFetch;
}

async function bitikaRequest<T>(
  apiKey: string,
  path: string,
  init: RequestInit,
  fetchImpl: BitikaFetch,
  withJsonContentType: boolean,
): Promise<T> {
  assertBitikaKeyAllowed(apiKey);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
    ...(init.headers as Record<string, string>),
  };
  if (withJsonContentType) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetchImpl(`${BITIKA_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { reason?: string };
    if (body.reason === "liquidity") {
      throw new BitikaLiquidityError();
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bitika request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

function bitikaGet<T>(
  apiKey: string,
  path: string,
  fetchImpl: BitikaFetch,
): Promise<T> {
  return bitikaRequest(apiKey, path, { method: "GET" }, fetchImpl, false);
}

function bitikaPost<T>(
  apiKey: string,
  path: string,
  body: unknown,
  fetchImpl: BitikaFetch,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return bitikaRequest(
    apiKey,
    path,
    {
      method: "POST",
      headers: extraHeaders,
      body: JSON.stringify(body),
    },
    fetchImpl,
    true,
  );
}

export class BitikaLiquidityError extends Error {
  constructor() {
    super("Bitika is short of Bitcoin right now. Nothing was charged. Try again in a few minutes.");
    this.name = "BitikaLiquidityError";
  }
}

export class BitikaBitcoinOnRamp implements BitcoinOnRamp {
  private readonly apiKey: string;
  private readonly fetchImpl: BitikaFetch;

  constructor(options: BitikaBitcoinOnRampOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getQuote(request: QuoteRequest): Promise<OnRampQuote> {
    const amountKes = request.amountKes;
    if (amountKes < BITIKA_MIN_KES || amountKes > BITIKA_MAX_KES) {
      throw new Error(`Amount must be between ${BITIKA_MIN_KES} and ${BITIKA_MAX_KES} KES.`);
    }
    const estimatedSats = await this.fetchEstimatedSats(amountKes);
    return {
      amountKes,
      estimatedSats,
      fetchedAt: new Date().toISOString(),
    };
  }

  private async fetchEstimatedSats(amountKes: number): Promise<number> {
    const amountStr = String(amountKes);
    const getPaths = [
      `/api/v1/exchange/rate?amount=${amountStr}`,
      `/api/v1/exchange/rate?amount_kes=${amountStr}`,
      `/api/v1/exchange/rate?kes=${amountStr}`,
      `/api/v1/exchange/rate`,
    ];
    for (const path of getPaths) {
      try {
        const data = await bitikaGet<unknown>(this.apiKey, path, this.fetchImpl);
        const sats = extractEstimatedSats(data, amountKes);
        if (sats !== null && sats > 0) {
          return sats;
        }
      } catch {
        // try next shape
      }
    }

    const postBodies = [
      { amount: amountStr },
      { amount_kes: amountKes },
      { kes: amountKes },
    ];
    for (const body of postBodies) {
      try {
        const data = await bitikaPost<unknown>(
          this.apiKey,
          "/api/v1/exchange/rate",
          body,
          this.fetchImpl,
        );
        const sats = extractEstimatedSats(data, amountKes);
        if (sats !== null && sats > 0) {
          return sats;
        }
      } catch {
        // try next shape
      }
    }

    return fetchMarketEstimateSats(amountKes, this.fetchImpl);
  }

  async startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase> {
    if (request.approvedByUser !== true) {
      throw new Error("Purchase must be explicitly approved by the user.");
    }
    const amountKes = request.amountKes;
    if (amountKes < BITIKA_MIN_KES || amountKes > BITIKA_MAX_KES) {
      throw new Error(`Amount must be between ${BITIKA_MIN_KES} and ${BITIKA_MAX_KES} KES.`);
    }
    try {
      const data = await bitikaPost<unknown>(
        this.apiKey,
        "/api/v1/xwift/collect",
        {
          amount: String(amountKes),
          phone: request.payerPhone,
          lightningAddress: request.destination,
        },
        this.fetchImpl,
        { "Idempotency-Key": request.idempotencyKey },
      );
      const tx = normalizeBitikaTransaction(data);
      if (tx.amount_kes === undefined) {
        tx.amount_kes = amountKes;
      }
      return purchaseFromBitika(tx);
    } catch (err) {
      if (err instanceof BitikaLiquidityError) {
        return {
          purchaseId: request.idempotencyKey,
          status: "cannot_fill",
          amountKes,
          reason: err.message,
        };
      }
      throw err;
    }
  }

  async checkStatus(purchaseId: string): Promise<OnRampPurchase> {
    if (!purchaseId || purchaseId === "undefined") {
      throw new Error("Missing transaction code for status check.");
    }
    try {
      const data = await bitikaGet<unknown>(
        this.apiKey,
        `/api/v1/transactions/code/${encodeURIComponent(purchaseId)}`,
        this.fetchImpl,
      );
      return purchaseFromBitika(normalizeBitikaTransaction(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("(404)")) {
        return {
          purchaseId,
          status: "awaiting_mpesa",
          amountKes: 0,
          reason: "Waiting for Bitika to register this payment.",
        };
      }
      throw err;
    }
  }
}
