/**
 * On-ramp contract.
 *
 * PesaSense never holds funds or keys. A purchase starts only after the user
 * approves it, and the sats go to a Lightning destination the user controls.
 * Bitika's real API is not documented here. Do not invent endpoints or payloads.
 * Map a partner response onto these types once the docs exist.
 */

/** A price request for a small buy. */
export interface QuoteRequest {
  /** Whole KES. The app caps this under the surplus floor before asking. */
  amountKes: number;
  /** Lightning address or invoice from a wallet the user controls. */
  destination: string;
}

/** A price the partner is willing to fill, for a short time. */
export interface OnRampQuote {
  quoteId: string;
  amountKes: number;
  estimatedSats: number;
  /** ISO date-time. The quote is unusable after this. */
  expiresAt: string;
}

/**
 * Starts a purchase. `approvedByUser` is required so a caller cannot
 * skip the manual approval step by omitting the field.
 */
export interface StartPurchaseRequest {
  quoteId: string;
  approvedByUser: true;
}

/** Where a purchase can sit. `cannot_fill` means try again later, not "failed forever". */
export type OnRampStatus =
  "pending_approval" | "submitted" | "filled" | "failed" | "cannot_fill";

/** The latest known state of one purchase. */
export interface OnRampPurchase {
  purchaseId: string;
  status: OnRampStatus;
  amountKes: number;
  amountSats?: number;
  /** Set when the partner cannot fill, for example when liquidity is tight. */
  reason?: string;
}

/**
 * A fiat-to-Bitcoin partner.
 * Phase 1 delivers to a Lightning address the user pasted. The app does not custody the sats.
 */
export interface BitcoinOnRamp {
  /**
   * Ask for a quote to buy `amountKes` and deliver it to `destination`.
   * Does not move money.
   */
  getQuote(request: QuoteRequest): Promise<OnRampQuote>;

  /**
   * Start a purchase the user has already approved.
   * Implementations must reject a call that is not explicitly approved.
   */
  startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase>;

  /**
   * Read the status of a purchase, including "cannot fill right now".
   */
  checkStatus(purchaseId: string): Promise<OnRampPurchase>;
}
