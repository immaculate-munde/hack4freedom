/**
 * Demo data versus a profile built from statements.
 *
 * The web app reads PROFILE_SOURCE on the server. "demo" is the default.
 * "parsed" calls the real parser and profile engine, and never falls back
 * to a hand-written profile if that fails.
 */

import type { FinancialProfile, OnboardingAnswers } from "./financial-profile.schema";
import { parseSmsBatch } from "./parse";
import { buildProfile } from "./profile";

/** Which profile the screen should load. Anything other than "parsed" stays on demo data. */
export type ProfileSource = "demo" | "parsed";

/** What the caller is asking for. */
export type ProfileRequest =
  | { source: "demo"; profile: FinancialProfile }
  | {
      source: "parsed";
      messages: readonly string[];
      onboarding?: OnboardingAnswers;
    };

/** A profile ready to show, or an honest reason the parsed path is not ready. */
export type ProfileSelection =
  | { status: "ready"; profile: FinancialProfile; isDemo: boolean }
  | { status: "not-ready"; reason: string };

/**
 * Read the public env flag. Missing or unknown values stay on demo data
 * so the shell keeps working before ingestion exists.
 */
export function profileSourceFromEnv(value: string | undefined): ProfileSource {
  return value === "parsed" ? "parsed" : "demo";
}

/**
 * Pick the demo profile, or build one from messages.
 * An empty message list is not a profile. A thrown stub is not a profile either.
 */
export function selectProfile(request: ProfileRequest): ProfileSelection {
  if (request.source === "demo") {
    return { status: "ready", profile: request.profile, isDemo: true };
  }

  if (request.messages.length === 0) {
    return {
      status: "not-ready",
      reason: "No SMS or statement has been provided.",
    };
  }

  try {
    const transactions = parseSmsBatch(request.messages);
    const profile = buildProfile({
      transactions,
      onboarding: request.onboarding,
    });
    return { status: "ready", profile, isDemo: false };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Could not build a profile.";
    return { status: "not-ready", reason };
  }
}
