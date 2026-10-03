"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  Cadence,
  CommitmentCategory,
  FinancialProfile,
  IncomeSource,
} from "@pesasense/core";
import { formatKes } from "../lib/format";

type MapStop = {
  id: string;
  category: string;
  title: string;
  amountLine: string;
  whenLine: string;
  share: number | null;
  sentence: string;
};

const COMMITMENT_CATEGORY: Record<CommitmentCategory, string> = {
  rent: "Rent",
  school_fees: "School fees",
  utilities: "Utilities",
  loan: "Loan",
  insurance: "Insurance",
  chama: "Chama",
  other: "Commitment",
};

const COMMITMENT_KIND: Record<CommitmentCategory, string> = {
  rent: "rent",
  school_fees: "school fees",
  utilities: "a utilities bill",
  loan: "a loan payment",
  insurance: "insurance",
  chama: "a chama contribution",
  other: "a regular commitment",
};

const SPENDING_KIND: Record<string, string> = {
  groceries: "groceries",
  transport: "transport",
  airtime: "airtime",
  "eating out": "eating out",
};

const BAND_TOP = 18;
const BAND_BOTTOM = 110;
const MAP_HEIGHT = 176;

function incomeShare(amountKes: number, typicalIncome: number): number | null {
  if (!(typicalIncome > 0) || !Number.isFinite(amountKes)) return null;
  return Math.round((amountKes / typicalIncome) * 100);
}

