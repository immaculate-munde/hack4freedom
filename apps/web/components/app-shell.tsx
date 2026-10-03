/**
 * App shell.
 *
 * Header matches Serene Shilling: mark, wordmark, on-phone line, EN / SW, profile.
 * The designed tabs are Overview, Surplus, Habit, and Learn.
 * Invest, Wallet, and Chama follow those tabs in the desktop list.
 * On a phone they open from More. Welcome, questions, and import hide the tabs.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "./brand/LogoMark";

type Language = "en" | "sw";
type ShellCopy = (typeof copy)[Language];
type TabKey = (typeof TABS)[number]["key"];
type SideKey = (typeof SIDE)[number]["key"];

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
    more: "More",
    moreTitle: "More on this phone",
    moreClose: "Close",
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
    more: "Zaidi",
    moreTitle: "Zaidi kwenye simu hii",
    moreClose: "Funga",
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

const SIDE = [
  { href: "/invest", key: "invest", match: (p: string) => p.startsWith("/invest") },
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
  { href: "/chama", key: "chama", match: (p: string) => p.startsWith("/chama") },
] as const;

function hidesNav(pathname: string): boolean {
  return (
    pathname === "/welcome" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/import") ||
    pathname.startsWith("/onboard")
  );
}

function navLinkClass(active: boolean): string {
  return `rounded-control px-3 py-2 text-sm font-semibold ${
    active ? "bg-mint text-teal" : "text-slate"
  }`;
}

/** Shell around every screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const [language, setLanguage] = useState<Language>("en");
  const [moreOpen, setMoreOpen] = useState(false);
  const t = copy[language];
  const moreActive = SIDE.some((item) => item.match(pathname));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <div className="app-shell">
      {quiet ? null : (
        <aside className="app-sidebar hidden lg:flex lg:flex-col" aria-label={t.nav}>
          <div className="flex min-h-0 flex-col gap-6 p-6">
            <Brand t={t} />
            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={tab.match(pathname) ? "page" : undefined}
                  className={navLinkClass(tab.match(pathname))}
                >
                  {t[tab.key]}
                </Link>
              ))}
              <div className="my-3 border-t border-line" role="separator" />
              {SIDE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.match(pathname) ? "page" : undefined}
                  className={navLinkClass(item.match(pathname))}
                >
                  {t[item.key]}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <div className="app-main-column">
        <header className="app-mobile-header">
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
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-nav flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
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
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-current={moreActive ? "page" : undefined}
              onClick={() => setMoreOpen((open) => !open)}
              className={`flex min-h-nav flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                moreActive || moreOpen ? "text-teal" : "text-slate"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${
                  moreActive || moreOpen ? "bg-mint" : ""
                }`}
              >
                <NavIcon name="more" />
              </span>
              {t.more}
            </button>
          </nav>
        )}
      </div>

      {quiet || !moreOpen ? null : (
        <MoreSheet
          pathname={pathname}
          t={t}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}

function MoreSheet({
  pathname,
  t,
  onClose,
}: {
  pathname: string;
  t: ShellCopy;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.moreTitle}
      className="fixed inset-0 z-[35] lg:hidden"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <div className="pointer-events-auto mb-[calc(var(--spacing-nav)+0.75rem)] w-full max-w-md rounded-t-sheet border border-line bg-paper px-4 pb-5 pt-3 shadow-[0_12px_36px_-4px_rgb(15_23_42/0.08)]">
          <div
            className="mx-auto h-1 w-10 rounded-full bg-sand"
            aria-hidden="true"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
              {t.moreTitle}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-1 text-xs font-semibold text-slate"
            >
              {t.moreClose}
            </button>
          </div>
          <nav className="mt-3 flex flex-col gap-1">
            {SIDE.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold ${
                    active ? "bg-mint text-teal" : "text-ink"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      active ? "bg-white" : "bg-pearl"
                    }`}
                  >
                    <NavIcon name={item.key} />
                  </span>
                  {t[item.key]}
                </Link>
              );
            })}
          </nav>
        </div>
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
      className={`inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold ${
        pressed ? "bg-white text-teal shadow-card" : "text-slate"
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

function NavIcon({ name }: { name: TabKey | SideKey | "more" }) {
  const common = "h-5 w-5 fill-none stroke-current";
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
  if (name === "learn") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path strokeLinecap="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
      </svg>
    );
  }
  if (name === "invest") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 18 10 10l4 4 6-8" />
        <path strokeLinecap="round" d="M16 6h4v4" />
      </svg>
    );
  }
  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path strokeLinecap="round" d="M16 12.5h2" />
      </svg>
    );
  }
  if (name === "chama") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <circle cx="8" cy="9" r="2.4" />
        <circle cx="16" cy="9" r="2.4" />
        <circle cx="12" cy="15.5" r="2.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </svg>
  );
}
