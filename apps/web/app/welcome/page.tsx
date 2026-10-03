"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "../../components/brand/LogoMark";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeToggle } from "../../components/theme-toggle";
import { useI18n } from "../../contexts/language-context";

const WELCOME_FLAG = "hasSeenWelcome";

const PROMISES = [
  {
    headingKey: "welcome.promises.phoneHeading",
    bodyKey: "welcome.promises.phoneBody",
    icon: "phone",
  },
  {
    headingKey: "welcome.promises.walletHeading",
    bodyKey: "welcome.promises.walletBody",
    icon: "wallet",
  },
  {
    headingKey: "welcome.promises.calmHeading",
    bodyKey: "welcome.promises.calmBody",
    icon: "calm",
  },
] as const;

const STEP_KEYS = ["welcome.steps.questions", "welcome.steps.history", "welcome.steps.habit"] as const;

const FLOW = [
  {
    number: "01",
    titleKey: "welcome.flow.questionsTitle",
    bodyKey: "welcome.flow.questionsBody",
  },
  {
    number: "02",
    titleKey: "welcome.flow.historyTitle",
    bodyKey: "welcome.flow.historyBody",
  },
  {
    number: "03",
    titleKey: "welcome.flow.habitTitle",
    bodyKey: "welcome.flow.habitBody",
  },
] as const;

const DIALOG_KEYS = ["welcome.dialog.questions", "welcome.dialog.history", "welcome.dialog.habit"] as const;

