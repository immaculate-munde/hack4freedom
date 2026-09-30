/**
 * Shared money and transaction types.
 *
 * Every package depends on these shapes. Amounts are whole Kenyan shillings
 * so we never split a shilling in the product logic.
 */

/** How sure the profile engine is about an inferred value. */
export type Confidence = "high" | "medium" | "low";

/**
 * An inferred value plus the evidence behind it.
 * The user can confirm or correct it. A confirmation outranks the inference.
 */
export interface Detected<T> {
  value: T;
  confidence: Confidence;
  /** How many times this showed up in the history. */
  observations: number;
  /** Set when the user has confirmed or corrected the value. */
  userConfirmed?: boolean;
}

/**
 * A spread of amounts, never a single prediction.
 * `floor` is the low end, `typical` the middle, `ceiling` the high end.
 */
export interface KesRange {
  floor: number;
  typical: number;
  ceiling: number;
}

/** What kind of M-Pesa movement a parsed line represents. */
export type TransactionKind =
  | "send"
  | "receive"
  | "paybill"
  | "buy_goods"
  | "airtime"
  | "withdraw"
  | "deposit"
  | "fuliza"
  | "other";

/** One parsed transaction from an M-Pesa or bank statement. */
export interface Transaction {
  id: string;
  /** ISO date-time. */
  date: string;
  /** Always positive. Direction says whether money came in or went out. */
  amountKes: number;
  direction: "in" | "out";
  /** Merchant, paybill or person label, when the text has one. */
  counterparty?: string;
  kind: TransactionKind;
  balanceKes?: number;
  /**
   * Original text. Stays on the device.
   * Never send this field to a server or a model.
   */
  raw: string;
}
