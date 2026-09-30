"use client";

import { BREEZ_STORAGE_DIR } from "./constants";

type BreezSdk = import("@breeztech/breez-sdk-spark/web").BreezSdk;

let initDone = false;
let sdkSingleton: BreezSdk | null = null;
let connectPromise: Promise<BreezSdk> | null = null;

async function loadBreezWasm() {
  const breez = await import(
    /* webpackMode: "lazy" */
    "@breeztech/breez-sdk-spark/web"
  );
  if (!initDone) {
    await breez.default();
    initDone = true;
  }
  return breez;
}

function breezApiKey(): string {
  const key = process.env.NEXT_PUBLIC_BREEZ_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_BREEZ_API_KEY is missing. Request a free key at breez.technology and add it to apps/web/.env.local.",
    );
  }
  return key;
}

export async function connectBreezWallet(mnemonic: string): Promise<BreezSdk> {
  if (sdkSingleton) {
    return sdkSingleton;
  }
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    const { defaultConfig, connect } = await loadBreezWasm();
    const config = defaultConfig("mainnet");
    config.apiKey = breezApiKey();
    const sdk = await connect({
      config,
      seed: { type: "mnemonic", mnemonic: mnemonic.trim() },
      storageDir: BREEZ_STORAGE_DIR,
    });
    sdkSingleton = sdk;
    return sdk;
  })();

  try {
    return await connectPromise;
  } catch (e) {
    connectPromise = null;
    sdkSingleton = null;
    throw e;
  }
}

export async function disconnectBreezWallet(): Promise<void> {
  if (sdkSingleton) {
    await sdkSingleton.disconnect();
  }
  sdkSingleton = null;
  connectPromise = null;
}

export async function ensureLightningAddress(sdk: BreezSdk): Promise<string> {
  const existing = await sdk.getLightningAddress();
  if (existing?.lightningAddress) {
    return existing.lightningAddress;
  }

  const username = `ps${Math.random().toString(36).slice(2, 10)}`;
  const registered = await sdk.registerLightningAddress({
    username,
    description: "PesaSense wallet",
  });
  return registered.lightningAddress;
}

export async function getBalanceSats(sdk: BreezSdk): Promise<number> {
  const info = await sdk.getInfo({ ensureSynced: true });
  return info.balanceSats;
}

export async function sendToLightningAddress(
  sdk: BreezSdk,
  destination: string,
  amountSats: number,
): Promise<void> {
  if (amountSats <= 0) {
    throw new Error("Enter a positive sats amount.");
  }
  const prepare = await sdk.prepareSendPayment({
    paymentRequest: { type: "input", input: destination },
    amount: BigInt(amountSats),
    feePolicy: "feesIncluded",
  });
  await sdk.sendPayment({
    prepareResponse: prepare,
    idempotencyKey: crypto.randomUUID(),
  });
  await sdk.getInfo({ ensureSynced: true });
}
