/**
 * Latest on-ramp status seen by this server process.
 * A webhook can fill it. Polling Bitika remains the backstop when another
 * instance handled the event, or when the process restarted.
 */

import type { OnRampPurchase, OnRampStatus } from "@pesasense/wallet";

const purchases = new Map<string, OnRampPurchase>();
const seenEventIds = new Set<string>();

const TERMINAL = new Set<OnRampStatus>([
  "filled",
  "failed",
  "paid_not_delivered",
  "cannot_fill",
]);

export function isTerminalPurchase(status: OnRampStatus): boolean {
  return TERMINAL.has(status);
}

export function recallPurchase(purchaseId: string): OnRampPurchase | undefined {
  return purchases.get(purchaseId);
}

export function rememberPurchase(purchase: OnRampPurchase): void {
  const existing = purchases.get(purchase.purchaseId);
  if (
    existing &&
    isTerminalPurchase(existing.status) &&
    !isTerminalPurchase(purchase.status)
  ) {
    return;
  }
  purchases.set(purchase.purchaseId, purchase);
}

/** Returns false when this event id was already applied. */
export function claimWebhookEvent(eventId: string): boolean {
  if (seenEventIds.has(eventId)) return false;
  seenEventIds.add(eventId);
  return true;
}

/** Let a failed follow-up write be retried by the provider. */
export function releaseWebhookEvent(eventId: string): void {
  seenEventIds.delete(eventId);
}
