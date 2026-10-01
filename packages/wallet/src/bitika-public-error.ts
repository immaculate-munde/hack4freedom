/**
 * Hide Bitika response bodies from the browser.
 * Our own validation messages stay visible.
 */

import { BitikaLiquidityError } from "./bitika-onramp";

export function clientSafeOnRampError(error: unknown, fallback: string): string {
  if (error instanceof BitikaLiquidityError) return error.message;
  if (error instanceof Error && error.message.startsWith("Bitika request failed")) {
    return fallback;
  }
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return fallback;
}
