export interface UssdConfig {
  provider: string;
  /** When set, the request serviceCode must match. */
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

/** Shown in the app when the provider has not assigned a code yet. */
export function publicServiceCode(env: Record<string, string | undefined>): {
  code: string;
  configured: boolean;
} {
  const code = blankToNull(env.USSD_SERVICE_CODE);
  if (code) return { code, configured: true };
  return { code: "*384*40401#", configured: false };
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
