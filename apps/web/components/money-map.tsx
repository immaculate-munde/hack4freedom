"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  Cadence,
  CommitmentCategory,
  FinancialProfile,
  IncomeSource,
} from "@pesasense/core";
import { useFormat, useI18n } from "../contexts/language-context";

type MapAmount =
  | { type: "single"; value: number }
  | { type: "range"; low: number; high: number };

type MapStop = {
  id: string;
  categoryKey: string | null;
  categoryText: string;
  titleKey: string | null;
  titleText: string;
  amount: MapAmount;
  whenKey: string;
  whenTypical: number | null;
  share: number | null;
  sentenceKey: string;
  sentenceCategory: string | null;
};

const COMMITMENT_CATEGORY: Record<CommitmentCategory, string> = {
  rent: "overview.map.cat.rent",
  school_fees: "overview.map.cat.schoolFees",
  utilities: "overview.map.cat.utilities",
  loan: "overview.map.cat.loan",
  insurance: "overview.map.cat.insurance",
  chama: "overview.map.cat.chama",
  other: "overview.map.cat.commitment",
};

const COMMITMENT_SENTENCE: Record<CommitmentCategory, string> = {
  rent: "overview.map.sentence.rent",
  school_fees: "overview.map.sentence.schoolFees",
  utilities: "overview.map.sentence.utilities",
  loan: "overview.map.sentence.loan",
  insurance: "overview.map.sentence.insurance",
  chama: "overview.map.sentence.chama",
  other: "overview.map.sentence.commitment",
};

const SPENDING: Record<string, { categoryKey: string; sentenceKey: string }> = {
  groceries: {
    categoryKey: "overview.map.cat.groceries",
    sentenceKey: "overview.map.sentence.groceries",
  },
  transport: {
    categoryKey: "overview.map.cat.transport",
    sentenceKey: "overview.map.sentence.transport",
  },
  airtime: {
    categoryKey: "overview.map.cat.airtime",
    sentenceKey: "overview.map.sentence.airtime",
  },
  "eating out": {
    categoryKey: "overview.map.cat.eatingOut",
    sentenceKey: "overview.map.sentence.eatingOut",
  },
};

const BAND_TOP = 18;
const BAND_BOTTOM = 110;
const MAP_HEIGHT = 176;

function incomeShare(amountKes: number, typicalIncome: number): number | null {
  if (!(typicalIncome > 0) || !Number.isFinite(amountKes)) return null;
  return Math.round((amountKes / typicalIncome) * 100);
}

