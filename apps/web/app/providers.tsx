"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { BreezWalletProvider } from "../contexts/breez-wallet-context";
import { ProfileProvider } from "../contexts/profile-context";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      document.documentElement.classList.toggle(
        "dark",
        localStorage.getItem("pesasense.theme") === "dark",
      );
    } catch {
      // Leave the light theme in place.
    }
  }, []);

  return (
    <ProfileProvider>
      <BreezWalletProvider>{children}</BreezWalletProvider>
    </ProfileProvider>
  );
}
