/** True when this browser reports a network. Server renders are treated as online. */
export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/**
 * Stops a payment, wallet, or sync call before it can look successful.
 * The message is an i18n key with no spaces so existing error mappers translate it.
 */
export function assertOnline(): void {
  if (!isOnline()) {
    throw new Error("common.offlineAction");
  }
}
