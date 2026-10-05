"use client";

import Link from "next/link";
import { useI18n } from "../contexts/language-context";

type Step = "habit" | "invest";

/**
 * Shared shell for the continuous Habit → Invest money journey.
 * Habit = set a recurring surplus amount; Invest = review and approve a buy.
 */
export function HabitInvestJourney({ step }: { step: Step }) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("nav.habitJourney")}
      className="mb-5 flex items-stretch gap-2 rounded-[20px] border border-line bg-surface p-1.5 shadow-card"
    >
      <JourneyLink
        href="/habit"
        active={step === "habit"}
        index="1"
        label={t("nav.habitStep")}
        hint={t("nav.habitStepHint")}
      />
      <span className="flex shrink-0 items-center px-0.5 text-slate" aria-hidden="true">
        →
      </span>
      <JourneyLink
        href="/invest"
        active={step === "invest"}
        index="2"
        label={t("nav.investStep")}
        hint={t("nav.investStepHint")}
      />
    </nav>
  );
}

function JourneyLink({
  href,
  active,
  index,
  label,
  hint,
}: {
  href: string;
  active: boolean;
  index: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "step" : undefined}
      className={`flex min-w-0 flex-1 items-start gap-2 rounded-2xl px-3 py-2.5 transition-colors ${
        active ? "bg-mint/50 text-ink" : "text-slate hover:bg-pearl"
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          active ? "bg-teal text-on-primary" : "bg-pearl text-slate"
        }`}
      >
        {index}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate">{hint}</span>
      </span>
    </Link>
  );
}
