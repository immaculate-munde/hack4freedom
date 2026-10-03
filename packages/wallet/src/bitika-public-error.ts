/**
 * Hide Bitika response bodies from the browser.
 * Our own validation messages stay visible.
 */

import { BitikaLiquidityError } from "./bitika-onramp";

function bitikaUpstreamHint(message: string): string | null {
  const match = message.match(/Bitika request failed \((\d+)\)/);
  const code = match?.[1];
  if (code === "403") {
    return "Bitika refused this key (403). Live keys need Bitika approval, active status, and no IP allowlist blocking your server.";
  }
  if (code === "400") {
    return "Bitika refused the M-Pesa collect (400). On live keys, confirm approval in the Bitika dashboard, use a real Safaricom number, and a valid Lightning address. Quotes can still work when collect does not.";
  }
  if (code === "401") {
    return "Bitika rejected the API key (401). Check BITIKA_API_KEY in apps/web/.env.local and restart the dev server.";
  }
  if (code === "429") {
    return "Bitika rate limit (429). Wait a moment and try again.";
  }
  return null;
}

/** Stable key when Bitika's status code is one we explain. Null for other failures. */
export function clientSafeOnRampCode(error: unknown): string | null {
  if (!(error instanceof Error) || !error.message.startsWith("Bitika request failed")) {
    return null;
  }
  const match = error.message.match(/Bitika request failed \((\d+)\)/);
  const status = match?.[1];
  if (status === "403") return "errors.bitika403";
  if (status === "400") return "errors.bitika400";
  if (status === "401") return "errors.bitika401";
  if (status === "429") return "errors.bitika429";
  return null;
}

export function clientSafeOnRampError(error: unknown, fallback: string): string {
  if (error instanceof BitikaLiquidityError) return error.message;
  if (error instanceof Error && error.message.startsWith("Bitika request failed")) {
    return bitikaUpstreamHint(error.message) ?? fallback;
  }
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return fallback;
}
