import type { OnboardingAnswers } from "@pesasense/core";
import type { TelegramSession, TelegramStep } from "./types";

export function emptyOnboarding(): OnboardingAnswers {
  return {
    debts: [],
    chamaMemberships: [],
    goal: { kind: "other" },
  };
}

export function newSession(
  chatId: number,
  now: number,
  ttlMs: number,
  step: TelegramStep = "menu",
): TelegramSession {
  return {
    chatId,
    step,
    onboarding: emptyOnboarding(),
    profile: null,
    pendingPdfFileId: null,
    reminder: null,
    purchasePhone: null,
    purchaseDestination: null,
    updatedAt: now,
    expiresAt: now + ttlMs,
  };
}

export function touchSession(
  session: TelegramSession,
  now: number,
  ttlMs: number,
): TelegramSession {
  return {
    ...session,
    updatedAt: now,
    expiresAt: now + ttlMs,
  };
}
