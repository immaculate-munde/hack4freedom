/**
 * Bitika signs "<unix seconds>.<raw body>" with HMAC-SHA256.
 * Header shape: t=<seconds>,v1=<hex>
 * Web Crypto keeps this out of the Node-only module graph the browser imports.
 */

const MAX_AGE_SECONDS = 300;

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyBitikaWebhook(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Date.now() / 1000,
): Promise<boolean> {
  if (!header || !secret || !globalThis.crypto?.subtle) return false;
  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const splitAt = piece.indexOf("=");
    if (splitAt <= 0) continue;
    parts.set(piece.slice(0, splitAt).trim(), piece.slice(splitAt + 1).trim());
  }
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;
  const stampedAt = Number(timestamp);
  if (!Number.isFinite(stampedAt) || Math.abs(nowSeconds - stampedAt) > MAX_AGE_SECONDS) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = hex(mac);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
