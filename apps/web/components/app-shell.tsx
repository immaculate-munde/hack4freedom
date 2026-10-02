"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "./brand/LogoMark";
import { CustomerRail } from "./customer-rail";
import { SensiAvatar } from "./sensi-avatar";
import { SensiBubble } from "./sensi-bubble";
import { ThemeToggle } from "./theme-toggle";

type Language = "en" | "sw";
type ShellCopy = (typeof copy)[Language];

const copy = {
  en: {
    brand: "PesaSense",
    stays: "Stays on your phone",
    customer: "Customer profile",
    profile: "Profile",
    closeProfile: "Close profile",
    language: "Language",
    overview: "Overview",
    surplus: "Surplus",
    habit: "Habit",
    learn: "Learn",
    invest: "Invest",
    wallet: "Wallet",
    chama: "Chama",
    nav: "Primary",
    encrypted: "Encrypted on your device.",
    phoneLine: "Your statements never leave your phone.",
    reminder: "We'll remind you on the 1st.",
    approve: "You approve each purchase.",
    review: "Review the habit",
    monthly: "Monthly",
    collapseNav: "Collapse the menu",
    expandNav: "Expand the menu",
  },
  sw: {
    brand: "PesaSense",
    stays: "Inabaki kwenye simu yako",
    customer: "Wasifu wa mteja",
    profile: "Wasifu",
    closeProfile: "Funga wasifu",
    language: "Lugha",
    overview: "Muhtasari",
    surplus: "Ziada",
    habit: "Tabia",
    learn: "Jifunze",
    invest: "Wekeza",
    wallet: "Mkoba",
    chama: "Chama",
    nav: "Kuu",
    encrypted: "Imesimbwa kwenye kifaa chako.",
    phoneLine: "Taarifa zako hazitoki kwenye simu.",
    reminder: "Tutakukumbusha tarehe ya 1.",
    approve: "Unakubali kila ununuzi.",
    review: "Tazama tabia",
    monthly: "Kila mwezi",
    collapseNav: "Funga menyu",
    expandNav: "Fungua menyu",
  },
} as const;

const TABS = [
  { href: "/overview", key: "overview", match: (p: string) => p.startsWith("/overview") },
  { href: "/surplus", key: "surplus", match: (p: string) => p.startsWith("/surplus") },
  { href: "/habit", key: "habit", match: (p: string) => p.startsWith("/habit") },
  { href: "/learn", key: "learn", match: (p: string) => p.startsWith("/learn") },
  { href: "/invest", key: "invest", match: (p: string) => p.startsWith("/invest") },
] as const;

const SIDE_BASE = [
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
] as const;

const CHAMA_ITEM = {
  href: "/chama",
  key: "chama",
  match: (p: string) => p.startsWith("/chama"),
} as const;

const NAV = [...TABS, ...SIDE_BASE, CHAMA_ITEM] as const;

type NavKey = (typeof NAV)[number]["key"];

function hidesNav(pathname: string): boolean {
  return pathname === "/welcome" || pathname === "/onboarding" || pathname === "/onboard";
}

