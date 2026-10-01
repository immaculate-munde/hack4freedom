/**
 * App shell.
 *
 * Header matches Serene Shilling: mark, wordmark, on-phone line, EN / SW, profile.
 * The designed tabs are Overview, Surplus, Habit, and Learn.
 * Invest and Wallet stay in the side column so those flows remain reachable.
 * Welcome, questions, and import hide the tabs.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogoMark } from "./brand/LogoMark";

type Language = "en" | "sw";
type ShellCopy = (typeof copy)[Language];

const copy = {
  en: {
    brand: "PesaSense",
    stays: "Stays on your phone",
    profile: "Profile",
    language: "Language",
    overview: "Overview",
    surplus: "Surplus",
    habit: "Habit",
    learn: "Learn",
    invest: "Invest",
    wallet: "Wallet",
    nav: "Primary",
  },
  sw: {
    brand: "PesaSense",
    stays: "Inabaki kwenye simu yako",
    profile: "Wasifu",
    language: "Lugha",
    overview: "Muhtasari",
    surplus: "Ziada",
    habit: "Tabia",
    learn: "Jifunze",
    invest: "Wekeza",
    wallet: "Mkoba",
    nav: "Kuu",
  },
} as const;

const TABS = [
  {
    href: "/overview",
    key: "overview",
    match: (p: string) => p.startsWith("/overview"),
  },
  { href: "/surplus", key: "surplus", match: (p: string) => p.startsWith("/surplus") },
  { href: "/habit", key: "habit", match: (p: string) => p.startsWith("/habit") },
  { href: "/learn", key: "learn", match: (p: string) => p.startsWith("/learn") },
] as const;

function hidesNav(pathname: string): boolean {
  return (
    pathname === "/welcome" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/import")
  );
}

/** Shell around every screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const [language, setLanguage] = useState<Language>("en");
  const t = copy[language];

  return (
    <div className="app-shell">
      {quiet ? null : (
        <aside className="app-sidebar hidden lg:flex" aria-label={t.nav}>
          <div className="flex h-full flex-col gap-6 p-6">
            <Brand t={t} />
            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={tab.match(pathname) ? "page" : undefined}
                  className={`rounded-control px-3 py-2 text-sm font-semibold ${
                    tab.match(pathname) ? "bg-mint text-teal" : "text-slate"
                  }`}
                >
                  {t[tab.key]}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
              <Link
                href="/invest"
                className="rounded-control px-3 py-2 text-sm font-semibold text-slate"
              >
                {t.invest}
              </Link>
              <Link
                href="/wallet"
                className="rounded-control px-3 py-2 text-sm font-semibold text-slate"
              >
                {t.wallet}
              </Link>
            </div>
          </div>
        </aside>
      )}

      <div className="app-main-column">
        <header className="app-mobile-header">
          <div className="flex items-center justify-between gap-2">
            <Brand t={t} compact />
            <div className="flex shrink-0 items-center gap-1">
              <div role="group" aria-label={t.language} className="flex gap-1">
                <LangButton
                  label="EN"
                  pressed={language === "en"}
                  onClick={() => setLanguage("en")}
                />
                <LangButton
                  label="SW"
                  pressed={language === "sw"}
                  onClick={() => setLanguage("sw")}
                />
              </div>
              <button
                type="button"
                aria-label={t.profile}
                className="inline-flex h-tap w-tap items-center justify-center rounded-full text-ink"
              >
                <PersonIcon />
              </button>
            </div>
          </div>
        </header>

        <div className="app-content">{children}</div>

        {quiet ? null : (
          <nav className="app-mobile-nav safe-bottom lg:hidden" aria-label={t.nav}>
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-nav flex-1 flex-col items-center justify-center text-xs font-semibold ${
                    active ? "text-teal" : "text-slate"
                  }`}
                >
                  <span className={`rounded-full px-3 py-1 ${active ? "bg-mint" : ""}`}>
                    {t[tab.key]}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

function Brand({ t, compact = false }: { t: ShellCopy; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "px-1"}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <div>
        <p className="text-base font-semibold whitespace-nowrap text-ink">{t.brand}</p>
        <p className="text-xs font-semibold text-slate">{t.stays}</p>
      </div>
    </div>
  );
}

function LangButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-tap min-w-12 items-center justify-center rounded-full px-2 text-sm font-semibold ${
        pressed ? "bg-mint text-teal" : "text-slate"
      }`}
    >
      {label}
    </button>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle
        cx="12"
        cy="8"
        r="3.25"
        className="fill-none stroke-current"
        strokeWidth="1.75"
      />
      <path
        d="M5.5 19.25c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
        className="fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
