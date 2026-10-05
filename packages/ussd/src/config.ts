/** Live short codes. The callback accepts either one even when USSD_SERVICE_CODE names only one of them. */
export const HARDCODED_SERVICE_CODES = ["*384*65246#", "*789*12350#"] as const;

export interface UssdConfig {
  provider: string;
  /** Extra short code from the environment. The hardcoded codes are always accepted too. */
  serviceCode: string | null;
  apiKey: string | null;
  /** Production fails closed when no key is configured. */
  requireApiKey: boolean;
  sessionTtlMs: number;
  maxRequestsPerMinute: number;
  maxBuysPerHour: number;
}

const DEFAULT_TTL_SECONDS = 180;

export function ussdConfigFromEnv(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): UssdConfig {
  const apiKey = blankToNull(env.USSD_API_KEY);
  const ttlSeconds = positiveInt(env.USSD_SESSION_TTL_SECONDS, DEFAULT_TTL_SECONDS);
  return {
    provider: blankToNull(env.USSD_PROVIDER) ?? "africastalking",
    serviceCode: blankToNull(env.USSD_SERVICE_CODE),
    apiKey,
    requireApiKey: nodeEnv === "production" || apiKey !== null,
    sessionTtlMs: ttlSeconds * 1000,
    maxRequestsPerMinute: positiveInt(env.USSD_MAX_REQUESTS_PER_MINUTE, 20),
    maxBuysPerHour: positiveInt(env.USSD_MAX_BUYS_PER_HOUR, 3),
  };
}

/** True when this dialed code may open a session. */
export function serviceCodeAllowed(inbound: string, configured: string | null): boolean {
  if ((HARDCODED_SERVICE_CODES as readonly string[]).includes(inbound)) return true;
  if (!configured) return true;
  return inbound === configured;
}

/** Shown on the handset card. Both live codes are real, not a placeholder. */
export function publicServiceCode(env: Record<string, string | undefined>): {
  code: string;
  configured: boolean;
} {
  const extra = blankToNull(env.USSD_SERVICE_CODE);
  const codes: string[] = [...HARDCODED_SERVICE_CODES];
  if (extra && !codes.includes(extra)) codes.push(extra);
  return { code: codes.join(" / "), configured: true };
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) return fallback;
  return parsed;
}
