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
  | "menu"
  | "learn"
  | "ask_debt"
  | "ask_debt_name"
  | "ask_debt_amount"
  | "ask_chama"
  | "ask_chama_name"
  | "ask_chama_amount"
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
  /** Current Learn-about-Bitcoin page index while step is "learn". */
  learnPage: number | null;
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

/** Inline keyboard under a bot message (does not create a user bubble). */
export type InlineButton = {
  text: string;
  callbackData: string;
};

/**
 * Bot reply. Prefer `replyKeyboard` for Q&A choices — tapping sends that
 * label as a normal user message (user bubble). Inline `buttons` are optional
 * for awkward cases; they never appear as the user's chat bubble.
 */
export type TelegramReply = {
  text: string;
  /** ReplyKeyboardMarkup rows — each string is the exact text the user "sends". */
  replyKeyboard?: string[][];
  /** Hide the custom keyboard (free-text steps). */
  removeKeyboard?: boolean;
  /** Optional inline keyboard (callback); prefer replyKeyboard for primary choices. */
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
