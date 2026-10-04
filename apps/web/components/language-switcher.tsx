"use client";

import { useI18n } from "../contexts/language-context";
import type { Locale } from "../lib/i18n";

export function LanguageSwitcher({ tone = "paper" }: { tone?: "paper" | "pearl" }) {
  const { locale, setLocale, t } = useI18n();
  const background = tone === "pearl" ? "bg-pearl" : "bg-paper";

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={`flex h-10 items-center rounded-full px-1 ${background}`}
    >
      <LocaleButton label="EN" locale="en" pressed={locale === "en"} onSelect={setLocale} />
      {tone === "pearl" ? (
        <span className="px-1 text-xs text-slate" aria-hidden="true">
          |
        </span>
      ) : null}
      <LocaleButton label="SW" locale="sw" pressed={locale === "sw"} onSelect={setLocale} />
    </div>
  );
}

function LocaleButton({
  label,
  locale,
  pressed,
  onSelect,
}: {
  label: string;
  locale: Locale;
  pressed: boolean;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onSelect(locale)}
      className={`locale-option inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold ${
        pressed ? "bg-brass text-on-accent shadow-card" : "text-slate"
      }`}
    >
      {label}
    </button>
  );
}
