import { BitikaBitcoinOnRamp, bitikaModeFromKey } from "@pesasense/wallet";

export function getBitikaRamp(): BitikaBitcoinOnRamp {
  const apiKey = process.env.BITIKA_API_KEY;
  if (!apiKey) {
    throw new Error("BITIKA_API_KEY is not configured.");
  }
  return new BitikaBitcoinOnRamp({ apiKey });
}

export function bitikaMode(): "sandbox" | "live" | "missing" {
  const apiKey = process.env.BITIKA_API_KEY;
  if (!apiKey) return "missing";
  return bitikaModeFromKey(apiKey);
}
