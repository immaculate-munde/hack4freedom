"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../contexts/language-context";
import { readChamaOptIn } from "../lib/chama-opt-in";
import { CustomerRail } from "./customer-rail";
import { HabitReminderBanner } from "./habit-reminder-banner";
import { LanguageSwitcher } from "./language-switcher";
import { PwaExperience } from "./pwa-experience";
import { SensiAvatar } from "./sensi-avatar";
import { ThemeToggle } from "./theme-toggle";

type NavItem = {
  href: string;
  key: "overview" | "surplus" | "habit" | "learn" | "wallet" | "chama";
  match: (p: string) => boolean;
};

/** Habit matches /habit and /invest — one continuous surplus → buy journey. */
const PRIMARY: readonly NavItem[] = [
  { href: "/overview", key: "overview", match: (p) => p.startsWith("/overview") },
  { href: "/surplus", key: "surplus", match: (p) => p.startsWith("/surplus") },
  {
    href: "/habit",
    key: "habit",
    match: (p) => p.startsWith("/habit") || p.startsWith("/invest"),
  },
  { href: "/learn", key: "learn", match: (p) => p.startsWith("/learn") },
];

const MORE_BASE: readonly NavItem[] = [
  { href: "/wallet", key: "wallet", match: (p) => p.startsWith("/wallet") },
  { href: "/chama", key: "chama", match: (p) => p.startsWith("/chama") },
];

type NavKey = NavItem["key"];

type SensiTopic =
  | "surplus"
  | "spend"
  | "bitcoin"
  | "wallet"
  | "habit"
  | "chama"
  | "scam"
  | "fallback";

type SensiTurn = { id: number; question: string; topic: SensiTopic };

const SENSI_PROMPTS: Record<Exclude<SensiTopic, "fallback">, string> = {
  surplus: "sensi.askSurplus",
  spend: "sensi.askSpend",
  bitcoin: "sensi.howBitcoin",
  wallet: "sensi.askWallet",
  habit: "sensi.askHabit",
  chama: "sensi.askChama",
  scam: "sensi.askScam",
};

const SENSI_REPLIES: Record<SensiTopic, string> = {
  surplus: "sensi.replySurplus",
  spend: "sensi.replySpend",
  bitcoin: "sensi.replyBitcoin",
  wallet: "sensi.replyWallet",
  habit: "sensi.replyHabit",
  chama: "sensi.replyChama",
  scam: "sensi.replyScam",
  fallback: "sensi.replyFallback",
};

const SENSI_LINKS: Record<SensiTopic, { href: string; label: string }> = {
  surplus: { href: "/surplus", label: "sensi.seeSurplus" },
  spend: { href: "/overview#month-path", label: "sensi.seePath" },
  bitcoin: { href: "/learn", label: "sensi.seeLearn" },
  wallet: { href: "/wallet", label: "sensi.seeWallet" },
  habit: { href: "/habit", label: "sensi.seeHabit" },
  chama: { href: "/chama", label: "sensi.seeChama" },
  scam: { href: "/learn", label: "sensi.seeLearn" },
  fallback: { href: "/overview", label: "sensi.seePath" },
};

function sensiStarters(pathname: string): Array<Exclude<SensiTopic, "fallback">> {
  if (pathname.startsWith("/wallet")) return ["wallet", "scam"];
  if (pathname.startsWith("/surplus")) return ["surplus", "spend"];
  if (pathname.startsWith("/habit")) return ["habit", "surplus"];
  if (pathname.startsWith("/chama")) return ["chama", "wallet"];
  if (pathname.startsWith("/learn")) return ["bitcoin", "scam"];
  if (pathname.startsWith("/invest")) return ["surplus", "bitcoin"];
  if (pathname.startsWith("/overview")) return ["spend", "surplus"];
  return ["spend", "surplus"];
}

