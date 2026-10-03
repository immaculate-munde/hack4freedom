"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { FinancialProfile } from "@pesasense/core";
import { appInvestAllowance, showBufferFirstUx } from "../lib/buffer-gate";
import { formatKes, habitPercentOfFloor } from "../lib/format";
import { habitOffer } from "../lib/habit-plan";

type MarkerId = "in" | "bills" | "spend" | "safe" | "cover";

type Marker = {
  id: MarkerId;
  label: string;
  title: string;
  figure: string;
  meaning: string;
};

const grouped = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

function monthsLabel(months: number): string {
  if (Number.isInteger(months)) return String(months);
  return months.toFixed(1).replace(/\.0$/, "");
}

function kesRange(low: number, high: number): string {
  return `${formatKes(low)}–${grouped.format(Math.round(high))}`;
}

export function buildLifeMarkers(profile: FinancialProfile): Marker[] {
  const income = profile.income.monthlyKes;
  const surplus = profile.surplus.monthlyKes;
  const floor = surplus.floor;
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const plan = profile.investmentPlan;
  const habit = plan?.amountKes ?? 0;
  const cadence = plan?.cadence === "weekly" ? "week" : "month";
  const markers: Marker[] = [
    {
      id: "in",
      label: "In",
      title: "What comes in",
      figure: kesRange(income.floor, income.ceiling),
      meaning: `A typical month is ${formatKes(income.typical)}. This is what the statement shows coming in. Stay with the statement.`,
    },
  ];

  if (profile.commitments.length > 0) {
    const promised = profile.commitments.reduce((sum, item) => sum + item.amountKes, 0);
    markers.push({
      id: "bills",
      label: "Bills",
      title: "Already promised",
      figure: `${formatKes(promised)} a month`,
      meaning: "These bills are spoken for. They are not surplus.",
    });
  }

  if (profile.spending.byCategory.length > 0) {
    const dayToDay = profile.spending.byCategory.reduce(
      (sum, item) => sum + item.monthlyKes.typical,
      0,
    );
    markers.push({
      id: "spend",
      label: "Spend",
      title: "Day to day",
      figure: formatKes(dayToDay),
      meaning: "This is the typical month of day-to-day spending.",
    });
  }

  const habitLine =
    habit > 0 && floor > 0
      ? `The habit is ${formatKes(habit)} a ${cadence}, ${habitPercentOfFloor(habit, floor)}% of that floor, not of the typical ${formatKes(surplus.typical)}. The wider range goes to ${formatKes(surplus.ceiling)}. Bitcoin can lose value.`
      : bufferFirst
        ? `The safe floor is ${formatKes(floor)}. Nothing is left to set aside after the bills. Bitcoin can lose value.`
        : `The safe floor is what is left after the regular bills. The wider range is ${formatKes(surplus.typical)} to ${formatKes(surplus.ceiling)}. No habit is saved yet. Bitcoin can lose value.`;

  markers.push({
    id: "safe",
    label: "Safe",
    title: "Safe to consider",
    figure: formatKes(floor),
    meaning: habitLine,
  });

  const months = profile.resilience.monthsOfExpensesCovered;
  markers.push({
    id: "cover",
    label: "Cover",
    title: "How long it covers",
    figure: `${monthsLabel(months)} months`,
    meaning: bufferFirst
      ? `The buffer comes first. ${monthsLabel(months)} months of expenses are covered, and this history is not ready for a Bitcoin habit yet.`
      : "This is the buffer. Keep the habit inside the floor. Do not stretch it.",
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
  const markers = useMemo(() => buildLifeMarkers(profile), [profile]);
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
  });

  return (
    <section className="rounded-[28px] bg-[#141210] px-3 py-3 sm:px-4" aria-label="The whole month">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-[#e3b23c] uppercase">
          The whole month
        </h2>
        {isDemo ? (
          <span className="rounded-full bg-[#e3b23c] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a32]">
            Demo data
          </span>
        ) : null}
      </div>
      <div
        className="grid grid-cols-2 gap-1.5 min-[400px]:grid-cols-3 min-[520px]:grid-cols-5"
        role="group"
        aria-label="Month markers"
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
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c4b8a4] uppercase">Next</p>
            <div className="mt-0.5">{next}</div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Link
          href={investReady ? "/invest" : habitHref}
          className="btn btn-accent inline-flex w-full justify-center"
        >
          {investReady ? "Review an investment" : "Set the habit"}
        </Link>
        <p className="text-center text-sm leading-5 text-[#c4b8a4]">
          You review it on the next screen. Nothing is sent until you approve it.
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
}: {
  id: MarkerId;
  investReady: boolean;
  habitReady: boolean;
  bufferFirst: boolean;
  hasBills: boolean;
  habitHref: string;
  onSelect: (id: MarkerId) => void;
  onOpenPromisedStop?: () => void;
}) {
  if (id === "in") {
    if (hasBills) {
      return (
        <button type="button" className={stepClass} onClick={() => onSelect("bills")}>
          See where it goes
        </button>
      );
    }
    if (onOpenPromisedStop) {
      return (
        <button type="button" className={stepClass} onClick={onOpenPromisedStop}>
          See where it goes
        </button>
      );
    }
    return null;
  }

  if (id === "bills") {
    if (!onOpenPromisedStop) return null;
    return (
      <button type="button" className={stepClass} onClick={onOpenPromisedStop}>
        Open them on the path
      </button>
    );
  }

  if (id === "spend") {
    return (
      <button type="button" className={stepClass} onClick={() => onSelect("safe")}>
        See the safe floor
      </button>
    );
  }

  if (id === "safe") {
    if (investReady) {
      return (
        <>
          <Link href="/invest" className={stepClass}>
            Review an investment
          </Link>
          <p className="mt-1 text-sm leading-5 text-[#c4b8a4]">Nothing is sent until you approve it.</p>
        </>
      );
    }
    if (habitReady) {
      return (
        <Link href={habitHref} className={stepClass}>
          Set the habit
        </Link>
      );
    }
    return (
      <button type="button" className={stepClass} onClick={() => onSelect("cover")}>
        See the buffer
      </button>
    );
  }

  if (bufferFirst) return null;
  return (
    <button type="button" className={stepClass} onClick={() => onSelect("safe")}>
      Keep it inside the floor
    </button>
  );
}
