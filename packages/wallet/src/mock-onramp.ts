/**
 * Mock on-ramp.
 *
 * Lets the invest screen be built before any partner is connected.
 * It does not return a fake fill. A fake fill would look like Bitcoin was bought.
 */

import type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  QuoteRequest,
  StartPurchaseRequest,
} from "./onramp";

/** Stand-in adapter. Throws until the demo purchase flow is implemented on purpose. */
export class MockBitcoinOnRamp implements BitcoinOnRamp {
  /** @inheritdoc */
  getQuote(request: QuoteRequest): Promise<OnRampQuote> {
    throw new Error(
      `Not implemented: MockBitcoinOnRamp.getQuote (${request.amountKes} KES to ${request.destination})`,
    );
  }

  /** @inheritdoc */
  startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase> {
    throw new Error(
      `Not implemented: MockBitcoinOnRamp.startPurchase (${request.quoteId}, approved ${request.approvedByUser})`,
    );
  }

  /** @inheritdoc */
  checkStatus(purchaseId: string): Promise<OnRampPurchase> {
    throw new Error(`Not implemented: MockBitcoinOnRamp.checkStatus (${purchaseId})`);
  }
}
