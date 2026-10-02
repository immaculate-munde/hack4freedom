/**
 * Web buys and USSD buys land in the same purchase index.
 * The in-memory map remains the webhook cache for this process.
 */

import type { OnRampPurchase } from "@pesasense/wallet";
import type { ProfileId, PurchaseSource } from "@pesasense/ussd";
import { rememberPurchase } from "./onramp-purchases";
import { getUssdStore } from "./ussd-server";

export function rememberSharedPurchase(input: {
  purchase: OnRampPurchase;
  phone: string;
  profileId: ProfileId;
  destination: string;
  source: PurchaseSource;
  atMs?: number;
}): void {
  rememberPurchase(input.purchase);
  const atMs = input.atMs ?? Date.now();
  try {
    getUssdStore().indexPurchase({
      purchaseId: input.purchase.purchaseId,
      phone: input.phone,
      profileId: input.profileId,
      amountKes: input.purchase.amountKes,
      amountSats: input.purchase.amountSats ?? null,
      destination: input.destination,
      status: input.purchase.status,
      source: input.source,
      createdAt: new Date(atMs).toISOString(),
      createdAtMs: atMs,
    });
  } catch (error) {
    console.info(
      JSON.stringify({
        source: "ussd",
        event: "index-failed",
        message: error instanceof Error ? error.name : "error",
      }),
    );
  }
}

export function syncSharedStatus(purchase: OnRampPurchase): void {
  rememberPurchase(purchase);
  getUssdStore().updatePurchase(purchase.purchaseId, {
    status: purchase.status,
    amountSats: purchase.amountSats ?? null,
    amountKes: purchase.amountKes,
  });
}
