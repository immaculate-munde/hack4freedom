import { createHash, timingSafeEqual } from "node:crypto";

export function apiKeysMatch(provided: string, expected: string): boolean {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function validSessionId(sessionId: string): boolean {
  return /^[A-Za-z0-9:._-]{6,128}$/.test(sessionId);
}

/** Whole USSD text is numeric menu input. Letters never belong in this flow. */
export function validUssdText(text: string): boolean {
  return text.length <= 120 && (text === "" || /^[0-9*]+$/.test(text));
}
