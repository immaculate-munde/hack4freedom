"use client";

import type { ReactNode } from "react";
import { BreezWalletProvider } from "../contexts/breez-wallet-context";

export function Providers({ children }: { children: ReactNode }) {
  return <BreezWalletProvider>{children}</BreezWalletProvider>;
}
