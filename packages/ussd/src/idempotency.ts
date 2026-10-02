import { createHash } from "node:crypto";

/** Stable UUID so a gateway retry hits Bitika's idempotency key instead of a second collect. */
export function ussdIdempotencyKey(sessionId: string, amountKes: number): string {
  const digest = createHash("sha256")
    .update(`pesasense-ussd:${sessionId}:${amountKes}`)
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
