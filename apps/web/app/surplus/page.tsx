"use client";

import Link from "next/link";
import { Suspense } from "react";
import type { CommitmentCategory } from "@pesasense/core";
import { AnimatedNumber } from "../../components/animated-number";
import { DemoProfileSwitch } from "../../components/demo-profile-switch";
import { ProfileRequired } from "../../components/profile-required";
import { SensiAvatar } from "../../components/sensi-avatar";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useActiveProfile } from "../../lib/use-active-profile";

function getCategoryColor(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("rent") || c.includes("housing")) return "var(--color-cat-housing)";
  if (c.includes("loan") || c.includes("debt")) return "var(--color-cat-debt)";
  if (c.includes("utilit")) return "var(--color-cat-utilities)";
  if (c.includes("chama")) return "var(--color-cat-chama)";
  if (c.includes("grocer")) return "var(--color-cat-groceries)";
  return "var(--color-cat-default)";
}

const COMMITMENT_KEYS: Record<CommitmentCategory, string> = {
  rent: "surplus.category.rent",
  school_fees: "surplus.category.schoolFees",
  utilities: "surplus.category.utilities",
  loan: "surplus.category.loan",
  insurance: "surplus.category.insurance",
  chama: "surplus.category.chama",
  other: "surplus.category.other",
};

const SPENDING_KEYS: Record<string, string> = {
  groceries: "surplus.category.groceries",
  transport: "surplus.category.transport",
  airtime: "surplus.category.airtime",
  "eating out": "surplus.category.eatingOut",
};

function SurplusContent() {
  const active = useActiveProfile();
  const { t } = useI18n();
  const { kes } = useFormat();
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo } = active;
  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  const habit = profile.investmentPlan;
  const rows = [
    ...profile.commitments.map((item) => ({
      label: item.label,
      category: item.category,
      detail: t("surplus.seen", {
        category: t(COMMITMENT_KEYS[item.category]),
        count: item.observations,
      }),
      amount: item.amountKes,
    })),
    ...profile.spending.byCategory.map((item) => {
      const key = SPENDING_KEYS[item.category.toLowerCase()];
      return {
        label: key ? t(key) : item.category,
        category: item.category,
        detail: t("surplus.flexible"),
        amount: item.monthlyKes.typical,
      };
    }),
  ];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-24 md:gap-4 md:pb-0">
      <div className="mb-2 flex items-end justify-between gap-3 md:mb-0">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">{t("surplus.eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{t("surplus.title")}</h1>
          <p className="mt-1 text-sm text-slate">{t("surplus.onPhone")}</p>
        </div>
        <p className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-teal">
          {t("surplus.monthsActuals", { months: profile.window.monthsCovered })}
        </p>
      </div>
      {isDemo ? (
        <p className="text-xs font-semibold text-slate">
          <span className="rounded-full bg-pearl px-2.5 py-1">{t("surplus.demoData")}</span>
        </p>
      ) : null}
      <p className="flex items-center gap-2 rounded-[18px] border border-mint/60 bg-mint/20 px-4 py-3 text-sm text-ink">
        <span className="text-teal" aria-hidden="true">
          ●
        </span>
        {t("surplus.privacy")}
      </p>

      <div className="flex w-full max-w-6xl mx-auto flex-col gap-8 md:gap-6">
        <section className="w-full rounded-[20px] bg-gradient-to-br from-pine to-moss p-5 text-on-brand shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:to-[#163028]">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-brass uppercase">
            {t("surplus.cushion")}
          </p>
          <p className="mt-1 text-xl font-bold text-on-brand">{t("surplus.range")}</p>
          <p className="mt-1 text-sm text-on-brand/80">{t("surplus.typicalMonthly", { amount: kes(typical) })}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-mint/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-on-brand/80">{t("surplus.floor")}</dt>
              <dd className="mt-1 text-sm font-bold text-on-brand tabular-nums">
                <AnimatedNumber value={floor} />
              </dd>
            </div>
            <div className="rounded-2xl border border-brass/70 bg-sunflower/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-brass">{t("surplus.typical")}</dt>
              <dd className="mt-1 text-sm font-bold text-brass tabular-nums">
                <AnimatedNumber value={typical} />
              </dd>
            </div>
            <div className="rounded-2xl bg-sky/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-on-brand/80">{t("surplus.high")}</dt>
              <dd className="mt-1 text-sm font-bold text-on-brand tabular-nums">
                <AnimatedNumber value={ceiling} />
              </dd>
            </div>
          </dl>
          {habit ? (
            <p className="mt-4 text-sm text-on-brand/90">
              {t(habit.cadence === "weekly" ? "surplus.habitWeekly" : "surplus.habitMonthly", {
                amount: kes(habit.amountKes),
              })}
            </p>
          ) : profile.surplus.bufferFirst || floor <= 0 ? (
            <p className="mt-4 text-sm text-on-brand/90">{t("surplus.noHabitBuffer")}</p>
          ) : (
            <p className="mt-4 text-sm text-on-brand/90">{t("surplus.noHabitSet")}</p>
          )}
          <Link
            href={`/habit${query}`}
            className="btn btn-accent mt-4 inline-flex justify-center"
          >
            {habit ? t("surplus.reviewHabit") : t("surplus.setHabit")}
          </Link>
        </section>

        <section className="w-full">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <SensiAvatar size="sm" mood="thinking" />
              {t("surplus.commitments")}
            </h2>
            <p className="text-sm font-bold text-ink tabular-nums">{kes(total)}</p>
          </div>
          <ul className="flex flex-col gap-4 md:gap-3">
            {rows.map((row) => (
              <li
                key={`${row.label}-${row.detail}`}
                className="card w-full flex items-center justify-between gap-3 border-l-[3px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderLeftColor: getCategoryColor(row.category) }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-pine"
                    style={{ backgroundColor: getCategoryColor(row.category) }}
                  >
                    {row.label.slice(0, 1)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: getCategoryColor(row.category) }}>{row.label}</p>
                    <p className="truncate text-xs text-slate">{row.detail}</p>
                  </div>
                </div>
                <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink tabular-nums">
                  {kes(row.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Link href="/onboard" className="btn btn-accent inline-flex justify-center">
        {t("surplus.importStatement")}
      </Link>
      <Link href="/onboard" className="text-center text-sm font-semibold text-slate">
        {t("surplus.pasteInstead")}
      </Link>
      {isDemo ? (
        <p className="text-sm">
          <DemoProfileSwitch profileId={profileId} />
        </p>
      ) : null}
      <p className="text-xs leading-5 text-slate">{t("surplus.disclaimer")}</p>
    </main>
  );
}

export default function SurplusPage() {
  return (
    <Suspense>
      <SurplusContent />
    </Suspense>
  );
}
