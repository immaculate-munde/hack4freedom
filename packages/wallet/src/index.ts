/**
 * Wallet package entry.
 * The on-ramp interface lives here so the web app never talks to a partner directly.
 */

export type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  OnRampStatus,
  QuoteRequest,
  StartPurchaseRequest,
} from "./onramp";

export { MockBitcoinOnRamp } from "./mock-onramp";
export { BitikaBitcoinOnRamp } from "./bitika-onramp";
