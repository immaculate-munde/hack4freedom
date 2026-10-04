/**
 * Telegram session and message shapes for the bot path.
 * Financial profiles stay in @pesasense/core. This package only holds chat state.
 */

import type {
  BuyCadence,
  FinancialProfile,
  OnboardingAnswers,
} from "@pesasense/core";

/** Conversation step for one Telegram chat. */
export type TelegramStep =
  | "ask_debt"
  | "ask_chama"
  | "ask_goal"
  | "awaiting_import"
  | "awaiting_pdf_password"
  | "ready"
  | "habit_amount"
  | "habit_cadence"
  | "invest_phone"
  | "invest_destination"
  | "invest_confirm";

export type TelegramSession = {
  chatId: number;
  step: TelegramStep;
  onboarding: OnboardingAnswers;
  /** Full profile for this chat after import or demo. Cleared on /start. */
  profile: FinancialProfile | null;
  /** Pending PDF file_id while waiting for the user-supplied password. */
  pendingPdfFileId: string | null;
  reminder: {
    dayOfMonth: 1;
    amountKes: number;
    cadence: BuyCadence;
    status: "chosen";
    setAt: string;
  } | null;
  purchasePhone: string | null;
  purchaseDestination: string | null;
  updatedAt: number;
  expiresAt: number;
};

export type InlineButton = {
  text: string;
  callbackData: string;
};

export type TelegramReply = {
  text: string;
  buttons?: InlineButton[][];
};

export type TelegramInbound =
  | { kind: "command"; command: string; args: string }
  | { kind: "text"; text: string }
  | { kind: "callback"; data: string }
  | {
      kind: "document";
      fileId: string;
      fileName: string;
      mimeType: string | null;
    };

export type TelegramPurchaseInput = {
  amountKes: number;
  phone: string;
  destination: string;
  approvedByUser: true;
  idempotencyKey: string;
  profile: FinancialProfile;
};

export type TelegramPurchaseResult = {
  purchaseId: string;
  status: string;
  amountKes: number;
  amountSats?: number;
};
