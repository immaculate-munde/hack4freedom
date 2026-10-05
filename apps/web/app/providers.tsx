"use client";

import type { ReactNode } from "react";
import { BreezWalletProvider } from "../contexts/breez-wallet-context";
import { LanguageProvider } from "../contexts/language-context";
import { ProfileProvider } from "../contexts/profile-context";
import { ThemePreferenceSync } from "../components/theme-toggle";
import type { Locale } from "../lib/i18n";

export function Providers({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <LanguageProvider initialLocale={locale}>
      <ThemePreferenceSync />
      <ProfileProvider>
        <BreezWalletProvider>{children}</BreezWalletProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}
