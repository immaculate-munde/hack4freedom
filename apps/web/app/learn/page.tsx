"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { demoProfiles } from "@pesasense/core";
import { useProfile } from "../../contexts/profile-context";
import { SavingsLadder } from "../../components/savings-ladder";
import { ScenarioChart } from "../../components/scenario-chart";

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

export default function LearnPage() {
  const router = useRouter();
  const { profile } = useProfile();

  const activeProfile = profile || demoProfiles.amina;
  const surplusFloor = activeProfile.surplus.monthlyKes.floor;
  const recommendedHabit = Math.round(surplusFloor * 0.75);

  const bufferMonths = activeProfile.resilience.monthsOfExpensesCovered;
  const currentStep = bufferMonths >= 3 ? 2 : 1;

  const [open, setOpen] = useState<number | null>(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [amount, setAmount] = useState<string>(recommendedHabit.toString());
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [error, setError] = useState<string | null>(null);

  const handleStartSaving = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (num > surplusFloor) {
      setError(`Amount cannot exceed your safe surplus of KES ${surplusFloor}.`);
      return;
    }
    setError(null);
    router.push("/invest");
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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

      <ScrollReveal>
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
              <span className="text-warning" aria-hidden="true">×</span>
              {flag}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-5 text-slate">
          Real Bitcoin has no manager. You hold it yourself.
        </p>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Plain language guides</h2>
          <p className="text-xs font-semibold text-slate">3 topics</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
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
      </ScrollReveal>

      <ScrollReveal>
        <section aria-labelledby="ladder-heading">
        <h2
          id="ladder-heading"
          className="mb-5 text-base font-semibold text-ink"
        >
          Your Savings Journey
        </h2>
        <SavingsLadder currentStep={currentStep} bufferMonths={bufferMonths} />
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="scenario-heading">
        <h2
          id="scenario-heading"
          className="mb-4 text-base font-semibold text-ink"
        >
          What could happen to your savings?
        </h2>
        <ScenarioChart />
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="start-saving-heading" className="rounded-[20px] bg-white p-5 shadow-card">
        <h2
          id="start-saving-heading"
          className="text-base font-semibold text-ink"
        >
          Start Saving
        </h2>
        <p className="mt-1 text-sm text-slate">
          Set up a steady habit based on your available surplus.
        </p>
        <form onSubmit={handleStartSaving} className="mt-5 space-y-5">
          <div>
            <label htmlFor="save-amount" className="block text-sm font-semibold text-ink">
              Amount (KES)
            </label>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm font-bold text-slate">KES</span>
              <input
                id="save-amount"
                type="number"
                inputMode="numeric"
                className="field max-w-[200px]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`e.g. ${recommendedHabit}`}
                max={surplusFloor}
              />
            </div>
            <p className="mt-2 text-xs text-slate">
              You can safely save up to{" "}
              <span className="font-semibold text-ink">KES {surplusFloor}</span>.
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-ink">Frequency</span>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setCadence("weekly")}
                className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  cadence === "weekly"
                    ? "border-pine bg-pine text-on-primary"
                    : "border-sand bg-paper text-ink hover:bg-sand/30"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setCadence("monthly")}
                className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  cadence === "monthly"
                    ? "border-pine bg-pine text-on-primary"
                    : "border-sand bg-paper text-ink hover:bg-sand/30"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-semibold text-warning" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-accent w-full py-4 text-base shadow-sm"
          >
            Start Saving
          </button>
        </form>
      </section>
      </ScrollReveal>

      <ScrollReveal>
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
      </ScrollReveal>

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
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 fill-none stroke-current"
      strokeWidth="1.75"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v5M12 17h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0z"
      />
    </svg>
  );
}

function ScrollReveal({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}
