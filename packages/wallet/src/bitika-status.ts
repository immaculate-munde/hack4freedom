import type { OnRampPurchase, OnRampStatus } from "./onramp";

export interface BitikaTransactionPayload {
  transaction_code: string;
  status: string;
  amount_kes?: number;
  sats?: number;
  decline_reason?: string | null;
  mpesa_receipt?: string | null;
}

export function mapBitikaStatus(raw: string): OnRampStatus {
  switch (raw) {
    case "processing":
      return "awaiting_mpesa";
    case "processing_payment":
      return "sending_sats";
    case "fulfilled":
      return "filled";
    case "failed":
      return "failed";
    case "payment_failed":
      return "paid_not_delivered";
    default:
      return "awaiting_mpesa";
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

/** Bitika may return snake_case or camelCase, sometimes nested under `data`. */
export function normalizeBitikaTransaction(data: unknown): BitikaTransactionPayload {
  if (data === null || typeof data !== "object") {
    throw new Error("Bitika returned an invalid transaction payload.");
  }

  const record = data as Record<string, unknown>;
  const nested = record.data;
  const source =
    nested !== null && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : record;

  const transaction_code =
    readString(source.transaction_code) ??
    readString(source.transactionCode) ??
    readString(source.code);

  const status = readString(source.status) ?? "processing";

  if (!transaction_code) {
    throw new Error("Bitika did not return a transaction code.");
  }

  return {
    transaction_code,
    status,
    amount_kes:
      readNumber(source.amount_kes) ??
      readNumber(source.amountKes) ??
      readNumber(source.amount),
    sats: readNumber(source.sats),
    decline_reason:
      readString(source.decline_reason) ?? readString(source.declineReason) ?? null,
    mpesa_receipt:
      readString(source.mpesa_receipt) ?? readString(source.mpesaReceipt) ?? null,
  };
}

export function purchaseFromBitika(data: BitikaTransactionPayload): OnRampPurchase {
  return {
    purchaseId: data.transaction_code,
    status: mapBitikaStatus(data.status),
    amountKes: data.amount_kes ?? 0,
    amountSats: data.sats,
    reason: data.decline_reason ?? undefined,
    mpesaReceipt: data.mpesa_receipt ?? undefined,
  };
}
