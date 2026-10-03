"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { BreezWalletProvider } from "../contexts/breez-wallet-context";
import { LanguageProvider } from "../contexts/language-context";
import { ProfileProvider } from "../contexts/profile-context";
import type { Locale } from "../lib/i18n";

export function Providers({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
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
    <LanguageProvider initialLocale={locale}>
      <ProfileProvider>
        <BreezWalletProvider>{children}</BreezWalletProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}
