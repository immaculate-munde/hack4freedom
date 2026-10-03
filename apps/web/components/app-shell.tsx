"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../contexts/language-context";
import { CustomerRail } from "./customer-rail";
import { LanguageSwitcher } from "./language-switcher";
import { SensiAvatar } from "./sensi-avatar";
import { SensiBubble } from "./sensi-bubble";
import { ThemeToggle } from "./theme-toggle";

const PRIMARY = [
  { href: "/overview", key: "overview", match: (p: string) => p.startsWith("/overview") },
  { href: "/surplus", key: "surplus", match: (p: string) => p.startsWith("/surplus") },
  { href: "/habit", key: "habit", match: (p: string) => p.startsWith("/habit") },
  { href: "/learn", key: "learn", match: (p: string) => p.startsWith("/learn") },
] as const;

const MORE = [
  { href: "/invest", key: "invest", match: (p: string) => p.startsWith("/invest") },
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
  { href: "/chama", key: "chama", match: (p: string) => p.startsWith("/chama") },
] as const;

const NAV = [...PRIMARY, ...MORE] as const;

type NavKey = (typeof NAV)[number]["key"];

function hidesNav(pathname: string): boolean {
  return pathname === "/welcome" || pathname === "/onboarding" || pathname === "/onboard";
}

function hidesSensi(pathname: string): boolean {
  return pathname === "/welcome" || pathname === "/onboarding" || pathname === "/onboard";
}