function hidesSensi(pathname: string): boolean {
  return pathname === "/welcome" || pathname === "/onboarding" || pathname === "/onboard";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const [language, setLanguage] = useState<Language>("en");
  const [wantsChama, setWantsChama] = useState(false);
  const [isSensiOpen, setIsSensiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const t = copy[language];

  useEffect(() => {
    try {
      setNavCollapsed(localStorage.getItem("pesasense.nav-collapsed") === "true");
    } catch {
      setNavCollapsed(false);
    }
  }, []);

  function toggleNav() {
    setNavCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("pesasense.nav-collapsed", next ? "true" : "false");
      } catch {
        // The menu still toggles for this visit.
      }
      return next;
    });
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pesasense.onboarding");
      if (!raw) {
        setWantsChama(false);
        return;
      }
      const parsed = JSON.parse(raw) as {
        wantsChama?: unknown;
        draft?: { wantsChama?: unknown };
      };
      setWantsChama(parsed.wantsChama === true || parsed.draft?.wantsChama === true);
    } catch {
      setWantsChama(false);
    }
  }, [pathname]);

  const sideNav = wantsChama ? [...TABS, ...SIDE_BASE, CHAMA_ITEM] : [...TABS, ...SIDE_BASE];

  return (
    <div className="app-shell">
      {quiet ? null : (
        <aside
          className={`app-sidebar hidden lg:flex ${navCollapsed ? "app-sidebar-collapsed" : ""}`}
          aria-label={t.nav}
        >
          <div className={`flex h-full flex-col py-6 ${navCollapsed ? "px-2" : "px-4"}`}>
            <div className={`mb-8 flex items-center gap-3 ${navCollapsed ? "justify-center px-0" : "px-2"}`}>
              <button
                type="button"
                aria-label="Open Sensi guide"
                aria-expanded={isSensiOpen}
                onClick={() => setIsSensiOpen((current) => !current)}
                className="btn flex h-12 w-12 items-center justify-center rounded-full bg-[#f3efe4]"
              >
                <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
              </button>
              {navCollapsed ? null : (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#f6f1e4]">{t.brand}</p>
                  <p className="text-xs text-[#e3b23c]">{t.stays}</p>
                </div>
              )}
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-2">
              {sideNav.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={t[tab.key]}
                    className={`flex min-h-12 w-full flex-1 items-center rounded-2xl text-sm font-semibold ${
                      navCollapsed ? "justify-center px-0" : "gap-3 px-4"
                    } ${
                      active
                        ? "bg-[#f3efe4] text-pine"
                        : "text-[#f6f1e4]/85 hover:bg-white/10"
                    }`}
                  >
                    <NavIcon name={tab.key} />
                    {navCollapsed ? <span className="sr-only">{t[tab.key]}</span> : t[tab.key]}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto flex flex-col items-center gap-2 pt-4">
              {navCollapsed ? null : (
                <p className="px-3 pb-1 text-xs leading-5 text-[#f6f1e4]/75">{t.encrypted}</p>
              )}
              <button
                type="button"
                aria-pressed={navCollapsed}
                aria-label={navCollapsed ? t.expandNav : t.collapseNav}
                onClick={toggleNav}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f6f1e4] hover:bg-white/10"
              >
                <NavChevron collapsed={navCollapsed} />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="app-main-column">
        {quiet ? null : (
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
              <ThemeToggle />
              <ProfileMenu
                language={language}
                label={t.profile}
                open={profileOpen}
                onToggle={() => setProfileOpen((current) => !current)}
                onClose={() => setProfileOpen(false)}
              />
            </div>
          </div>
        </header>
        )}

        {quiet ? null : (
          <div className="desk-top hidden lg:flex">
            <p className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-pine">
              {t.phoneLine}
            </p>
            <p className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-slate">
              {t.monthly}
            </p>
            <p className="hidden rounded-full bg-paper px-4 py-2 text-xs font-semibold text-slate xl:block">
              {t.approve}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div
                role="group"
                aria-label={t.language}
                className="flex h-10 items-center rounded-full bg-paper px-1"
              >
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
              <ProfileMenu
                language={language}
                label={t.profile}
                open={profileOpen}
                onToggle={() => setProfileOpen((current) => !current)}
                onClose={() => setProfileOpen(false)}
              />
              <Link href="/habit" className="btn btn-accent rounded-full px-5 py-2">
                {t.review}
              </Link>
            </div>
          </div>
        )}

        <div className={quiet ? "app-content app-content-landing" : "app-content"}>{children}</div>

        {quiet ? null : (
          <nav className="app-mobile-nav safe-bottom lg:hidden" aria-label={t.nav}>
            {sideNav.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-nav flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    active ? "text-pine" : "text-slate"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full ${
                      active ? "bg-moss/20" : ""
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
              className="fixed right-4 bottom-24 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-sand bg-paper p-4 shadow-2xl lg:bottom-6 lg:right-6"
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
                <button
                  type="button"
                  className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink"
                >
                  Ask me about your surplus
                </button>
                <button
                  type="button"
                  className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink"
                >
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
            className="btn fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-[#f3efe4] shadow-[0_8px_24px_rgb(30_58_50/0.18)] lg:hidden"
          >
            <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
          </button>
        </>
      )}
    </div>
  );
}

function ProfileMenu({
  language,
  label,
  open,
  onToggle,
  onClose,
}: {
  language: Language;
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const closeLabel = copy[language].closeProfile;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pine text-paper"
      >
        <PersonIcon />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-30 mt-2 w-[min(18rem,calc(100vw-2rem))]">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn rounded-full bg-paper px-3 py-1 text-xs font-semibold text-slate shadow-card"
            >
              {closeLabel}
            </button>
          </div>
          <Suspense fallback={null}>
            <CustomerRail language={language} />
          </Suspense>
        </div>
      ) : null}
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
        pressed ? "bg-paper text-pine shadow-card" : "text-slate"
      }`}
    >
      {label}
    </button>
  );
}

function NavChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current">
      {collapsed ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 6l6 6-6 6" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 6l-6 6 6 6" />
      )}
    </svg>
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v3M8 5.5c-2.5 1.6-4 4.2-4 7.2A8 8 0 0 0 16.5 19"
        />
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
        <path
          strokeLinecap="round"
          d="M4.5 18.5c.7-2.4 2.2-3.5 3.5-3.5s2.8 1.1 3.5 3.5M12.5 18.5c.7-2.4 2.2-3.5 3.5-3.5s2.8 1.1 3.5 3.5"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z"
      />
      <path strokeLinecap="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
    </svg>
  );
}
