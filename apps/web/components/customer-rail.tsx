"use client";

import { formatKes } from "../lib/format";
import { useActiveProfile } from "../lib/use-active-profile";

type Language = "en" | "sw";

const copy = {
  en: {
    label: "Customer profile",
    demo: "Demo profile",
    yours: "Your profile",
    demoData: "Demo data",
    floor: "Safe surplus floor",
    habit: "Habit",
    cadence: "Cadence",
    monthly: "Monthly",
    weekly: "Weekly",
    noHabit: "No habit yet",
    phone: "Your statements never leave your phone.",
    empty: "No profile on this phone yet.",
  },
  sw: {
    label: "Wasifu wa mteja",
    demo: "Wasifu wa mfano",
    yours: "Wasifu wako",
    demoData: "Data ya mfano",
    floor: "Kiwango cha chini cha ziada",
    habit: "Tabia",
    cadence: "Mzunguko",
    monthly: "Kila mwezi",
    weekly: "Kila wiki",
    noHabit: "Hakuna tabia bado",
    phone: "Taarifa zako hazitoki kwenye simu.",
    empty: "Hakuna wasifu kwenye simu hii bado.",
  },
} as const;

function initialFor(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : "•";
}

export function CustomerRail({ language }: { language: Language }) {
  const t = copy[language];
  const active = useActiveProfile();

  if (!active.ready) {
    return (
      <section className="rounded-[28px] border border-sand bg-paper p-5 text-ink shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">{t.label}</p>
        <p className="mt-3 text-sm leading-6 text-slate">{t.empty}</p>
        <p className="mt-4 text-xs leading-5 text-slate">{t.phone}</p>
      </section>
    );
  }

  const { profile, isDemo, displayName } = active;
  const floor = profile.surplus.monthlyKes.floor;
  const plan = profile.investmentPlan;

  return (
    <section className="rounded-[28px] border border-sand bg-paper p-5 text-ink shadow-card">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine text-lg font-bold text-[#fdfbf7]"
        >
          {initialFor(displayName)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
            {isDemo ? t.demo : t.yours}
          </p>
          <p className="truncate text-lg leading-6 font-bold text-ink">{displayName}</p>
        </div>
      </div>

      {isDemo ? (
        <p className="mt-4 inline-flex rounded-full bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate">
          {t.demoData}
        </p>
      ) : null}

      <dl className="mt-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs font-semibold text-slate">{t.floor}</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">{formatKes(floor)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs font-semibold text-slate">{t.habit}</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">
            {plan ? formatKes(plan.amountKes) : t.noHabit}
          </dd>
        </div>
        {plan ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs font-semibold text-slate">{t.cadence}</dt>
            <dd className="text-sm font-bold text-ink">
              {plan.cadence === "weekly" ? t.weekly : t.monthly}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-5 text-xs leading-5 text-slate">{t.phone}</p>
    </section>
  );
}