function titleKey(pathname: string): string | null {
  if (pathname === "/" || pathname.startsWith("/welcome")) return "common.titles.welcome";
  if (pathname.startsWith("/onboarding")) return "common.titles.onboarding";
  if (pathname.startsWith("/onboard")) return "common.titles.onboard";
  if (pathname.startsWith("/overview")) return "common.titles.overview";
  if (pathname.startsWith("/surplus")) return "common.titles.surplus";
  if (pathname.startsWith("/habit")) return "common.titles.habit";
  if (pathname.startsWith("/learn")) return "common.titles.learn";
  if (pathname.startsWith("/invest")) return "common.titles.invest";
  if (pathname.startsWith("/wallet")) return "common.titles.wallet";
  if (pathname.startsWith("/chama")) return "common.titles.chama";
  if (pathname.startsWith("/trust")) return "common.titles.trust";
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const { locale, t } = useI18n();
  const [isSensiOpen, setIsSensiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((item) => item.match(pathname));

  useEffect(() => {
    const key = titleKey(pathname);
    const next = key ? `${t(key)} · PesaSense` : "PesaSense";
    const apply = () => {
      if (document.title !== next) document.title = next;
    };
    apply();
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(apply);
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, locale, t]);

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
        <aside
          className={`app-sidebar hidden lg:flex ${navCollapsed ? "app-sidebar-collapsed" : ""}`}
          aria-label={t("nav.nav")}
        >
          <div className={`flex h-full min-h-0 w-full flex-col py-6 ${navCollapsed ? "px-2" : "px-4"}`}>
            <div className={`mb-6 flex shrink-0 items-center gap-3 ${navCollapsed ? "justify-center px-0" : "px-2"}`}>
              <button
                type="button"
                aria-label={t("nav.openSensi")}
                aria-expanded={isSensiOpen}
                onClick={() => setIsSensiOpen((current) => !current)}
                className="btn flex h-12 w-12 items-center justify-center rounded-full bg-[#f3efe4]"
              >
                <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
              </button>
              {navCollapsed ? null : (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#f6f1e4]">{t("nav.brand")}</p>
                  <p className="text-xs text-[#e3b23c]">{t("nav.stays")}</p>
                </div>
              )}
            </div>
            <nav className="app-sidebar-nav flex min-h-0 flex-1 flex-col gap-1">
              {NAV.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={t(`nav.${tab.key}`)}
                    className={`flex h-11 w-full shrink-0 items-center rounded-2xl text-sm font-semibold ${
                      navCollapsed ? "justify-center px-0" : "gap-3 px-4"
                    } ${
                      active
                        ? "bg-[#f3efe4] text-pine"
                        : "text-[#f6f1e4]/85 hover:bg-white/10"
                    }`}
                  >
                    <NavIcon name={tab.key} />
                    {navCollapsed ? <span className="sr-only">{t(`nav.${tab.key}`)}</span> : t(`nav.${tab.key}`)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto flex shrink-0 flex-col items-center gap-2 pt-4">
              {navCollapsed ? null : (
                <p className="px-3 pb-1 text-xs leading-5 text-[#f6f1e4]/75">{t("nav.encrypted")}</p>
              )}
              <button
                type="button"
                aria-pressed={navCollapsed}
                aria-label={navCollapsed ? t("nav.expandNav") : t("nav.collapseNav")}
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
          <Brand />
          <div className="mobile-header-tools">
            <LanguageSwitcher tone="pearl" />
            <ThemeToggle />
            <ProfileMenu
              open={profileOpen}
              onToggle={() => setProfileOpen((current) => !current)}
              onClose={() => setProfileOpen(false)}
            />
          </div>
        </header>
        )}

        {quiet ? null : (
          <div className="desk-top hidden lg:flex">
            <p className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-pine">
              {t("nav.phoneLine")}
            </p>
            <p className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-slate">
              {t("nav.monthly")}
            </p>
            <p className="hidden rounded-full bg-paper px-4 py-2 text-xs font-semibold text-slate xl:block">
              {t("nav.approve")}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <ProfileMenu
                open={profileOpen}
                onToggle={() => setProfileOpen((current) => !current)}
                onClose={() => setProfileOpen(false)}
              />
              <Link href="/habit" className="btn btn-accent rounded-full px-5 py-2">
                {t("nav.review")}
              </Link>
            </div>
          </div>
        )}

        <div className={quiet ? "app-content app-content-landing" : "app-content"}>{children}</div>

        {quiet ? null : (
          <>
            {moreOpen ? (
              <div className="more-sheet-root lg:hidden">
                <button
                  type="button"
                  className="more-sheet-backdrop"
                  aria-label={t("nav.closeMore")}
                  onClick={() => setMoreOpen(false)}
                />
                <div id="more-sheet" className="more-sheet" role="dialog" aria-label={t("nav.moreMenu")}>
                  <p className="px-1 pb-2 text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
                    {t("nav.moreMenu")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {MORE.map((item) => {
                      const active = item.match(pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                            active ? "bg-mint text-pine" : "text-ink hover:bg-pearl"
                          }`}
                        >
                          <NavIcon name={item.key} />
                          {t(`nav.${item.key}`)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            <nav
              className="app-mobile-nav safe-bottom pb-[env(safe-area-inset-bottom)] lg:hidden"
              aria-label={t("nav.nav")}
            >
              {PRIMARY.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
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
                    {t(`nav.${tab.key}`)}
                  </Link>
                );
              })}
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="more-sheet"
                onClick={() => setMoreOpen((current) => !current)}
                className={`flex min-h-nav flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  moreOpen || moreActive ? "text-pine" : "text-slate"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full ${
                    moreOpen || moreActive ? "bg-moss/20" : ""
                  }`}
                >
                  <MoreIcon />
                </span>
                {t("nav.more")}
              </button>
            </nav>
          </>
        )}
      </div>

      {hidesSensi(pathname) ? null : (
        <>
          {isSensiOpen ? (
            <div
              role="dialog"
              aria-label={t("sensi.guide")}
              className="fixed right-4 bottom-24 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-sand bg-paper p-4 shadow-2xl lg:bottom-6 lg:right-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SensiAvatar size="sm" mood="happy" />
                  <div>
                    <p className="text-sm font-semibold text-pine">{t("sensi.hi")}</p>
                    <p className="text-xs text-slate">{t("sensi.calm")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t("sensi.close")}
                  onClick={() => setIsSensiOpen(false)}
                  className="btn inline-flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-slate"
                >
                  ×
                </button>
              </div>
              <SensiBubble tailPosition="bottom">
                {t("sensi.askAnything")}
              </SensiBubble>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink"
                >
                  {t("sensi.askSurplus")}
                </button>
                <button
                  type="button"
                  className="btn rounded-2xl border border-sand bg-surface px-3 py-2 text-left text-xs font-semibold text-ink"
                >
                  {t("sensi.howBitcoin")}
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            aria-label={t("nav.openSensi")}
            aria-expanded={isSensiOpen}
            onClick={() => setIsSensiOpen((current) => !current)}
            className={`btn fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-[#f3efe4] shadow-[0_8px_24px_rgb(30_58_50/0.18)] lg:hidden ${
              moreOpen ? "pointer-events-none invisible" : ""
            }`}
          >
            <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
          </button>
        </>
      )}
    </div>
  );
}

function ProfileMenu({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("nav.profile")}
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
              {t("nav.closeProfile")}
            </button>
          </div>
          <Suspense fallback={null}>
            <CustomerRail />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <div className="mobile-brand">
      <img src="/icon.svg" alt="" width={36} height={36} className="mobile-brand-mark" />
      <div>
        <p className="mobile-brand-name">{t("nav.brand")}</p>
        <p className="mobile-brand-stays">{t("nav.stays")}</p>
      </div>
    </div>
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

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
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
