"use client";

import type { ReactNode } from "react";
import type { FinancialProfile } from "@pesasense/core";
import { useFormat, useI18n } from "../contexts/language-context";
import { buildImportInsights } from "../lib/import-insights";

type Props = {
  profile: FinancialProfile;
  transactionCount?: number;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
};

export function ImportAnalysisCard({
  profile,
  transactionCount,
  primaryActionLabel,
  onPrimaryAction,
}: Props) {
  const { t } = useI18n();
  const { kes, number, date } = useFormat();
  const insights = buildImportInsights(profile);

  const fromLabel = (() => {
    try {
      return date(`${insights.periodLabel.slice(0, 10)}T12:00:00`);
    } catch {
      return profile.window.from;
    }
  })();
  const toLabel = (() => {
    try {
      return date(`${profile.window.to}T12:00:00`);
    } catch {
      return profile.window.to;
    }
  })();

  const verdict =
    insights.verdictKey === "bufferFirst"
      ? t("onboard.verdictBuffer")
      : insights.verdictKey === "thinHistory"
        ? t("onboard.verdictThin")
        : t("onboard.verdictHabit");

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-5 rounded-3xl border border-mint/60 bg-mint/20 p-5 text-pine shadow-sm duration-500 sm:p-6 lg:max-w-3xl">
      <header className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold text-pine">{t("onboard.analysisComplete")}</h2>
        <p className="text-sm leading-6 text-ink-soft">{verdict}</p>
        <p className="text-xs font-semibold text-slate">
          {t("onboard.periodLine", {
            from: fromLabel,
            to: toLabel,
            months: number(insights.monthsCovered),
            tx:
              transactionCount != null
                ? t("onboard.txCount", { count: number(transactionCount) })
                : "",
          })}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label={t("onboard.safeSurplus")}
          value={t("onboard.kesRange", {
            floor: number(insights.surplusFloor),
            ceiling: number(insights.surplusCeiling),
          })}
          hint={t("onboard.surplusHint", { typical: kes(insights.surplusTypical) })}
          emphasize
        />
        <Stat
          label={t("onboard.incomeRange")}
          value={t("onboard.kesRange", {
            floor: number(insights.incomeFloor),
            ceiling: number(insights.incomeCeiling),
          })}
          hint={t("onboard.incomeHint", { typical: kes(insights.incomeTypical) })}
        />
        <Stat
          label={t("onboard.resilience")}
          value={t("onboard.monthsCovered", { count: number(insights.monthsOfCushion) })}
          hint={
            insights.fulizaCount > 0
              ? t("onboard.fulizaHint", { count: number(insights.fulizaCount) })
              : t(`onboard.borrowing.${insights.borrowing}`)
          }
        />
        <Stat
          label={t("onboard.commitments")}
          value={t("onboard.items", { count: number(insights.commitments.length) })}
          hint={t("onboard.commitmentsHint", { total: kes(insights.commitmentTotal) })}
        />
      </div>

      {insights.incomeSources.length > 0 ? (
        <Block title={t("onboard.incomeSourcesTitle")}>
          <ul className="space-y-2">
            {insights.incomeSources.map((src) => (
              <li
                key={src.label}
                className="flex items-baseline justify-between gap-3 text-sm text-ink"
              >
                <span className="min-w-0 truncate font-medium">
                  {src.label}
                  <span className="ml-2 text-[11px] font-semibold text-slate">
                    {t(`onboard.regularity.${src.regularity}`)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-pine">{kes(src.typical)}/mo</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {insights.commitments.length > 0 ? (
        <Block title={t("onboard.commitmentsTitle")}>
          <ul className="space-y-2">
            {insights.commitments.map((c) => (
              <li
                key={`${c.category}-${c.label}`}
                className="flex items-baseline justify-between gap-3 text-sm text-ink"
              >
                <span className="min-w-0">
                  <span className="font-medium">{c.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-slate">
                    {c.category} · {t(`onboard.cadence.${c.cadence}`)} ·{" "}
                    {t("onboard.seenTimes", { count: number(c.observations) })}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-pine">{kes(c.amountKes)}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : (
        <Block title={t("onboard.commitmentsTitle")}>
          <p className="text-sm leading-6 text-ink-soft">{t("onboard.commitmentsEmpty")}</p>
        </Block>
      )}

      {insights.spendCategories.length > 0 ? (
        <Block title={t("onboard.spendTitle")}>
          <ul className="space-y-2">
            {insights.spendCategories.map((row) => (
              <li
                key={row.category}
                className="flex items-baseline justify-between gap-3 text-sm text-ink"
              >
                <span className="font-medium">{row.category}</span>
                <span className="font-semibold text-pine">{kes(row.typical)}/mo</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate">
            {t("onboard.flexibleHint", { amount: kes(insights.flexibleTypical) })}
          </p>
        </Block>
      ) : null}

      <p className="text-xs leading-5 text-slate">{t("onboard.analysisDisclaimer")}</p>

      <button
        type="button"
        onClick={onPrimaryAction}
        className="btn btn-primary w-full py-4 text-base shadow-sm"
      >
        {primaryActionLabel}
      </button>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        emphasize ? "border-brass/50 bg-brass/10" : "border-sand/60 bg-paper/70"
      }`}
    >
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate uppercase">{label}</p>
      <p className="mt-1 text-base font-bold text-pine">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-ink-soft">{hint}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-sand/50 bg-paper/60 px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-slate uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
