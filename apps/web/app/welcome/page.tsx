/**
 * Welcome screen.
 *
 * First visit. Sensi states the three promises in the agreed wording.
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
  },
  {
    heading: "We never hold your money",
    body: "Your bitcoin goes straight to your own wallet.",
  },
  {
    heading: "No trading, no pressure",
    body: "No price charts, no alerts, no FOMO. Just calm, long-term saving.",
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
    <main className="mx-auto flex w-full max-w-lg flex-col">
      <header className="flex flex-col items-center text-center">
        <Sensi />
        <p className="mt-4 text-xs font-semibold tracking-widest text-moss uppercase">
          Habari, welcome
        </p>
        <h1 className="mt-3 max-w-sm font-serif text-3xl tracking-tight text-pine sm:text-4xl">
          Let&apos;s make sense of your money, and start small.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-ink/70">
          A patient guide for your M-Pesa history, and a small monthly habit.
        </p>
      </header>

      <section aria-label="Our three commitments" className="mt-8 space-y-3">
        <p className="text-xs font-semibold tracking-widest text-moss uppercase">
          Our three commitments
        </p>
        {PROMISES.map((promise) => (
          <div key={promise.heading} className="card">
            <p className="text-sm font-semibold text-ink">{promise.heading}</p>
            <p className="mt-1 text-sm leading-6 text-ink/70">{promise.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={getStarted}
          className="btn btn-primary w-full py-4 text-base"
        >
          Get started
        </button>
        <button
          type="button"
          aria-expanded={showHow}
          onClick={() => setShowHow((open) => !open)}
          className="btn btn-ghost w-full py-2 text-sm"
        >
          How does this work?
        </button>
        {showHow ? (
          <p className="text-sm leading-6 text-ink/75">
            You answer a few questions. Then you add about six months of M-Pesa history
            on this phone. We show a range you could set aside. If the history can
            support it, you can start a small monthly Bitcoin habit. You approve each
            purchase. Bitcoin&apos;s value goes up and down. Save only what you will not
            need soon.
          </p>
        ) : null}
      </div>

      <footer className="mt-10 space-y-3 text-center text-xs leading-5 text-ink/55">
        <p>Encrypted on your device. Built for Kenya.</p>
        <p>PesaSense is an independent tool, not affiliated with Safaricom.</p>
        <p>
          <Link href="/trust" className="btn btn-ghost">
            Regulatory notice
          </Link>
        </p>
      </footer>
    </main>
  );
}
