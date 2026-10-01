/**
 * Turn an on-ramp update into the profile's wallet history.
 * A paid-but-not-delivered buy stays `failed`: the contract has no extra status.
 */

import type { WalletEvent, WalletEventStatus } from "./financial-profile.schema";

export type RecordedPurchaseStatus =
  | "quoted"
  | "awaiting_mpesa"
  | "sending_sats"
  | "filled"
  | "failed"
  | "paid_not_delivered"
  | "cannot_fill";

export function walletEventStatus(progress: RecordedPurchaseStatus): WalletEventStatus {
  switch (progress) {
    case "quoted":
      return "quoted";
    case "awaiting_mpesa":
    case "sending_sats":
      return "submitted";
    case "filled":
      return "filled";
    case "failed":
    case "paid_not_delivered":
      return "failed";
    case "cannot_fill":
      return "cannot_fill";
  }
}

export function walletEventFromPurchase(input: {
  id: string;
  at: string;
  amountKes?: number;
  amountSats?: number;
  destination?: string;
  progress: RecordedPurchaseStatus;
  approvedByUser: boolean;
}): WalletEvent {
  return {
    id: input.id,
    at: input.at,
    kind: "purchase",
    amountKes: input.amountKes,
    amountSats: input.amountSats,
    status: walletEventStatus(input.progress),
    destination: input.destination,
    approvedByUser: input.approvedByUser,
  };
}
