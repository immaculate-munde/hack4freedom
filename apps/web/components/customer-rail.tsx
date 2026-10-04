"use client";

import { useFormat, useI18n } from "../contexts/language-context";
import { useActiveProfile } from "../lib/use-active-profile";

function initialFor(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : "•";
}

export function CustomerRail() {
  const { t } = useI18n();
  const { kes } = useFormat();
  const active = useActiveProfile();

  if (!active.ready) {
    return (
      <section className="rounded-[28px] border border-sand bg-paper p-5 text-ink shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          {t("nav.customer")}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate">{t("nav.empty")}</p>
        <p className="mt-4 text-xs leading-5 text-slate">{t("nav.phoneLine")}</p>
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
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine text-lg font-bold text-on-brand"
        >
          {initialFor(displayName)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
            {isDemo ? t("nav.demo") : t("nav.yours")}
          </p>
          <p className="truncate text-lg leading-6 font-bold text-ink">{displayName}</p>
        </div>
      </div>

      {isDemo ? (
        <p className="mt-4 inline-flex rounded-full bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate">
          {t("nav.demoData")}
        </p>
      ) : null}

      <dl className="mt-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs font-semibold text-slate">{t("nav.floor")}</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">{kes(floor)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs font-semibold text-slate">{t("nav.habit")}</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">
            {plan ? kes(plan.amountKes) : t("nav.noHabit")}
          </dd>
        </div>
        {plan ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs font-semibold text-slate">{t("nav.cadence")}</dt>
            <dd className="text-sm font-bold text-ink">
              {plan.cadence === "weekly" ? t("common.weekly") : t("common.monthly")}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-5 text-xs leading-5 text-slate">{t("nav.phoneLine")}</p>
    </section>
  );
}
