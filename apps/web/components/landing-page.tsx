/**
 * Front door.
 * Full-bleed hero in the site palette: ink chips, teal field, canvas light.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "./brand/LogoMark";
import { useI18n } from "../contexts/language-context";

const WELCOME_FLAG = "hasSeenWelcome";

const NAV = [
  { labelKey: "welcome.landing.home", href: "/", kind: "stay" },
  { labelKey: "welcome.landing.how", href: "/welcome", kind: "link" },
  { labelKey: "welcome.landing.plans", href: "/habit", kind: "enter" },
  { labelKey: "welcome.landing.start", href: "/welcome", kind: "link" },
] as const;

/** Marketing screen. Entering the app marks the welcome visit so the shell opens. */
export function LandingPage() {
  const router = useRouter();
  const { t } = useI18n();

  function enter(href: string) {
    localStorage.setItem(WELCOME_FLAG, "true");
    router.push(href);
  }

  return (
    <main className="landing">
      <div className="landing-scene" aria-hidden="true">
        <Scene />
      </div>

      <header className="landing-bar">
        <div className="landing-brand">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div>
            <p className="text-[13px] font-extrabold tracking-[0.14em] text-white">PESASENSE</p>
            <p className="text-[11px] font-semibold text-white/75">{t("welcome.landing.tagline")}</p>
          </div>
        </div>

        <div className="landing-tools">
          <button
            type="button"
            aria-label={t("welcome.landing.openOverview")}
            onClick={() => enter("/overview")}
            className="landing-avatar"
          >
            <PersonIcon />
          </button>
          <nav className="landing-pill" aria-label={t("welcome.landing.navLabel")}>
            {NAV.map((item) =>
              item.kind === "enter" ? (
                <button key={item.labelKey} type="button" onClick={() => enter(item.href)} className="landing-pill-link">
                  {t(item.labelKey)}
                </button>
              ) : (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  aria-current={item.kind === "stay" ? "page" : undefined}
                  className="landing-pill-link"
                >
                  {t(item.labelKey)}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>

      <div className="landing-copy">
        <h1>
          {t("welcome.landing.heroLine1")}
          <br />
          {t("welcome.landing.heroLine2")}
          <br />
          {t("welcome.landing.heroLine3")}
        </h1>
        <div className="landing-actions">
          <button type="button" onClick={() => enter("/overview")} className="landing-ghost">
            {t("welcome.landing.seeSurplus")}
            <ArrowIcon />
          </button>
          <Link href="/welcome" className="landing-ghost">
            {t("welcome.getStarted")}
            <ArrowIcon />
          </Link>
        </div>
      </div>

      <div className="landing-seal" aria-hidden="true">
        <Seal label={t("welcome.landing.seal")} />
      </div>
    </main>
  );
}

function Scene() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#042624" />
          <stop offset="42%" stopColor="#0b5c56" />
          <stop offset="100%" stopColor="#f3efe6" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd6cd" />
          <stop offset="100%" stopColor="#0d7a73" />
        </linearGradient>
        <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#042624" stopOpacity="0.72" />
          <stop offset="48%" stopColor="#042624" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#042624" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sky)" />
      <ellipse cx="1180" cy="210" rx="280" ry="220" fill="#faf8f5" opacity="0.85" />
      <path d="M620 520 C780 390 980 360 1440 300 L1440 900 L620 900 Z" fill="#0a3f3b" />
      <path d="M760 620 C980 500 1180 540 1440 470 L1440 900 L760 900 Z" fill="url(#water)" opacity="0.9" />
      <path d="M900 780 C1040 700 1200 740 1440 690 L1440 900 L900 900 Z" fill="#06302c" />
      <circle cx="1088" cy="250" r="90" fill="#e6f4f1" opacity="0.55" />
      <rect width="1440" height="900" fill="url(#scrim)" />
    </svg>
  );
}

function Seal({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 140 140" className="h-28 w-28 text-white">
      <defs>
        <path id="seal-ring" d="M70 70 m-48 0 a48 48 0 1 1 96 0 a48 48 0 1 1 -96 0" />
      </defs>
      <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 3.5" opacity="0.85" />
      <text fill="currentColor" fontSize="9" fontWeight="700" letterSpacing="2.4">
        <textPath href="#seal-ring">{label}</textPath>
      </text>
      <g transform="translate(54 50)" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 36 V18" />
        <path d="M16 20 C16 10 8 8 6 14 C10 14 14 16 16 20 Z" />
        <path d="M16 18 C16 8 26 6 28 14 C22 14 18 16 16 18 Z" />
      </g>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 12h12M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
