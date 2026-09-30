/**
 * Bitika adapter placeholder.
 *
 * Bitika sells Bitcoin for M-Pesa and Airtel Money and can deliver to Lightning.
 * Liquidity has been limited at times, so a real adapter must surface "cannot fill".
 *
 * TODO(bitika): API docs have not been supplied. Do not invent endpoints, auth, or payloads.
 * Implement getQuote, startPurchase and checkStatus against the docs when they arrive.
 */

import type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  QuoteRequest,
  StartPurchaseRequest,
} from "./onramp";

/** Real partner adapter. Unusable until the Bitika docs are in the repo. */
export class BitikaBitcoinOnRamp implements BitcoinOnRamp {
  /** @inheritdoc */
  getQuote(request: QuoteRequest): Promise<OnRampQuote> {
    throw new Error(
      `TODO: Bitika API docs are not supplied. Refusing getQuote for ${request.amountKes} KES.`,
    );
  }

  /** @inheritdoc */
  startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase> {
    throw new Error(
      `TODO: Bitika API docs are not supplied. Refusing startPurchase for quote ${request.quoteId}.`,
    );
  }

  /** @inheritdoc */
  checkStatus(purchaseId: string): Promise<OnRampPurchase> {
    throw new Error(
      `TODO: Bitika API docs are not supplied. Refusing checkStatus for ${purchaseId}.`,
    );
  }
}