function cadenceWhenKey(cadence: Cadence): string {
  if (cadence === "weekly") return "overview.map.when.week";
  if (cadence === "termly") return "overview.map.when.term";
  if (cadence === "yearly") return "overview.map.when.year";
  if (cadence === "irregular") return "overview.map.when.irregular";
  return "overview.map.when.month";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function incomeSentenceKey(sources: Array<{ value: IncomeSource }>): string {
  if (sources.length !== 1) return "overview.map.sentence.incomeCombined";
  const kind = sources[0]?.value.kind;
  if (kind === "salary") return "overview.map.sentence.salary";
  if (kind === "business") return "overview.map.sentence.business";
  if (kind === "transfer") return "overview.map.sentence.transfer";
  return "overview.map.sentence.incomeOther";
}

export function buildMoneyStops(profile: FinancialProfile): MapStop[] {
  const income = profile.income.monthlyKes;
  const floor = profile.surplus.monthlyKes.floor;
  const typicalIncome = income.typical;
  const stops: MapStop[] = [
    {
      id: "income",
      categoryKey: "overview.map.cat.income",
      categoryText: "",
      titleKey: "overview.map.cat.income",
      titleText: "",
      amount: { type: "range", low: income.floor, high: income.ceiling },
      whenKey: "overview.map.when.monthTypical",
      whenTypical: typicalIncome,
      share: null,
      sentenceKey: incomeSentenceKey(profile.income.sources),
      sentenceCategory: null,
    },
  ];

  profile.commitments.forEach((item, index) => {
    stops.push({
      id: `commitment-${index}`,
      categoryKey: COMMITMENT_CATEGORY[item.category],
      categoryText: "",
      titleKey: null,
      titleText: item.label,
      amount: { type: "single", value: item.amountKes },
      whenKey: cadenceWhenKey(item.cadence),
      whenTypical: null,
      share: incomeShare(item.amountKes, typicalIncome),
      sentenceKey: COMMITMENT_SENTENCE[item.category],
      sentenceCategory: null,
    });
  });

  profile.spending.byCategory.forEach((item, index) => {
    const known = SPENDING[item.category];
    const label = titleCase(item.category);
    stops.push({
      id: `spending-${index}`,
      categoryKey: known?.categoryKey ?? null,
      categoryText: known ? "" : label,
      titleKey: known?.categoryKey ?? null,
      titleText: known ? "" : label,
      amount: { type: "single", value: item.monthlyKes.typical },
      whenKey: "overview.map.when.month",
      whenTypical: null,
      share: incomeShare(item.monthlyKes.typical, typicalIncome),
      sentenceKey: known?.sentenceKey ?? "overview.map.sentence.spendingOther",
      sentenceCategory: known ? null : label,
    });
  });

  stops.push({
    id: "surplus",
    categoryKey: "overview.map.cat.surplus",
    categoryText: "",
    titleKey: "overview.map.safeFloor",
    titleText: "",
    amount: { type: "single", value: floor },
    whenKey: "overview.map.when.month",
    whenTypical: null,
    share: incomeShare(floor, typicalIncome),
    sentenceKey: "overview.map.sentence.surplus",
    sentenceCategory: null,
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
  const { t } = useI18n();
  const { kes } = useFormat();
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

  const category = selected.categoryKey ? t(selected.categoryKey) : selected.categoryText;
  const title = selected.titleText
    ? selected.titleText
    : selected.titleKey
      ? t(selected.titleKey)
      : category;
  const amountLine =
    selected.amount.type === "range"
      ? t("overview.map.amountRange", {
          low: kes(selected.amount.low),
          high: kes(selected.amount.high),
        })
      : kes(selected.amount.value);
  const whenLine =
    selected.whenTypical != null
      ? t(selected.whenKey, { typical: kes(selected.whenTypical) })
      : t(selected.whenKey);
  const sentence = t(
    selected.sentenceKey,
    selected.sentenceCategory ? { category: selected.sentenceCategory } : undefined,
  );

  return (
    <section
      id="month-path"
      className="overflow-x-clip rounded-[28px] border border-[#e3b23c]/25 bg-[#141210] px-3 py-6 sm:px-6"
      aria-labelledby={headingId}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xs font-semibold tracking-[0.16em] text-[#e3b23c] uppercase">
          {t("overview.map.heading")}
        </h2>
        {isDemo ? (
          <span className="rounded-full bg-[#e3b23c] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a32]">
            {t("overview.demoData")}
          </span>
        ) : null}
      </div>
      <div ref={boxRef} className="money-map-track relative" style={{ height: MAP_HEIGHT }}>
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
          const stopCategory = stop.categoryKey ? t(stop.categoryKey) : stop.categoryText;
          const stopTitle = stop.titleText
            ? stop.titleText
            : stop.titleKey
              ? t(stop.titleKey)
              : stopCategory;
          return (
            <button
              key={stop.id}
              type="button"
              aria-pressed={isSelected}
              aria-controls={detailId}
              onClick={() => setSelectedId(stop.id)}
              className="absolute w-[3.5rem] -translate-x-1/2 rounded-xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c] md:w-[5.5rem]"
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
              <span className="mt-1 block whitespace-normal break-words text-[8px] leading-3 font-semibold text-[#e3b23c] uppercase md:truncate md:text-[10px] md:leading-normal md:tracking-[0.08em]">
                {stopCategory}
              </span>
              <span
                className="block whitespace-normal break-words text-[9px] leading-3 font-bold md:truncate md:text-[11px] md:leading-4"
                style={{ color: isSelected ? "#ffffff" : "#f6f1e4" }}
              >
                {stopTitle}
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
          {category}
        </p>
        <p className="mt-1 text-base font-bold text-white">{title}</p>
        <p className="mt-1 text-sm font-semibold text-[#f6f1e4] tabular-nums">
          {amountLine}{" "}
          <span className="font-medium text-[#c4b8a4]">{whenLine}</span>
        </p>
        {selected.share !== null ? (
          <p className="mt-1 text-sm text-[#f6f1e4]">
            {t("overview.map.share", {
              share: selected.share,
              amount: kes(profile.income.monthlyKes.typical),
            })}
          </p>
        ) : null}
        <p className="mt-1 text-sm leading-5 text-[#c4b8a4]">{sentence}</p>
      </div>
    </section>
  );
}