function cadencePhrase(cadence: Cadence): string {
  if (cadence === "weekly") return "a week";
  if (cadence === "termly") return "a term";
  if (cadence === "yearly") return "a year";
  if (cadence === "irregular") return ", not on a fixed schedule";
  return "a month";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function incomeKind(sources: Array<{ value: IncomeSource }>): string {
  if (sources.length !== 1) return "the combined income on this statement";
  const kind = sources[0]?.value.kind;
  if (kind === "salary") return "salary coming in";
  if (kind === "business") return "business income";
  if (kind === "transfer") return "money transferred in";
  return "money coming in";
}

function spendingKind(category: string): string {
  return SPENDING_KIND[category] ?? `${category} spending`;
}

export function buildMoneyStops(profile: FinancialProfile): MapStop[] {
  const income = profile.income.monthlyKes;
  const floor = profile.surplus.monthlyKes.floor;
  const typicalIncome = income.typical;
  const stops: MapStop[] = [
    {
      id: "income",
      category: "Income",
      title: "Income",
      amountLine: `${formatKes(income.floor)} to ${formatKes(income.ceiling)}`,
      whenLine: `a month, typically ${formatKes(typicalIncome)}`,
      share: null,
      sentence: `This is ${incomeKind(profile.income.sources)}.`,
    },
  ];

  profile.commitments.forEach((item, index) => {
    const when = cadencePhrase(item.cadence);
    stops.push({
      id: `commitment-${index}`,
      category: COMMITMENT_CATEGORY[item.category],
      title: item.label,
      amountLine: formatKes(item.amountKes),
      whenLine: when.replace(/^, /, ""),
      share: incomeShare(item.amountKes, typicalIncome),
      sentence: `This is ${COMMITMENT_KIND[item.category]}.`,
    });
  });

  profile.spending.byCategory.forEach((item, index) => {
    stops.push({
      id: `spending-${index}`,
      category: titleCase(item.category),
      title: titleCase(item.category),
      amountLine: formatKes(item.monthlyKes.typical),
      whenLine: "a month",
      share: incomeShare(item.monthlyKes.typical, typicalIncome),
      sentence: `This is ${spendingKind(item.category)}.`,
    });
  });

  stops.push({
    id: "surplus",
    category: "Surplus",
    title: "Safe surplus floor",
    amountLine: formatKes(floor),
    whenLine: "a month",
    share: incomeShare(floor, typicalIncome),
    sentence: "This is what is left after the regular bills.",
  });

  return stops;
}

function curveThrough(points: Array<{ x: number; y: number }>): string {
  const first = points[0];
  if (!first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    const midX = (from.x + to.x) / 2;
    d += ` C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  }
  return d;
}

export function MoneyMap({
  profile,
  isDemo,
  focusRequest,
}: {
  profile: FinancialProfile;
  isDemo: boolean;
  /** Ask the path to open a stop. A new token repeats the same id. */
  focusRequest?: { id: string; token: number } | null;
}) {
  const stops = useMemo(() => buildMoneyStops(profile), [profile]);
  const [selectedId, setSelectedId] = useState(stops[0]?.id ?? "income");
  const selected = stops.find((stop) => stop.id === selectedId) ?? stops[0];
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(680);
  const headingId = useId();
  const detailId = useId();

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    if (stops.some((stop) => stop.id === focusRequest.id)) {
      setSelectedId(focusRequest.id);
    }
  }, [focusRequest, stops]);

  const points = stops.map((_, index) => {
    const span = Math.max(stops.length - 1, 1);
    return {
      x: 28 + (index / span) * Math.max(width - 56, 1),
      y: index % 2 === 0 ? BAND_TOP : BAND_BOTTOM,
    };
  });

  if (!selected) return null;

  return (
    <section
      id="month-path"
      className="overflow-x-clip rounded-[28px] bg-[#141210] px-3 py-6 sm:px-6"
      aria-labelledby={headingId}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xs font-semibold tracking-[0.16em] text-[#e3b23c] uppercase">
          The month
        </h2>
        {isDemo ? (
          <span className="rounded-full bg-[#e3b23c] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a32]">
            Demo data
          </span>
        ) : null}
      </div>
      <div ref={boxRef} className="relative" style={{ height: MAP_HEIGHT }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={MAP_HEIGHT}
          aria-hidden="true"
        >
          <path
            d={curveThrough(points)}
            fill="none"
            stroke="#e3b23c"
            strokeWidth="1.75"
            strokeDasharray="7 9"
            strokeLinecap="round"
          />
        </svg>
        {stops.map((stop, index) => {
          const point = points[index];
          if (!point) return null;
          const onLeft = index % 2 === 0;
          const isSelected = stop.id === selected.id;
          return (
            <button
              key={stop.id}
              type="button"
              aria-pressed={isSelected}
              aria-controls={detailId}
              onClick={() => setSelectedId(stop.id)}
              className="absolute w-[5.5rem] -translate-x-1/2 rounded-xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c]"
              style={{ left: point.x, top: onLeft ? 4 : 96 }}
            >
              <span
                aria-hidden="true"
                className="mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: isSelected ? "#e3b23c" : "transparent",
                  color: isSelected ? "#1e3a32" : "#e3b23c",
                  border: "1.5px solid #e3b23c",
                  boxShadow: isSelected ? "0 0 0 4px rgb(227 178 60 / 28%)" : "none",
                }}
              >
                {index + 1}
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold tracking-[0.08em] text-[#e3b23c] uppercase">
                {stop.category}
              </span>
              <span
                className="block truncate text-[11px] leading-4 font-bold"
                style={{ color: isSelected ? "#ffffff" : "#f6f1e4" }}
              >
                {stop.title}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id={detailId}
        aria-live="polite"
        className="mt-2 rounded-2xl border border-[#e3b23c]/40 bg-[#1c1914] px-4 py-3"
      >
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#e3b23c] uppercase">
          {selected.category}
        </p>
        <p className="mt-1 text-base font-bold text-white">{selected.title}</p>
        <p className="mt-1 text-sm font-semibold text-[#f6f1e4] tabular-nums">
          {selected.amountLine}{" "}
          <span className="font-medium text-[#c4b8a4]">{selected.whenLine}</span>
        </p>
        {selected.share !== null ? (
          <p className="mt-1 text-sm text-[#f6f1e4]">
            {selected.share}% of typical income ({formatKes(profile.income.monthlyKes.typical)}).
          </p>
        ) : null}
        <p className="mt-1 text-sm leading-5 text-[#c4b8a4]">{selected.sentence}</p>
      </div>
    </section>
  );
}
