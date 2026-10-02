/**
 * USSD can only show a short Lightning address.
 * Invoices are refused here. The web invest screen can still pay an invoice.
 */

import { parseDestination } from "@pesasense/wallet";

const MAX_LENGTH = 80;

export function ussdDestination(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) return null;
  try {
    const parsed = parseDestination(trimmed);
    if (parsed.kind !== "lightning_address" || !parsed.domain) return null;
    if (parsed.domain.endsWith(".invalid")) return null;
    return parsed.raw;
  } catch {
    return null;
  }
}
