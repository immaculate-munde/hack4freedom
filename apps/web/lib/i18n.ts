import enChama from "../locales/en/chama.json";
import enCommon from "../locales/en/common.json";
import enErrors from "../locales/en/errors.json";
import enHabit from "../locales/en/habit.json";
import enImport from "../locales/en/import.json";
import enInvest from "../locales/en/invest.json";
import enLearn from "../locales/en/learn.json";
import enNav from "../locales/en/nav.json";
import enNotifications from "../locales/en/notifications.json";
import enOnboard from "../locales/en/onboard.json";
import enOnboarding from "../locales/en/onboarding.json";
import enOverview from "../locales/en/overview.json";
import enSensi from "../locales/en/sensi.json";
import enSettings from "../locales/en/settings.json";
import enSurplus from "../locales/en/surplus.json";
import enTrust from "../locales/en/trust.json";
import enWallet from "../locales/en/wallet.json";
import enWalletSetup from "../locales/en/walletSetup.json";
import enWelcome from "../locales/en/welcome.json";
import swChama from "../locales/sw/chama.json";
import swCommon from "../locales/sw/common.json";
import swErrors from "../locales/sw/errors.json";
import swHabit from "../locales/sw/habit.json";
import swImport from "../locales/sw/import.json";
import swInvest from "../locales/sw/invest.json";
import swLearn from "../locales/sw/learn.json";
import swNav from "../locales/sw/nav.json";
import swNotifications from "../locales/sw/notifications.json";
import swOnboard from "../locales/sw/onboard.json";
import swOnboarding from "../locales/sw/onboarding.json";
import swOverview from "../locales/sw/overview.json";
import swSensi from "../locales/sw/sensi.json";
import swSettings from "../locales/sw/settings.json";
import swSurplus from "../locales/sw/surplus.json";
import swTrust from "../locales/sw/trust.json";
import swWallet from "../locales/sw/wallet.json";
import swWalletSetup from "../locales/sw/walletSetup.json";
import swWelcome from "../locales/sw/welcome.json";

export type Locale = "en" | "sw";

export type TranslateVars = Record<string, string | number>;

export const LANGUAGE_STORAGE_KEY = "pesasense.language";

const catalogs: Record<Locale, Record<string, unknown>> = {
  en: {
    chama: enChama,
    common: enCommon,
    errors: enErrors,
    habit: enHabit,
    import: enImport,
    invest: enInvest,
    learn: enLearn,
    nav: enNav,
    notifications: enNotifications,
    onboard: enOnboard,
    onboarding: enOnboarding,
    overview: enOverview,
    sensi: enSensi,
    settings: enSettings,
    surplus: enSurplus,
    trust: enTrust,
    wallet: enWallet,
    walletSetup: enWalletSetup,
    welcome: enWelcome,
  },
  sw: {
    chama: swChama,
    common: swCommon,
    errors: swErrors,
    habit: swHabit,
    import: swImport,
    invest: swInvest,
    learn: swLearn,
    nav: swNav,
    notifications: swNotifications,
    onboard: swOnboard,
    onboarding: swOnboarding,
    overview: swOverview,
    sensi: swSensi,
    settings: swSettings,
    surplus: swSurplus,
    trust: swTrust,
    wallet: swWallet,
    walletSetup: swWalletSetup,
    welcome: swWelcome,
  },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "sw";
}

function dig(tree: unknown, parts: string[]): string | undefined {
  let current: unknown = tree;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function fill(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

/** English string when the active locale is missing a key, then the key itself. */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const parts = key.split(".");
  const local = dig(catalogs[locale], parts);
  const english = locale === "en" ? local : dig(catalogs.en, parts);
  return fill(local ?? english ?? key, vars);
}

export function localeTag(locale: Locale): string {
  return locale === "sw" ? "sw-KE" : "en-KE";
}
