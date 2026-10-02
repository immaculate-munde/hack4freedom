/**
 * App shell.
 *
 * Every destination sits in one sidebar list: Overview, Surplus, Habit,
 * Learn, Invest, Wallet, and Chama. Welcome, questions, and the landing
 * page hide that nav.
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
    chama: "Chama",
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
    chama: "Chama",
    nav: "Kuu",
  },
} as const;

const NAV = [
  { href: "/overview", key: "overview", match: (p: string) => p.startsWith("/overview") },
  { href: "/surplus", key: "surplus", match: (p: string) => p.startsWith("/surplus") },
  { href: "/habit", key: "habit", match: (p: string) => p.startsWith("/habit") },
  { href: "/learn", key: "learn", match: (p: string) => p.startsWith("/learn") },
  { href: "/invest", key: "invest", match: (p: string) => p.startsWith("/invest") },
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
  { href: "/chama", key: "chama", match: (p: string) => p.startsWith("/chama") },
] as const;

type NavKey = (typeof NAV)[number]["key"];

function hidesNav(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/welcome" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/onboard")
  );
}

/** Shell around every screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const landing = pathname === "/";
  const [language, setLanguage] = useState<Language>("en");
  const t = copy[language];

  if (landing) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {quiet ? null : (
        <aside className="app-sidebar hidden lg:flex" aria-label={t.nav}>
          <div className="flex h-full flex-col p-5">
            <Brand t={t} />
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                      active ? "bg-mint text-teal" : "text-slate hover:bg-pearl hover:text-ink"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-white text-teal" : "bg-pearl text-slate"
                      }`}
                    >
                      <NavIcon name={tab.key} />
                    </span>
                    {t[tab.key]}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
              <LanguageSwitch language={language} label={t.language} onChange={setLanguage} />
              <button
                type="button"
                aria-label={t.profile}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal text-on-primary"
              >
                <PersonIcon />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="app-main-column">
        <header className="app-mobile-header lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Brand t={t} compact />
            <div className="flex shrink-0 items-center gap-2">
              <div
                role="group"
                aria-label={t.language}
                className="flex h-10 items-center rounded-full bg-pearl px-1"
              >
                <LangButton
                  label="EN"
                  pressed={language === "en"}
                  onClick={() => setLanguage("en")}
                />
                <span className="px-0.5 text-xs text-line" aria-hidden="true">
                  |
                </span>
                <LangButton
                  label="SW"
                  pressed={language === "sw"}
                  onClick={() => setLanguage("sw")}
                />
              </div>
              <button
                type="button"
                aria-label={t.profile}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal text-on-primary"
              >
                <PersonIcon />
              </button>
            </div>
          </div>
        </header>

        <div className="app-content">{children}</div>

        {quiet ? null : (
          <nav className="app-mobile-nav safe-bottom lg:hidden" aria-label={t.nav}>
            {NAV.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-nav w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    active ? "text-teal" : "text-slate"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full ${
                      active ? "bg-mint" : ""
                    }`}
                  >
                    <NavIcon name={tab.key} />
                  </span>
                  {t[tab.key]}
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

function LanguageSwitch({
  language,
  label,
  onChange,
}: {
  language: Language;
  label: string;
  onChange: (language: Language) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex h-10 items-center rounded-full bg-pearl px-1">
      <LangButton label="EN" pressed={language === "en"} onClick={() => onChange("en")} />
      <span className="px-0.5 text-xs text-line" aria-hidden="true">
        |
      </span>
      <LangButton label="SW" pressed={language === "sw"} onClick={() => onChange("sw")} />
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
      className={`inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold ${pressed ? "bg-white text-teal shadow-card" : "text-slate"
        }`}
    >
      {label}
    </button>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="8" r="3.25" className="fill-current" />
      <path
        d="M6 19.25c1.1-3.2 3.2-4.75 6-4.75s4.9 1.55 6 4.75"
        className="fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavIcon({ name }: { name: NavKey }) {
  const common = "h-4 w-4 fill-none stroke-current";
  if (name === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "surplus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path strokeLinecap="round" d="M3 10h18M7 15h4" />
      </svg>
    );
  }
  if (name === "habit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M8 5.5c-2.5 1.6-4 4.2-4 7.2A8 8 0 0 0 16.5 19" />
        <path strokeLinecap="round" d="M14 14.5 12 13V9" />
        <circle cx="17.5" cy="17.5" r="3.2" />
      </svg>
    );
  }
  if (name === "invest") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V10" />
        <path strokeLinecap="round" d="M12 13c0-4 3.2-6 6.5-6-1 4-3.2 6-6.5 6Z" />
        <path strokeLinecap="round" d="M12 15c0-3.2-2.6-5-5.4-5 1 3.2 2.6 5 5.4 5Z" />
      </svg>
    );
  }
  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path strokeLinecap="round" d="M3 10h18" />
        <circle cx="16.5" cy="14.5" r="1" className="fill-current stroke-none" />
      </svg>
    );
  }
  if (name === "chama") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <circle cx="8" cy="9" r="2.2" />
        <circle cx="16" cy="9" r="2.2" />
        <path strokeLinecap="round" d="M4.5 18.5c.7-2.4 2.2-3.5 3.5-3.5s2.8 1.1 3.5 3.5M12.5 18.5c.7-2.4 2.2-3.5 3.5-3.5s2.8 1.1 3.5 3.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path strokeLinecap="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
    </svg>
  );
}
