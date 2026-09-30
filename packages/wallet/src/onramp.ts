/**
 * On-ramp contract aligned with Bitika's collect flow.
 * PesaSense never holds funds. Every purchase requires explicit user approval.
 */

/** A price hint for a small buy. Not a binding quote from Bitika. */
export interface QuoteRequest {
  /** Whole KES. The app caps this under the surplus floor before asking. */
  amountKes: number;
}

export interface OnRampQuote {
  amountKes: number;
  estimatedSats: number;
  /** ISO date-time when the rate was fetched. */
  fetchedAt: string;
}

export interface StartPurchaseRequest {
  amountKes: number;
  /** Canonical M-Pesa phone: 2547XXXXXXXX */
  payerPhone: string;
  /** Lightning address, BOLT11, or LNURL. */
  destination: string;
  approvedByUser: true;
  idempotencyKey: string;
}

export type OnRampStatus =
  | "awaiting_mpesa"
  | "sending_sats"
  | "filled"
  | "failed"
  | "paid_not_delivered"
  | "cannot_fill";

export interface OnRampPurchase {
  purchaseId: string;
  status: OnRampStatus;
  amountKes: number;
  amountSats?: number;
  reason?: string;
  mpesaReceipt?: string;
}

export interface BitcoinOnRamp {
  getQuote(request: QuoteRequest): Promise<OnRampQuote>;
  startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase>;
  checkStatus(purchaseId: string): Promise<OnRampPurchase>;
}
