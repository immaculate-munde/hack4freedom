"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredMnemonic,
  createNewMnemonic,
  loadStoredMnemonic,
  normalizeMnemonic,
  saveMnemonic,
} from "../lib/breez/mnemonic";
import {
  connectBreezWallet,
  disconnectBreezWallet,
  ensureLightningAddress,
  getBalanceSats,
  sendToLightningAddress,
} from "../lib/breez/sdk";

export type BreezWalletStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "no_api_key";

type BreezWalletContextValue = {
  status: BreezWalletStatus;
  lightningAddress: string | null;
  balanceSats: number;
  error: string | null;
  pendingMnemonic: string | null;
  refreshBalance: () => Promise<void>;
  createWallet: () => Promise<void>;
  confirmBackupAndUnlock: () => Promise<void>;
  restoreWallet: (mnemonic: string) => Promise<void>;
  unlockStoredWallet: () => Promise<void>;
  signOutWallet: () => Promise<void>;
  withdrawSats: (amountSats: number, lightningDestination: string) => Promise<void>;
};

const BreezWalletContext = createContext<BreezWalletContextValue | null>(null);

function hasBreezApiKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_BREEZ_API_KEY?.trim());
}

export function BreezWalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BreezWalletStatus>("idle");
  const [lightningAddress, setLightningAddress] = useState<string | null>(null);
  const [balanceSats, setBalanceSats] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!hasBreezApiKey()) {
      return;
    }
    const mnemonic = loadStoredMnemonic();
    if (!mnemonic) {
      return;
    }
    const sdk = await connectBreezWallet(mnemonic);
    const balance = await getBalanceSats(sdk);
    setBalanceSats(balance);
  }, []);

  const unlockWithMnemonic = useCallback(async (mnemonic: string) => {
    setError(null);
    setStatus("loading");
    try {
      if (!hasBreezApiKey()) {
        setStatus("no_api_key");
        return;
      }
      const sdk = await connectBreezWallet(mnemonic);
      const address = await ensureLightningAddress(sdk);
      const balance = await getBalanceSats(sdk);
      setLightningAddress(address);
      setBalanceSats(balance);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      const message = e instanceof Error ? e.message.trim() : "";
      setError(message && !/\s/.test(message) ? message : message || "walletSetup.openFailed");
    }
  }, []);

  const createWallet = useCallback(async () => {
    setError(null);
    if (!hasBreezApiKey()) {
      setStatus("no_api_key");
      return;
    }
    const mnemonic = createNewMnemonic();
    setPendingMnemonic(mnemonic);
    setStatus("idle");
  }, []);

  const confirmBackupAndUnlock = useCallback(async () => {
    if (!pendingMnemonic) {
      return;
    }
    const mnemonic = pendingMnemonic;
    saveMnemonic(mnemonic);
    setPendingMnemonic(null);
    await unlockWithMnemonic(mnemonic);
  }, [pendingMnemonic, unlockWithMnemonic]);

  const restoreWallet = useCallback(
    async (mnemonic: string) => {
      const normalized = normalizeMnemonic(mnemonic);
      saveMnemonic(normalized);
      setPendingMnemonic(null);
      await unlockWithMnemonic(normalized);
    },
    [unlockWithMnemonic],
  );

  const unlockStoredWallet = useCallback(async () => {
    const mnemonic = loadStoredMnemonic();
    if (!mnemonic) {
      setStatus("idle");
      return;
    }
    await unlockWithMnemonic(mnemonic);
  }, [unlockWithMnemonic]);

  const signOutWallet = useCallback(async () => {
    await disconnectBreezWallet();
    clearStoredMnemonic();
    setLightningAddress(null);
    setBalanceSats(0);
    setPendingMnemonic(null);
    setStatus("idle");
    setError(null);
  }, []);

  const withdrawSats = useCallback(
    async (amountSats: number, lightningDestination: string) => {
      const mnemonic = loadStoredMnemonic();
      if (!mnemonic) {
        throw new Error("walletSetup.unlockFirst");
      }
      const sdk = await connectBreezWallet(mnemonic);
      await sendToLightningAddress(sdk, lightningDestination, amountSats);
      const balance = await getBalanceSats(sdk);
      setBalanceSats(balance);
    },
    [],
  );

  useEffect(() => {
    if (!hasBreezApiKey()) {
      setStatus("no_api_key");
      return;
    }
    if (loadStoredMnemonic()) {
      void unlockStoredWallet();
    }
  }, [unlockStoredWallet]);

  const value = useMemo(
    () => ({
      status,
      lightningAddress,
      balanceSats,
      error,
      pendingMnemonic,
      refreshBalance,
      createWallet,
      confirmBackupAndUnlock,
      restoreWallet,
      unlockStoredWallet,
      signOutWallet,
      withdrawSats,
    }),
    [
      status,
      lightningAddress,
      balanceSats,
      error,
      pendingMnemonic,
      refreshBalance,
      createWallet,
      confirmBackupAndUnlock,
      restoreWallet,
      unlockStoredWallet,
      signOutWallet,
      withdrawSats,
    ],
  );

  return (
    <BreezWalletContext.Provider value={value}>{children}</BreezWalletContext.Provider>
  );
}

export function useBreezWallet(): BreezWalletContextValue {
  const ctx = useContext(BreezWalletContext);
  if (!ctx) {
    throw new Error("useBreezWallet must be used within BreezWalletProvider");
  }
  return ctx;
}
