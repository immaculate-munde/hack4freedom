/**
 * Learn.
 *
 * The knowledge screen from the designs: scam signs, three short guides, one
 * check. No forecast chart, no savings form, and no community card.
 * Warnings use clay, not a price-red panel.
 */
"use client";

import { useState } from "react";

const GUIDES = [
  {
    title: "What is Bitcoin?",
    body: "It is money you can hold yourself. There will only ever be 21 million. No bank, manager, or admin can print more, freeze it, or hold it for you.",
  },
  {
    title: "Why 3 to 5 years?",
    body: "The price moves a lot from day to day. A habit is for money you can leave alone for years. You can lose money. This is education, not a forecast.",
  },
  {
    title: "How self-custody works",
    body: "The keys stay on your phone. The recovery words are the backup. Anyone who sees those words can take the bitcoin. PesaSense never asks for them.",
  },
] as const;

const FLAGS = [
  "Guaranteed returns",
  "Someone offering to trade or manage it for you",
  "Anyone asking for your recovery words",
] as const;

type Answer = "drop" | "years" | "rent";

/** Education only. The check explains the habit. It does not score the person. */
export default function LearnPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [answer, setAnswer] = useState<Answer | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          Knowledge and safety
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Learn at your pace
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate">
          Short essentials. No hype, and no price chart.
        </p>
      </header>

      <section className="rounded-[20px] border border-warning/20 bg-[#FBF6EF] p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-warning">
            <WarnIcon />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Scam signs</h2>
            <p className="text-[11px] text-slate">Worth a pause</p>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {FLAGS.map((flag) => (
            <li
              key={flag}
              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-ink"
            >
              <span className="text-warning" aria-hidden="true">
                ×
              </span>
              {flag}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-5 text-slate">
          Real Bitcoin has no manager. You hold it yourself.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Plain language guides</h2>
          <p className="text-xs font-semibold text-slate">3 topics</p>
        </div>
        <div className="space-y-2">
          {GUIDES.map((guide, index) => {
            const expanded = open === index;
            return (
              <article key={guide.title} className="rounded-[18px] bg-white shadow-card">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="btn flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-ink">{guide.title}</span>
                  <span className="text-slate" aria-hidden="true">
                    {expanded ? "–" : "+"}
                  </span>
                </button>
                {expanded ? (
                  <p className="px-4 pb-4 text-sm leading-6 text-slate">{guide.body}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[20px] bg-white p-4 shadow-card">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
            Quick check
          </p>
          <p className="text-xs text-slate">1 question</p>
        </div>
        <h2 className="mt-2 text-base font-semibold text-ink">
          When is this Bitcoin pot for?
        </h2>
        <div className="mt-3 space-y-2">
          <Choice
            pressed={answer === "drop"}
            onClick={() => setAnswer("drop")}
            label="Whenever the price drops"
          />
          <Choice
            pressed={answer === "years"}
            onClick={() => setAnswer("years")}
            label="After 3 or more years, for a plan you already have"
          />
          <Choice
            pressed={answer === "rent"}
            onClick={() => setAnswer("rent")}
            label="To pay next week's rent"
          />
        </div>
        {answer ? (
          <p className="mt-3 text-sm leading-6 text-slate">{noteFor(answer)}</p>
        ) : null}
      </section>

      <p className="text-xs leading-5 text-slate">
        This is education, not financial advice. Bitcoin can lose value.
      </p>
    </main>
  );
}

function noteFor(answer: Answer): string {
  if (answer === "years") {
    return "That matches a patient habit. You still approve each purchase, and the value can fall.";
  }
  if (answer === "rent") {
    return "Money for next week belongs in the cushion. Bitcoin is for money you can leave alone.";
  }
  return "Buying because the price fell is trading. This app does not do that.";
}

function Choice({
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
      className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
        pressed ? "border-teal bg-mint text-ink" : "border-line bg-white text-ink"
      }`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`h-4 w-4 rounded-full border ${
          pressed ? "border-teal bg-teal" : "border-line"
        }`}
      />
    </button>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5M12 17h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
