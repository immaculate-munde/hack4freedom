"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "./brand/LogoMark";
import { SensiAvatar } from "./sensi-avatar";
import { SensiBubble } from "./sensi-bubble";

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

const SIDE_BASE = [
  { href: "/invest", key: "invest", match: (p: string) => p.startsWith("/invest") },
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
] as const;

const CHAMA_ITEM = { href: "/chama", key: "chama", match: (p: string) => p.startsWith("/chama") } as const;

function hidesNav(pathname: string): boolean {
  return (
    pathname === "/welcome" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/onboard")
  );
}

function hidesSensi(pathname: string): boolean {
  return pathname === "/welcome" || pathname.startsWith("/onboarding");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const [language, setLanguage] = useState<Language>("en");
  const [wantsChama, setWantsChama] = useState(false);
  const [isSensiOpen, setIsSensiOpen] = useState(false);
  const t = copy[language];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pesasense.onboarding");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setWantsChama(parsed.wantsChama === true);
    } catch {
    }
  }, []);

  const sideNav = wantsChama ? [...SIDE_BASE, CHAMA_ITEM] : SIDE_BASE;
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
                  className={`rounded-control px-3 py-2 text-sm font-semibold ${tab.match(pathname) ? "bg-moss/20 text-pine" : "text-slate"
                    }`}
                >
                  {t[tab.key]}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
              {sideNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.match(pathname) ? "page" : undefined}
                  className={`rounded-control px-3 py-2 text-sm font-semibold ${item.match(pathname) ? "bg-moss/20 text-pine" : "text-slate"
                    }`}
                >
                  {t[item.key]}
                </Link>
              ))}
            </div>
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pine text-paper"
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
                      className={`flex min-h-nav flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-pine" : "text-slate"
                    }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-moss/20" : ""
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

      {hidesSensi(pathname) ? null : (
        <>
          {isSensiOpen ? (
            <div
              role="dialog"
              aria-label="Sensi guide"
              className="fixed right-4 bottom-24 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-sand bg-paper p-4 shadow-2xl lg:right-6 lg:bottom-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SensiAvatar size="sm" mood="happy" />
                  <div>
                    <p className="text-sm font-semibold text-pine">Hi, I&apos;m Sensi</p>
                    <p className="text-xs text-slate">Your calm money guide</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Sensi"
                  onClick={() => setIsSensiOpen(false)}
                  className="btn inline-flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-slate"
                >
                  ×
                </button>
              </div>
              <SensiBubble tailPosition="bottom">
                Ask me anything as you explore PesaSense. I&apos;ll keep it simple.
              </SensiBubble>
              <div className="mt-3 grid gap-2">
                <button type="button" className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink">
                  Ask me about your surplus
                </button>
                <button type="button" className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink">
                  How does Bitcoin work?
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            aria-label="Open Sensi guide"
            aria-expanded={isSensiOpen}
            onClick={() => setIsSensiOpen((current) => !current)}
            className="btn fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-mint shadow-[0_8px_24px_rgb(13_122_115/0.2)] transition-all duration-200 hover:-translate-y-0.5 lg:right-6 lg:bottom-6"
          >
            <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
          </button>
        </>
      )}
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
      className={`inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold ${pressed ? "bg-paper text-pine shadow-card" : "text-slate"
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

function NavIcon({ name }: { name: "overview" | "surplus" | "habit" | "learn" }) {
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
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path strokeLinecap="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
    </svg>
  );
}
