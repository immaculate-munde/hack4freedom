"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { FinancialProfile } from "@pesasense/core";
import { useFormat, useI18n } from "../contexts/language-context";
import { appInvestAllowance, showBufferFirstUx } from "../lib/buffer-gate";
import { habitPercentOfFloor } from "../lib/format";
import { habitOffer } from "../lib/habit-plan";

type MarkerId = "in" | "bills" | "spend" | "safe" | "cover";

type Marker = {
  id: MarkerId;
  label: string;
  title: string;
  figure: string;
  meaning: string;
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function monthsLabel(months: number): string {
  if (Number.isInteger(months)) return String(months);
  return months.toFixed(1).replace(/\.0$/, "");
}

function monthsFigure(months: number, t: Translate): string {
  const count = monthsLabel(months);
  if (Number(count) === 1) return t("overview.markers.oneMonth", { count });
  return t("overview.markers.manyMonths", { count });
}

export function buildLifeMarkers(
  profile: FinancialProfile,
  t: Translate,
  kes: (amount: number) => string,
  number: (amount: number) => string,
): Marker[] {
  const income = profile.income.monthlyKes;
  const surplus = profile.surplus.monthlyKes;
  const floor = surplus.floor;
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const plan = profile.investmentPlan;
  const habit = plan?.amountKes ?? 0;
  const markers: Marker[] = [
    {
      id: "in",
      label: t("overview.markers.in"),
      title: t("overview.markers.inTitle"),
      figure: t("overview.markers.range", {
        low: kes(income.floor),
        high: number(income.ceiling),
      }),
      meaning: t("overview.markers.inMeaning", { typical: kes(income.typical) }),
    },
  ];

  if (profile.commitments.length > 0) {
    const promised = profile.commitments.reduce((sum, item) => sum + item.amountKes, 0);
    markers.push({
      id: "bills",
      label: t("overview.markers.bills"),
      title: t("overview.markers.billsTitle"),
      figure: t("overview.markers.perMonth", { amount: kes(promised) }),
      meaning: t("overview.markers.billsMeaning"),
    });
  }

  if (profile.spending.byCategory.length > 0) {
    const dayToDay = profile.spending.byCategory.reduce(
      (sum, item) => sum + item.monthlyKes.typical,
      0,
    );
    markers.push({
      id: "spend",
      label: t("overview.markers.spend"),
      title: t("overview.markers.spendTitle"),
      figure: kes(dayToDay),
      meaning: t("overview.markers.spendMeaning"),
    });
  }

  const habitLine =
    habit > 0 && floor > 0
      ? t(
          plan?.cadence === "weekly"
            ? "overview.markers.safeHabitWeek"
            : "overview.markers.safeHabitMonth",
          {
            habit: kes(habit),
            share: habitPercentOfFloor(habit, floor),
            typical: kes(surplus.typical),
            ceiling: kes(surplus.ceiling),
          },
        )
      : bufferFirst
        ? t("overview.markers.safeEmpty", { floor: kes(floor) })
        : t("overview.markers.safeNoHabit", {
            typical: kes(surplus.typical),
            ceiling: kes(surplus.ceiling),
          });

  markers.push({
    id: "safe",
    label: t("overview.markers.safe"),
    title: t("overview.markers.safeTitle"),
    figure: kes(floor),
    meaning: habitLine,
  });

  const months = profile.resilience.monthsOfExpensesCovered;
  markers.push({
    id: "cover",
    label: t("overview.markers.cover"),
    title: t("overview.markers.coverTitle"),
    figure: monthsFigure(months, t),
    meaning: bufferFirst
      ? t("overview.markers.coverBuffer", { months: monthsLabel(months) })
      : t("overview.markers.coverReady"),
  });

  return markers;
}

const stepClass =
  "text-sm font-semibold text-[#e3b23c] underline decoration-[#e3b23c]/70 underline-offset-2";

export function LifeMarkers({
  profile,
  isDemo,
  habitHref = "/habit",
  onOpenPromisedStop,
}: {
  profile: FinancialProfile;
  isDemo: boolean;
  habitHref?: string;
  /** Opens a bill on the winding path when that path is on the page. */
  onOpenPromisedStop?: () => void;
}) {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const markers = useMemo(
    () => buildLifeMarkers(profile, t, kes, number),
    [profile, t, kes, number],
  );
  const [selectedId, setSelectedId] = useState<MarkerId>(markers[0]?.id ?? "in");
  const selected = markers.find((marker) => marker.id === selectedId) ?? markers[0];
  const readingId = useId();
  const hasBills = markers.some((marker) => marker.id === "bills");
  const allowance = appInvestAllowance(profile);
  const offer = habitOffer(profile);
  const hasPlan = (profile.investmentPlan?.amountKes ?? 0) > 0;
  const investReady = allowance.ok && hasPlan;
  const bufferFirst = showBufferFirstUx(profile) || profile.surplus.monthlyKes.floor <= 0;

  function select(id: MarkerId) {
    if (markers.some((marker) => marker.id === id)) setSelectedId(id);
  }

  if (!selected) return null;

  const next = nextStep({
    id: selected.id,
    investReady,
    habitReady: !hasPlan && offer.ok,
    bufferFirst,
    hasBills,
    habitHref,
    onSelect: select,
    onOpenPromisedStop,
    t,
  });

  return (
    <section className="rounded-[28px] border border-[#e3b23c]/25 bg-[#141210] px-3 py-3 sm:px-4" aria-label={t("overview.markers.heading")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-[#e3b23c] uppercase">
          {t("overview.markers.heading")}
        </h2>
        {isDemo ? (
          <span className="rounded-full bg-[#e3b23c] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a32]">
            {t("overview.demoData")}
          </span>
        ) : null}
      </div>
      <div
        className="grid grid-cols-2 gap-1.5 min-[400px]:grid-cols-3 min-[520px]:grid-cols-5"
        role="group"
        aria-label={t("overview.markers.group")}
      >
        {markers.map((marker, index) => {
          const isSelected = marker.id === selected.id;
          return (
            <button
              key={marker.id}
              type="button"
              aria-pressed={isSelected}
              aria-controls={readingId}
              onClick={() => select(marker.id)}
              className={`min-w-0 rounded-xl px-1.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c] ${
                isSelected
                  ? "bg-[#e3b23c] text-[#1e3a32]"
                  : "bg-[#1c1914] text-[#f6f1e4]"
              }`}
            >
              <span
                className={`block text-[10px] font-semibold tracking-[0.12em] uppercase ${
                  isSelected ? "text-[#1e3a32]" : "text-[#c4b8a4]"
                }`}
              >
                {index + 1} {marker.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 font-bold sm:text-xs">
                {marker.title}
              </span>
            </button>
          );
        })}
      </div>
      <div id={readingId} aria-live="polite" className="mt-2 rounded-2xl bg-[#1c1914] px-3 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c4b8a4] uppercase">
          {selected.title}
        </p>
        <p className="mt-0.5 text-base font-bold text-[#f6f1e4] tabular-nums">{selected.figure}</p>
        <p className="mt-1 text-sm leading-5 text-[#f6f1e4]">{selected.meaning}</p>
        {next ? (
          <div className="mt-2">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c4b8a4] uppercase">
              {t("overview.markers.next")}
            </p>
            <div className="mt-0.5">{next}</div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Link
          href={investReady ? "/invest" : habitHref}
          className="btn btn-accent inline-flex w-full justify-center"
        >
          {investReady ? t("overview.markers.reviewInvestment") : t("overview.markers.setHabit")}
        </Link>
        <p className="text-center text-sm leading-5 text-[#c4b8a4]">
          {t("overview.markers.reviewNext")}
        </p>
      </div>
    </section>
  );
}

function nextStep({
  id,
  investReady,
  habitReady,
  bufferFirst,
  hasBills,
  habitHref,
  onSelect,
  onOpenPromisedStop,
  t,
}: {
  id: MarkerId;
  investReady: boolean;
  habitReady: boolean;
  bufferFirst: boolean;
  hasBills: boolean;
  habitHref: string;
  onSelect: (id: MarkerId) => void;
  onOpenPromisedStop?: () => void;
  t: Translate;
}) {
  if (id === "in") {
    if (hasBills) {
      return (
        <button type="button" className={stepClass} onClick={() => onSelect("bills")}>
          {t("overview.markers.seeWhere")}
        </button>
      );
    }
    if (onOpenPromisedStop) {
      return (
        <button type="button" className={stepClass} onClick={onOpenPromisedStop}>
          {t("overview.markers.seeWhere")}
        </button>
      );
    }
    return null;
  }

  if (id === "bills") {
    if (!onOpenPromisedStop) return null;
    return (
      <button type="button" className={stepClass} onClick={onOpenPromisedStop}>
        {t("overview.markers.openPath")}
      </button>
    );
  }

  if (id === "spend") {
    return (
      <button type="button" className={stepClass} onClick={() => onSelect("safe")}>
        {t("overview.markers.seeFloor")}
      </button>
    );
  }

  if (id === "safe") {
    if (investReady) {
      return (
        <>
          <Link href="/invest" className={stepClass}>
            {t("overview.markers.reviewInvestment")}
          </Link>
          <p className="mt-1 text-sm leading-5 text-[#c4b8a4]">{t("overview.markers.nothingSent")}</p>
        </>
      );
    }
    if (habitReady) {
      return (
        <Link href={habitHref} className={stepClass}>
          {t("overview.markers.setHabit")}
        </Link>
      );
    }
    return (
      <button type="button" className={stepClass} onClick={() => onSelect("cover")}>
        {t("overview.markers.seeBuffer")}
      </button>
    );
  }

  if (bufferFirst) return null;
  return (
    <button type="button" className={stepClass} onClick={() => onSelect("safe")}>
      {t("overview.markers.keepInside")}
    </button>
  );
}
