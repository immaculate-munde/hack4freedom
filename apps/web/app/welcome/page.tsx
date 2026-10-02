/**
 * Welcome screen.
 *
 * Laid out like the Serene Shilling welcome: Sensi, a speech card, three
 * promises, then one primary action. The wording stays the agreed copy.
 * Get started opens the questions. How this works stays on this page.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sensi } from "../../components/sensi";

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

/** The first screen. Marks the visit, then opens the questions. */
export default function WelcomePage() {
  const router = useRouter();
  const [showHow, setShowHow] = useState(false);

  function getStarted() {
    localStorage.setItem(WELCOME_FLAG, "true");
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white p-1 shadow-[0_8px_24px_-4px_rgb(13_122_115/0.18)]">
            <Sensi className="h-[72px] w-[72px]" />
          </div>
          <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal text-on-primary ring-2 ring-canvas">
            <LeafIcon />
          </span>
        </div>
        <div className="relative max-w-xs rounded-[20px] bg-white px-5 py-4 shadow-card">
          <span
            aria-hidden="true"
            className="absolute top-0 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm bg-white"
          />
          <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
            Habari, welcome
          </p>
          <h1 className="mt-2 text-lg leading-7 font-semibold tracking-tight text-ink">
            “Let&apos;s make sense of your money, and start small.”
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-slate">
            A patient guide for your M-Pesa history, and a small monthly habit.
          </p>
        </div>
      </div>

      <section aria-label="Our three commitments" className="mt-8">
        <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          Our three commitments
        </p>
        <div className="flex flex-col gap-2">
          {PROMISES.map((promise) => (
            <article
              key={promise.heading}
              className="flex items-start gap-3 rounded-[18px] bg-white p-4 shadow-card"
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

      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={getStarted}
          className="btn btn-primary flex w-full items-center justify-center gap-2 text-base shadow-[0_6px_16px_rgb(13_122_115/0.22)]"
        >
          Get started
          <ArrowIcon />
        </button>
        <button
          type="button"
          aria-expanded={showHow}
          onClick={() => setShowHow(true)}
          className="btn inline-flex min-h-11 items-center gap-1 px-3 text-sm font-medium text-slate"
        >
          How does this work?
          <ChevronIcon />
        </button>
      </div>

      <footer className="mt-8 space-y-2 text-center text-[11px] leading-4 text-slate">
        <p>Encrypted on your device · Built for Kenya</p>
        <p>PesaSense is an independent tool, not affiliated with Safaricom.</p>
        <p>
          <Link href="/trust" className="font-semibold text-teal">
            Regulatory notice
          </Link>
        </p>
      </footer>

      {showHow ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-5">
          <div
            role="dialog"
            aria-labelledby="how-title"
            className="w-full max-w-md rounded-sheet bg-white p-5 shadow-[0_16px_40px_rgb(0_0_0/0.14)]"
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

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
      <path d="M12 3c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z" />
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
