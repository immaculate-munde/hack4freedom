/**
 * Parse Bitika (and similar) exchange rate JSON into estimated sats for a KES amount.
 */

export function extractEstimatedSats(data: unknown, amountKes: number): number | null {
  if (data === null || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  const direct =
    pickPositiveNumber(record.sats) ??
    pickPositiveNumber(record.estimated_sats) ??
    pickPositiveNumber(record.estimatedSats) ??
    pickPositiveNumber(record.satoshis) ??
    pickPositiveNumber(record.amount_sats) ??
    pickPositiveNumber(record.sats_for_amount);

  if (direct !== null) {
    const baseKes = pickPositiveNumber(record.amount_kes) ?? pickPositiveNumber(record.kes);
    if (baseKes !== null && baseKes !== amountKes && baseKes > 0) {
      return Math.round((direct * amountKes) / baseKes);
    }
    return Math.round(direct);
  }

  const kesPerBtc =
    pickPositiveNumber(record.kes_per_btc) ??
    pickPositiveNumber(record.rate_kes_per_btc) ??
    pickPositiveNumber(record.btc_kes) ??
    pickPositiveNumber(record.kes_per_bitcoin);

  if (kesPerBtc !== null) {
    return Math.round((amountKes / kesPerBtc) * 100_000_000);
  }

  const btc = record.BTC;
  if (btc !== null && typeof btc === "object") {
    const kes = pickPositiveNumber((btc as Record<string, unknown>).KES);
    if (kes !== null) {
      return Math.round((amountKes / kes) * 100_000_000);
    }
  }

  const nested = record.data ?? record.result ?? record.quote;
  if (nested !== undefined && nested !== data) {
    return extractEstimatedSats(nested, amountKes);
  }

  return null;
}

function pickPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return null;
}

const MARKET_RATE_URLS = [
  "https://trex.bitcoin.co.ke/btcpay/rates",
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=kes",
];

/** Public BTC/KES reference when Bitika rate shape is unknown. Display as approximate. */
export async function fetchMarketEstimateSats(
  amountKes: number,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  let lastError: Error | null = null;

  for (const url of MARKET_RATE_URLS) {
    try {
      const res = await fetchImpl(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Market rate HTTP ${res.status}`);
      }
      const data = (await res.json()) as unknown;
      const kesPerBtc = kesPerBtcFromMarketPayload(data);
      if (kesPerBtc === null) {
        throw new Error("Market rate JSON had no KES price.");
      }
      return Math.round((amountKes / kesPerBtc) * 100_000_000);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Could not fetch a market rate for KES.");
}

function kesPerBtcFromMarketPayload(data: unknown): number | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;

  const btc = record.BTC;
  if (btc !== null && typeof btc === "object") {
    const kes = pickPositiveNumber((btc as Record<string, unknown>).KES);
    if (kes !== null) {
      return kes;
    }
  }

  const bitcoin = record.bitcoin;
  if (bitcoin !== null && typeof bitcoin === "object") {
    const kes = pickPositiveNumber((bitcoin as Record<string, unknown>).kes);
    if (kes !== null) {
      return kes;
    }
  }

  return (
    pickPositiveNumber(record.kes_per_btc) ??
    pickPositiveNumber(record.rate_kes_per_btc) ??
    pickPositiveNumber(record.kes_per_bitcoin)
  );
}
