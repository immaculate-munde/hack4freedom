"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "../../components/brand/LogoMark";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";
import { TelegramCta, telegramBotConfigured } from "../../components/telegram-cta";
import { ThemeToggle } from "../../components/theme-toggle";

const WELCOME_FLAG = "hasSeenWelcome";

const PROMISES = [
  {
    heading: "Your data stays on your phone",
    body: "Your statements are read on this phone and never leave it. Backups are encrypted with your key.",
    icon: "phone",
  },
  {
    heading: "We never hold your money",
    body: "Your bitcoin goes straight to your own wallet.",
    icon: "wallet",
  },
  {
    heading: "No trading, no pressure",
    body: "No price charts, no alerts, no FOMO. Just calm, long-term saving.",
    icon: "calm",
  },
] as const;

const STEPS = ["Questions", "History on this phone", "A small habit"] as const;

const FLOW = [
  {
    number: "01",
    title: "A few questions",
    body: "One at a time. Skip any you are not ready to answer.",
  },
  {
    number: "02",
    title: "Your history, on this phone",
    body: "Your statements are read here and do not leave the phone.",
  },
  {
    number: "03",
    title: "A small monthly habit",
    body: "We remind you. You approve each purchase. It goes to your own wallet.",
  },
] as const;

export default function WelcomePage() {
  const router = useRouter();
  const [showHow, setShowHow] = useState(false);

  function getStarted() {
    localStorage.setItem(WELCOME_FLAG, "true");
    router.push("/onboarding");
  }

  return (
    <main className="bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-pine">PesaSense</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate md:flex">
          <a href="#how" className="hover:text-pine">
            How it works
          </a>
          <a href="#habit" className="hover:text-pine">
            The habit
          </a>
          <a href="#promises" className="hover:text-pine">
            Promises
          </a>
          <Link href="/trust" className="hover:text-pine">
            Notice
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-5">
            Get started
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pt-4 pb-10 sm:px-8">
        <h1 className="mx-auto max-w-4xl text-center text-[clamp(2.6rem,6.4vw,5.4rem)] leading-[0.95] font-bold tracking-tight text-pine">
          Let&apos;s make sense
          <br />
          of your money,
          <br />
          <span className="text-brass">and start small.</span>
        </h1>

        <div className="relative mt-2 grid items-end gap-6 lg:mt-0 lg:grid-cols-[15rem_minmax(0,1fr)_16rem] lg:gap-4">
          <div className="relative z-10 order-2 flex flex-col gap-3 lg:order-1 lg:pb-20">
            <article className="rounded-2xl border border-sand bg-paper p-4 shadow-card">
              <p className="text-2xl font-bold text-pine">On this phone</p>
              <p className="mt-1 text-sm leading-5 text-slate">
                Your statements are read here. They do not leave the phone.
              </p>
            </article>
            <article className="rounded-2xl border border-sand bg-paper p-4 shadow-card">
              <p className="text-2xl font-bold text-pine">You approve</p>
              <p className="mt-1 text-sm leading-5 text-slate">
                We remind you. You approve each purchase.
              </p>
            </article>
          </div>

          <div className="order-1 flex justify-center lg:order-2">
            <img
              src="/sensi.png"
              alt="Sensi, your guide"
              className="sensi-float pointer-events-none h-[min(68vh,620px)] w-auto max-w-full object-contain"
            />
          </div>

          <div className="relative z-10 order-3 flex flex-col items-start gap-4 lg:pb-28">
            <p className="max-w-xs text-sm leading-6 text-slate">
              A patient guide for your M-Pesa history, and a small monthly habit that goes to your
              own wallet.
            </p>
            <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
              Get started
            </button>
            <TelegramCta />
            <button
              type="button"
              onClick={() => setShowHow(true)}
              className="text-sm font-semibold text-pine underline-offset-4 hover:underline"
            >
              I&apos;m just exploring
            </button>
          </div>
        </div>

        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {STEPS.map((step) => (
            <li key={step}>
              <a
                href="#how"
                className="inline-block rounded-full border border-sand bg-paper px-4 py-2 text-sm font-semibold text-pine"
              >
                {step}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          How it works
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold tracking-tight text-pine sm:text-4xl">
          Three steps. Then you decide.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FLOW.map((step) => (
            <article key={step.title} className="rounded-[24px] border border-sand bg-paper p-5 shadow-card">
              <p className="text-sm font-bold text-brass">{step.number}</p>
              <h3 className="mt-3 text-lg font-bold text-pine">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate">{step.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
            Start with a few questions
          </button>
          <button
            type="button"
            onClick={() => setShowHow(true)}
            className="btn btn-secondary rounded-full px-6"
          >
            I&apos;m just exploring
          </button>
        </div>
      </section>

      <section id="habit" className="bg-paper">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">The habit</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-pine sm:text-4xl">
              A small amount, once a month.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate">
              We&apos;ll remind you on the 1st. You approve each purchase. Bitcoin goes straight to
              your own wallet. Weekly is an option if that suits you better.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate">
              This is education, not financial advice. Bitcoin can lose value.
            </p>
            <button type="button" onClick={getStarted} className="btn btn-accent mt-6 rounded-full px-6">
              Get started
            </button>
          </div>
          <article className="rounded-[28px] bg-pine p-6 text-paper shadow-card">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">Reminder</p>
            <p className="mt-4 text-2xl leading-snug font-bold">
              We&apos;ll remind you on the 1st. You approve each purchase.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm leading-6 text-paper/80">
              <li>Nothing is sent until you say yes.</li>
              <li>It goes to your own wallet.</li>
              <li>You can skip a month.</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="promises" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-pine sm:text-4xl">
          Our three commitments
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROMISES.map((promise) => (
            <article key={promise.heading} className="rounded-[24px] border border-sand bg-paper p-5 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-pine">
                <PromiseIcon name={promise.icon} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-pine">{promise.heading}</h3>
              <p className="mt-2 text-sm leading-6 text-slate">{promise.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
            Get started
          </button>
          {telegramBotConfigured() ? <TelegramCta /> : null}
          <Link href="/trust" className="btn btn-secondary rounded-full px-6">
            How we handle your data
          </Link>
        </div>
      </section>

      <section className="bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to start small?</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-paper/75">
              A few questions first. You can skip any of them. On the web, history stays on this
              phone. In Telegram, you send the statement to the bot so it can build your picture —
              you still approve every purchase.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={getStarted} className="btn btn-accent rounded-full px-6">
              Get started
            </button>
            {telegramBotConfigured() ? (
              <TelegramCta className="btn btn-secondary rounded-full px-6 border-paper/30 text-paper" />
            ) : null}
          </div>
        </div>
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 border-t border-white/10 px-5 py-8 sm:px-8 lg:grid-cols-4">
          <div>
            <dt className="text-lg font-bold">Encrypted</dt>
            <dd className="mt-1 text-sm text-paper/75">On your device</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">Built for Kenya</dt>
            <dd className="mt-1 text-sm text-paper/75">M-Pesa, in shillings</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">Monthly</dt>
            <dd className="mt-1 text-sm text-paper/75">Weekly is an option</dd>
          </div>
          <div>
            <dt className="text-lg font-bold">You decide</dt>
            <dd className="mt-1 text-sm text-paper/75">You approve each purchase</dd>
          </div>
        </dl>
      </section>

      <footer className="w-full border-t border-sand bg-paper">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          <RegulatoryDisclosure variant="footer" />
          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-sand pt-6 sm:flex-row sm:items-center">
            <p className="text-sm leading-6 text-slate">
              PesaSense is an independent tool, not affiliated with Safaricom.
            </p>
            <Link href="/trust" className="btn btn-secondary rounded-full px-5">
              How we handle your data
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
              How this works
            </h2>
            <ol className="mt-4 flex flex-col gap-3 text-sm leading-6 text-slate">
              <li>A few questions, one at a time. You can skip any of them.</li>
              <li>Your M-Pesa history stays on this phone.</li>
              <li>We suggest a small monthly habit. We remind you. You approve each purchase.</li>
            </ol>
            <button type="button" onClick={() => setShowHow(false)} className="btn btn-ghost mt-6 w-full">
              Stay on this page
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
