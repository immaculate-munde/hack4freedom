"use client";

import type { ReactNode } from "react";
import { BreezWalletProvider } from "../contexts/breez-wallet-context";
import { ProfileProvider } from "../contexts/profile-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <BreezWalletProvider>{children}</BreezWalletProvider>
    </ProfileProvider>
  );
}
