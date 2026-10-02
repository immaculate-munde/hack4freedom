"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";
import { SensiAvatar } from "../../components/sensi-avatar";
import { SensiBubble } from "../../components/sensi-bubble";

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

export default function WelcomePage() {
  const router = useRouter();
  const [showHow, setShowHow] = useState(false);

  function getStarted() {
    localStorage.setItem(WELCOME_FLAG, "true");
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="order-2 lg:order-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
            Habari, welcome
          </p>
          <h1 className="mt-3 max-w-xl text-3xl leading-tight font-bold tracking-tight text-pine sm:text-4xl">
            Let&apos;s make sense of your money, and start small.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate">
            A patient guide for your M-Pesa history, and a small monthly habit.
          </p>

          <section aria-label="Our three commitments" className="mt-8">
            <p className="mb-3 px-1 text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
              Our three commitments
            </p>
            <div className="flex flex-col gap-3">
              {PROMISES.map((promise) => (
                <article
                  key={promise.heading}
                  className="flex items-start gap-3 rounded-[18px] border border-sand/70 bg-gradient-to-br from-paper to-pearl p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint text-teal">
                    <PromiseIcon name={promise.icon} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{promise.heading}</h2>
                    <p className="mt-0.5 text-[13px] leading-5 text-slate">{promise.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-8 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={getStarted}
              className="btn btn-primary flex items-center justify-center gap-2 text-base shadow-[0_6px_16px_rgb(13_122_115/0.22)]"
            >
              Get started
              <ArrowIcon />
            </button>
            <button
              type="button"
              aria-expanded={showHow}
              onClick={() => setShowHow(true)}
              className="btn inline-flex min-h-11 items-center justify-center gap-1 px-3 text-sm font-medium text-slate"
            >
              I&apos;m just exploring
              <ChevronIcon />
            </button>
          </div>
        </div>

        <div className="order-1 flex flex-col items-center gap-5 lg:order-2">
          <div className="flex h-64 w-64 items-center justify-center rounded-full bg-mint/60 shadow-[0_18px_48px_-16px_rgb(13_122_115/0.35)] sm:h-80 sm:w-80">
            <SensiAvatar size="xl" mood="happy" />
          </div>
          <SensiBubble tailPosition="bottom">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">Sensi</p>
            <p className="mt-1 text-lg leading-7 font-semibold text-pine">
              I&apos;ll help you find the calm in your money story.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate">
              No pressure, no jargon, and your private history stays on your phone.
            </p>
          </SensiBubble>
        </div>
      </div>

      <RegulatoryDisclosure />

      <footer className="space-y-2 text-center text-[11px] leading-4 text-slate">
        <p>Encrypted on your device · Built for Kenya</p>
        <p>PesaSense is an independent tool, not affiliated with Safaricom.</p>
        <p>
          <Link href="/trust" className="font-semibold text-teal">Regulatory notice</Link>
        </p>
      </footer>

      {showHow ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-5">
          <div
            role="dialog"
            aria-labelledby="how-title"
            className="w-full max-w-xl rounded-sheet bg-white p-5 shadow-[0_16px_40px_rgb(0_0_0/0.14)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="how-title" className="text-lg font-semibold text-ink">
                How PesaSense works
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowHow(false)}
                className="btn inline-flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-slate"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate">
              <p>
                <strong className="font-semibold text-ink">A few questions.</strong> You
                answer one at a time. Skip leaves that answer blank.
              </p>
              <p>
                <strong className="font-semibold text-ink">Your history, on this phone.</strong>{" "}
                About six months of M-Pesa. Your statements never leave your phone.
                Backups are encrypted with your key.
              </p>
              <p>
                <strong className="font-semibold text-ink">A small habit.</strong> If the
                history can support it, you can start a monthly Bitcoin habit. We&apos;ll
                remind you. You approve each purchase. Bitcoin&apos;s value goes up and
                down.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHow(false)}
              className="btn btn-primary mt-5 w-full"
            >
              Stay on this page
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PromiseIcon({ name }: { name: "phone" | "wallet" | "calm" }) {
  const common = "h-5 w-5 fill-none stroke-current";
  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path strokeLinecap="round" d="M11 18h2" />
      </svg>
    );
  }
  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path strokeLinecap="round" d="M3 10h18" />
        <circle cx="16.5" cy="14.5" r="1" className="fill-current" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M9 13c.8 1.2 5.2 1.2 6 0M9 10h.01M15 10h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}
