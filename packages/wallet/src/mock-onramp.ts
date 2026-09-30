import type {
  BitcoinOnRamp,
  OnRampPurchase,
  OnRampQuote,
  QuoteRequest,
  StartPurchaseRequest,
} from "./onramp";

/** Stand-in adapter. Throws until a local demo purchase flow is wired on purpose. */
export class MockBitcoinOnRamp implements BitcoinOnRamp {
  getQuote(request: QuoteRequest): Promise<OnRampQuote> {
    throw new Error(
      `Not implemented: MockBitcoinOnRamp.getQuote (${request.amountKes} KES)`,
    );
  }

  startPurchase(request: StartPurchaseRequest): Promise<OnRampPurchase> {
    throw new Error(
      `Not implemented: MockBitcoinOnRamp.startPurchase (${request.idempotencyKey}, approved ${request.approvedByUser})`,
    );
  }

  checkStatus(purchaseId: string): Promise<OnRampPurchase> {
    throw new Error(`Not implemented: MockBitcoinOnRamp.checkStatus (${purchaseId})`);
  }
}