function sensiTopic(text: string): SensiTopic {
  const question = text.toLowerCase();
  if (/scam|guaranteed|recovery word|seed|ulaghai|maneno ya kurejesha|faida iliyohakikishwa/.test(question)) {
    return "scam";
  }
  if (/wallet|custody|private key|mkoba|funguo|kujihifadhi/.test(question)) return "wallet";
  if (/chama/.test(question)) return "chama";
  if (/habit|monthly|kila mwezi|tabia/.test(question)) return "habit";
  if (
    /spend|expense|bill|rent|grocer|transport|airtime|matumizi|bili|kodi|mboga|nauli|where.*money|pesa zangu/.test(
      question,
    )
  ) {
    return "spend";
  }
  if (/surplus|floor|buffer|cushion|zaida|ziada|sakafu|hifadhi/.test(question)) return "surplus";
  if (/bitcoin|btc|sats/.test(question)) return "bitcoin";
  return "fallback";
}

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
  if (pathname.startsWith("/settings")) return "common.titles.settings";
  if (pathname.startsWith("/trust")) return "common.titles.trust";
  if (pathname.startsWith("/share")) return "common.titles.share";
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const quiet = hidesNav(pathname);
  const { locale, t } = useI18n();
  const [isSensiOpen, setIsSensiOpen] = useState(false);
  const [sensiDraft, setSensiDraft] = useState("");
  const [sensiTurns, setSensiTurns] = useState<SensiTurn[]>([]);
  const sensiThreadRef = useRef<HTMLDivElement>(null);
  const sensiLauncherRef = useRef<HTMLButtonElement | null>(null);
  const sensiWasOpen = useRef(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [chamaOptIn, setChamaOptIn] = useState(false);
  const moreItems = MORE_BASE.filter((item) => item.key !== "chama" || chamaOptIn);
  const navItems = [...PRIMARY, ...moreItems];
  const moreActive = moreItems.some((item) => item.match(pathname));

  function askSensi(text: string, topic?: SensiTopic) {
    const question = text.trim();
    if (!question) return;
    setSensiTurns((current) =>
      [...current, { id: Date.now(), question, topic: topic ?? sensiTopic(question) }].slice(-6),
    );
    setSensiDraft("");
  }

  function toggleSensi(event: { currentTarget: HTMLButtonElement }) {
    sensiLauncherRef.current = event.currentTarget;
    setIsSensiOpen((current) => !current);
  }

  function closeSensi() {
    setIsSensiOpen(false);
  }

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
    setChamaOptIn(readChamaOptIn());
    function onStorage(event: StorageEvent) {
      if (event.key === "pesasense.chama.optIn" || event.key === "pesasense.chama.v1") {
        setChamaOptIn(readChamaOptIn());
      }
    }
    function onOptIn() {
      setChamaOptIn(readChamaOptIn());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pesasense.chama.optIn", onOptIn);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pesasense.chama.optIn", onOptIn);
    };
  }, [pathname]);

  useEffect(() => {
    setMoreOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const thread = sensiThreadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [sensiTurns, isSensiOpen]);

  useEffect(() => {
    if (!isSensiOpen) {
      if (sensiWasOpen.current) sensiLauncherRef.current?.focus();
      sensiWasOpen.current = false;
      return;
    }
    sensiWasOpen.current = true;
    const dialog = document.getElementById("sensi-guide");
    const input = dialog?.querySelector("input");
    if (window.matchMedia("(pointer: fine)").matches) input?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSensiOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled)")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSensiOpen]);

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
          className={`app-sidebar hidden lg:flex ${navExpanded ? "" : "app-sidebar-collapsed"}`}
          aria-label={t("nav.nav")}
          onMouseLeave={() => setNavExpanded(false)}
        >
          <div className={`flex h-full min-h-0 w-full flex-col py-5 ${navExpanded ? "px-4" : "px-2"}`}>
            <div
              className={`mb-3 flex shrink-0 items-center gap-2 ${
                navExpanded ? "justify-between px-1" : "flex-col gap-2"
              }`}
            >
              <button
                type="button"
                aria-label={t("nav.openSensi")}
                aria-expanded={isSensiOpen}
                onClick={toggleSensi}
                className="btn flex h-11 w-11 items-center justify-center rounded-full bg-[#f3efe4]"
              >
                <SensiAvatar size="sm" mood={isSensiOpen ? "happy" : "neutral"} />
              </button>
              {navExpanded ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#f6f1e4]">{t("nav.brand")}</p>
                  <p className="text-xs text-[#e3b23c]">{t("nav.stays")}</p>
                </div>
              ) : null}
              <button
                type="button"
                aria-expanded={navExpanded}
                aria-label={navExpanded ? t("nav.collapseNav") : t("nav.expandNav")}
                className="app-sidebar-expand-hotspot h-10 min-w-10 px-2"
                onMouseEnter={() => setNavExpanded(true)}
                onFocus={() => setNavExpanded(true)}
                onClick={() => setNavExpanded((current) => !current)}
              >
                <NavDoubleArrows expanded={navExpanded} />
              </button>
            </div>
            <nav
              className={`app-sidebar-nav flex min-h-0 flex-1 flex-col ${
                navExpanded ? "gap-1" : "app-sidebar-nav-rail"
              }`}
            >
              {navItems.map((tab) => {
                const active = tab.match(pathname);
                const label =
                  tab.key === "habit" ? t("nav.habitInvest") : t(`nav.${tab.key}`);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    title={label}
                    className={`flex h-11 w-full shrink-0 items-center rounded-2xl text-sm font-semibold ${
                      navExpanded ? "gap-3 px-4" : "justify-center px-0"
                    } ${
                      active
                        ? "bg-[#f3efe4] text-pine"
                        : "text-[#f6f1e4]/85 hover:bg-white/10"
                    }`}
                  >
                    <NavIcon name={tab.key} />
                    {navExpanded ? label : <span className="sr-only">{label}</span>}
                  </Link>
                );
              })}
            </nav>
            {navExpanded ? (
              <p className="mt-auto shrink-0 px-3 pt-4 text-xs leading-5 text-[#f6f1e4]/75">
                {t("nav.encrypted")}
              </p>
            ) : null}
          </div>
        </aside>
      )}

      <div className="app-main-column">
        <PwaExperience />
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

        <div className={quiet ? "app-content app-content-landing" : "app-content"}>
          {quiet ? null : (
            <div className="mb-4">
              <HabitReminderBanner />
            </div>
          )}
          {children}
        </div>

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
                    {moreItems.map((item) => {
                      const active = item.match(pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                            active ? "bg-brass/20 text-ink ring-1 ring-brass/60" : "text-ink hover:bg-pearl"
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
                        active ? "bg-brass/25" : ""
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
                    moreOpen || moreActive ? "bg-brass/25" : ""
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
              aria-hidden="true"
              onClick={closeSensi}
              className="fixed inset-0 z-40 bg-pine/20 lg:bg-transparent"
            />
          ) : null}
          {isSensiOpen ? (
            <div
              id="sensi-guide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sensi-guide-title"
              className="fixed right-4 bottom-24 z-50 flex max-h-[min(36rem,calc(100dvh-8rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-sand bg-paper shadow-2xl lg:bottom-6 lg:right-6"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
                <div className="flex items-center gap-2">
                  <SensiAvatar size="sm" mood={sensiTurns.length > 0 ? "happy" : "neutral"} />
                  <div>
                    <p id="sensi-guide-title" className="text-sm font-semibold text-pine">{t("sensi.hi")}</p>
                    <p className="text-xs text-slate">{t("sensi.calm")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t("sensi.close")}
                  onClick={closeSensi}
                  className="btn inline-flex !h-8 !min-h-8 !w-8 items-center justify-center rounded-full bg-pearl !p-0 text-slate"
                >
                  ×
                </button>
              </div>
              <div ref={sensiThreadRef} className="mt-3 min-h-0 flex-1 overflow-y-auto px-4" aria-live="polite">
                {sensiTurns.length === 0 ? (
                  <p className="text-sm leading-6 text-ink">{t("sensi.askAnything")}</p>
                ) : (
                  <div className="flex flex-col gap-4 pb-1">
                    {sensiTurns.map((turn) => (
                      <div key={turn.id} className="flex flex-col gap-2">
                        <p className="ml-10 self-end rounded-2xl rounded-br-md bg-pine px-3 py-2 text-sm leading-5 text-on-brand">
                          {turn.question}
                        </p>
                        <div>
                          <p className="text-sm leading-6 text-ink">{t(SENSI_REPLIES[turn.topic])}</p>
                          <Link
                            href={SENSI_LINKS[turn.topic].href}
                            className="btn btn-secondary mt-2 inline-flex !min-h-0 rounded-full !px-3 !py-1.5 text-xs"
                          >
                            {t(SENSI_LINKS[turn.topic].label)}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 px-4 pt-3 pb-4">
                <div className="flex flex-wrap gap-2">
                  {sensiStarters(pathname).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className="btn rounded-full border border-sand bg-surface !min-h-0 !px-3 !py-1.5 text-left text-xs font-semibold text-ink"
                      onClick={() => askSensi(t(SENSI_PROMPTS[topic]), topic)}
                    >
                      {t(SENSI_PROMPTS[topic])}
                    </button>
                  ))}
                </div>
                <form
                  className="mt-3 flex items-center gap-2 border-t border-sand pt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    askSensi(sensiDraft);
                  }}
                >
                  <input
                    type="text"
                    value={sensiDraft}
                    onChange={(event) => setSensiDraft(event.target.value)}
                    placeholder={t("sensi.placeholder")}
                    aria-label={t("sensi.placeholder")}
                    className="field min-h-12 min-w-0 flex-1 text-sm"
                  />
                  <button
                    type="submit"
                    className="btn btn-accent !min-h-12 shrink-0 rounded-full !px-4"
                    disabled={!sensiDraft.trim()}
                  >
                    {t("sensi.send")}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            aria-label={t("nav.openSensi")}
            aria-expanded={isSensiOpen}
            onClick={toggleSensi}
            className={`btn fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-[#f3efe4] shadow-[0_8px_24px_rgb(30_58_50/0.18)] lg:hidden ${
              moreOpen || isSensiOpen ? "pointer-events-none invisible" : ""
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
  const router = useRouter();
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("nav.profile")}
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pine text-on-brand"
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
          <Link
            href="/settings"
            onClick={() => {
              onClose();
              router.push("/settings");
            }}
            className="btn btn-secondary mt-2 inline-flex w-full justify-center bg-paper"
          >
            {t("nav.settings")}
          </Link>
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

function NavDoubleArrows({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current">
      {expanded ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 6l-5 6 5 6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M18 6l-5 6 5 6" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M6 6l5 6-5 6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 6l5 6-5 6" />
        </>
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