export default function WelcomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [showHow, setShowHow] = useState(false);

  function getStarted() {
    localStorage.setItem(WELCOME_FLAG, "true");
    router.push("/onboarding");
  }

  return (
    <main className="bg-canvas pb-24 text-ink md:pb-0">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="truncate text-lg font-bold tracking-tight text-pine">PesaSense</span>
        </div>
        <nav className="order-3 flex basis-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate md:order-none md:basis-auto md:gap-7 md:text-sm">
          <a href="#how" className="hover:text-pine">
            {t("welcome.nav.how")}
          </a>
          <a href="#habit" className="hover:text-pine">
            {t("welcome.nav.habit")}
          </a>
          <a href="#promises" className="hover:text-pine">
            {t("welcome.nav.promises")}
          </a>
          <Link href="/trust" className="hover:text-pine">
            {t("welcome.nav.notice")}
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-4 sm:px-5">
            {t("welcome.getStarted")}
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pt-4 pb-10 sm:px-8">
        <h1 className="mx-auto max-w-4xl text-center text-[clamp(2.6rem,6.4vw,5.4rem)] leading-[0.95] font-bold tracking-tight text-pine">
          {t("welcome.heroLine1")}
          <br />
          {t("welcome.heroLine2")}
          <br />
          <span className="text-brass">{t("welcome.heroLine3")}</span>
        </h1>

        <div className="relative mt-2 grid items-end gap-6 lg:mt-0 lg:grid-cols-[15rem_minmax(0,1fr)_16rem] lg:gap-4">
          <div className="relative z-10 order-2 flex flex-col gap-4 lg:order-1 lg:gap-3 lg:pb-20">
            <article className="rounded-2xl border border-sand bg-paper p-5 shadow-card lg:p-4">
              <p className="text-2xl font-bold text-pine">{t("welcome.onThisPhone")}</p>
              <p className="mt-1 text-sm leading-5 text-slate">{t("welcome.onThisPhoneBody")}</p>
            </article>
            <article className="rounded-2xl border border-sand bg-paper p-5 shadow-card lg:p-4">
              <p className="text-2xl font-bold text-pine">{t("welcome.youApprove")}</p>
              <p className="mt-1 text-sm leading-5 text-slate">{t("welcome.youApproveBody")}</p>
            </article>
          </div>

          <div className="order-1 flex justify-center lg:order-2">
            <img
              src="/sensi.png"
              alt={t("welcome.sensiAlt")}
              className="sensi-float pointer-events-none h-[min(68vh,620px)] w-auto max-w-full object-contain"
            />
          </div>

          <div className="relative z-10 order-3 flex flex-col items-start gap-4 lg:pb-28">
            <p className="max-w-xs text-sm leading-6 text-slate">{t("welcome.guide")}</p>
            <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
              {t("welcome.getStarted")}
            </button>
            <button
              type="button"
              onClick={() => setShowHow(true)}
              className="text-sm font-semibold text-pine underline-offset-4 hover:underline"
            >
              {t("welcome.exploring")}
            </button>
          </div>
        </div>

        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {STEP_KEYS.map((step) => (
            <li key={step}>
              <a
                href="#how"
                className="inline-block rounded-full border border-sand bg-paper px-4 py-2 text-sm font-semibold text-pine"
              >
                {t(step)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          {t("welcome.howEyebrow")}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold tracking-tight text-pine sm:text-4xl">
          {t("welcome.howTitle")}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FLOW.map((step) => (
            <article key={step.titleKey} className="rounded-[24px] border border-sand bg-paper p-5 shadow-card">
              <p className="text-sm font-bold text-brass">{step.number}</p>
              <h3 className="mt-3 text-lg font-bold text-pine">{t(step.titleKey)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate">{t(step.bodyKey)}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
            {t("welcome.startQuestions")}
          </button>
          <button
            type="button"
            onClick={() => setShowHow(true)}
            className="btn btn-secondary rounded-full px-6"
          >
            {t("welcome.exploring")}
          </button>
        </div>
      </section>

      <section id="habit" className="bg-paper">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
              {t("welcome.habitEyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-pine sm:text-4xl">
              {t("welcome.habitTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate">{t("welcome.habitBody")}</p>
            <p className="mt-3 text-sm leading-6 text-slate">{t("welcome.education")}</p>
            <button type="button" onClick={getStarted} className="btn btn-accent mt-6 rounded-full px-6">
              {t("welcome.getStarted")}
            </button>
          </div>
          <article className="rounded-[28px] bg-pine p-6 text-paper shadow-card">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">
              {t("welcome.reminder")}
            </p>
            <p className="mt-4 text-2xl leading-snug font-bold">{t("welcome.reminderLead")}</p>
            <ul className="mt-6 flex flex-col gap-3 text-sm leading-6 text-paper/80">
              <li>{t("welcome.reminderNothing")}</li>
              <li>{t("welcome.reminderWallet")}</li>
              <li>{t("welcome.reminderSkip")}</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="promises" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-pine sm:text-4xl">
          {t("welcome.commitmentsTitle")}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROMISES.map((promise) => (
            <article key={promise.headingKey} className="rounded-[24px] border border-sand bg-paper p-5 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-pine">
                <PromiseIcon name={promise.icon} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-pine">{t(promise.headingKey)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate">{t(promise.bodyKey)}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
            {t("welcome.getStarted")}
          </button>
          <Link href="/trust" className="btn btn-secondary rounded-full px-6">
            {t("welcome.dataHandling")}
          </Link>
        </div>
      </section>

      <section className="bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("welcome.readyTitle")}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-paper/75">{t("welcome.readyBody")}</p>
          </div>
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
            {t("welcome.getStarted")}
          </button>
        </div>
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 border-t border-white/10 px-5 py-8 sm:px-8 lg:grid-cols-4">
          <div>
            <dt className="text-lg font-bold">{t("welcome.encrypted")}</dt>
            <dd className="mt-1 text-sm text-paper/75">{t("welcome.onDevice")}</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">{t("welcome.builtForKenya")}</dt>
            <dd className="mt-1 text-sm text-paper/75">{t("welcome.mpesaShillings")}</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">{t("common.monthly")}</dt>
            <dd className="mt-1 text-sm text-paper/75">{t("welcome.weeklyOption")}</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">{t("welcome.youDecide")}</dt>
            <dd className="mt-1 text-sm text-paper/75">{t("welcome.youApproveEach")}</dd>
          </div>
        </dl>
      </section>

      <footer className="w-full border-t border-sand bg-paper">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          <RegulatoryDisclosure variant="footer" />
          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-sand pt-6 sm:flex-row sm:items-center">
            <p className="text-sm leading-6 text-slate">{t("welcome.independent")}</p>
            <Link href="/trust" className="btn btn-secondary rounded-full px-5">
              {t("welcome.dataHandling")}
            </Link>
          </div>
        </div>
      </footer>

      {showHow ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-title"
            className="w-full max-w-md rounded-[28px] bg-paper p-6 shadow-card"
          >
            <h2 id="how-title" className="text-xl font-bold text-pine">
              {t("welcome.dialogTitle")}
            </h2>
            <ol className="mt-4 flex flex-col gap-3 text-sm leading-6 text-slate">
              {DIALOG_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ol>
            <button type="button" onClick={() => setShowHow(false)} className="btn btn-ghost mt-6 w-full">
              {t("welcome.stay")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PromiseIcon({ name }: { name: "phone" | "wallet" | "calm" }) {
  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 15.5z" />
        <path d="M16 12h.01" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4c2 3 2 5 0 8 3-1 6 1 6 4a6 6 0 1 1-12 0c0-3 3-5 6-4-2-3-2-5 0-8z" strokeLinejoin="round" />
    </svg>
  );
}
