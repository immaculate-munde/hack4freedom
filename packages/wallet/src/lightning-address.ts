/**
 * Lightning destination checks before any M-Pesa prompt is sent.
 */

const LIGHTNING_ADDRESS =
  /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const BOLT11 = /^ln(bc|tb|bcrt)[0-9a-z]+$/i;

const LNURL_BECH32 = /^lnurl[0-9a-z]+$/i;

export type DestinationKind = "lightning_address" | "invoice" | "lnurl";

export interface ParsedDestination {
  raw: string;
  kind: DestinationKind;
  /** Domain part for addresses, for example blink.sv */
  domain?: string;
}

export function parseDestination(raw: string): ParsedDestination {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Enter a Lightning address or invoice.");
  }
  if (BOLT11.test(trimmed)) {
    return { raw: trimmed, kind: "invoice" };
  }
  if (LNURL_BECH32.test(trimmed)) {
    return { raw: trimmed, kind: "lnurl" };
  }
  if (LIGHTNING_ADDRESS.test(trimmed)) {
    const domain = trimmed.split("@")[1];
    return { raw: trimmed, kind: "lightning_address", domain };
  }
  throw new Error(
    "This does not look like a Lightning address (name@wallet.com) or an invoice.",
  );
}

export interface ResolveResult {
  ok: true;
  domain: string;
  message: string;
}

/**
 * Optional network check: LNURL-pay well-known for a Lightning address.
 * Fails closed when the host cannot be reached.
 */
export async function resolveLightningAddress(
  address: string,
  fetchFn: typeof fetch = fetch,
): Promise<ResolveResult> {
  const parsed = parseDestination(address);
  if (parsed.kind !== "lightning_address" || !parsed.domain) {
    return {
      ok: true,
      domain: parsed.domain ?? "invoice",
      message: "Destination format looks valid.",
    };
  }
  const parts = address.split("@");
  const name = parts[0];
  const domain = parts[1];
  if (!name || !domain) {
    throw new Error("We could not find this wallet. Check the Lightning address and try again.");
  }
  const url = `https://${domain}/.well-known/lnurlp/${name}`;
  const res = await fetchFn(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      "We could not find this wallet. Check the Lightning address and try again.",
    );
  }
  return {
    ok: true,
    domain,
    message: `Sats will go to a wallet at ${domain}.`,
  };
}
