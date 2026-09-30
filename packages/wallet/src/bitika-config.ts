export const BITIKA_BASE_URL = "https://bitikaserver.up.railway.app";

export const BITIKA_MIN_KES = 10;
export const BITIKA_MAX_KES = 10_000;

export function assertBitikaKeyAllowed(apiKey: string): void {
  if (apiKey.startsWith("bk_live_") && process.env.BITIKA_ALLOW_LIVE !== "true") {
    throw new Error(
      "Live Bitika key is blocked in this environment. Use bk_test_ locally or set BITIKA_ALLOW_LIVE=true only in production.",
    );
  }
}

export function bitikaModeFromKey(apiKey: string): "sandbox" | "live" {
  return apiKey.startsWith("bk_test_") ? "sandbox" : "live";
}
