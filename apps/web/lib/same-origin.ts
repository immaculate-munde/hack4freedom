/** Browser writes from another site are rejected. Non-browser clients omit Origin. */

export function isCrossSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim();
  if (!host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
