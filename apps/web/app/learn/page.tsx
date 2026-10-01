/**
 * Learn.
 * Scam flags and three short guides. There is no community card until a real destination exists.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

const GUIDES = [
  {
    title: "What is Bitcoin?",
    body: "Bitcoin is money you can hold yourself. There is no manager and no admin. The price moves, so it is for money you can leave alone.",
  },
  {
    title: "Why 3 to 5 years?",
    body: "A short wait can be a bad time to need the money back. A longer horizon is the point of a steady habit.",
  },
  {
    title: "How self-custody works",
    body: "The bitcoin goes to a wallet you control. PesaSense does not hold the keys. A backup of those keys stays with you.",
  },
] as const;

/** Scam guidance and one check question. */
export default function LearnPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <p className="text-xs font-semibold tracking-wide text-teal uppercase">
        Knowledge and safety
      </p>
      <h1 className="text-3xl font-bold">Learn at your pace</h1>
      <p className="text-sm text-slate">Short, plain notes. No hype.</p>

      <section className="card">
        <h2 className="font-semibold">Scam red flags</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>Guaranteed returns</li>
          <li>Trading managers on Telegram</li>
          <li>Anyone asking for your recovery words</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-positive">
          Real Bitcoin has no manager or admin. You own it directly.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Plain-language guides</h2>
        {GUIDES.map((guide) => {
          const expanded = open === guide.title;
          return (
            <div key={guide.title} className="card">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : guide.title)}
                className="flex min-h-tap w-full items-center justify-between text-left font-semibold"
              >
                {guide.title}
                <span aria-hidden="true">{expanded ? "–" : "+"}</span>
              </button>
              {expanded ? (
                <p className="mt-2 text-sm leading-6 text-slate">{guide.body}</p>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2 className="font-semibold">Quick check</h2>
        <p className="mt-2 text-sm">When is a Bitcoin habit meant to be used?</p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            "Whenever the price drops",
            "After 3 or more years, for money you can leave alone",
            "To pay next week's rent",
          ].map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={answer === choice}
              onClick={() => setAnswer(choice)}
              className={`min-h-tap rounded-control border px-3 py-2 text-left text-sm ${
                answer === choice ? "border-teal bg-mint text-teal" : "border-line"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
        {answer ? (
          <p className="mt-3 text-sm leading-6 text-ink">
            {answer.startsWith("After")
              ? "Yes. The habit is for money you will not need soon."
              : "Not this one. The habit is not for rent, and it is not a reaction to a price move."}
          </p>
        ) : null}
      </section>

      <Link href="/trust" className="text-sm font-semibold text-teal">
        Who regulates what
      </Link>
    </main>
  );
}
