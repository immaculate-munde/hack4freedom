"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  Cadence,
  CommitmentCategory,
  FinancialProfile,
  IncomeSource,
} from "@pesasense/core";
import { useFormat, useI18n } from "../contexts/language-context";
import {
  hasBusinessIncome,
  joinNames,
  titleCaseWords,
  topIncomeLabels,
  topSpendCategories,
} from "../lib/overview-story";

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
  sentenceVars?: Record<string, string | number>;
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

const SPENDING: Record<string, { categoryKey: string; sentenceKey: string }> = {
  groceries: {
    categoryKey: "overview.map.cat.groceries",
    sentenceKey: "overview.map.sentence.groceriesNamed",
  },
  transport: {
    categoryKey: "overview.map.cat.transport",
    sentenceKey: "overview.map.sentence.transportNamed",
  },
  airtime: {
    categoryKey: "overview.map.cat.airtime",
    sentenceKey: "overview.map.sentence.airtimeNamed",
  },
  "eating out": {
    categoryKey: "overview.map.cat.eatingOut",
    sentenceKey: "overview.map.sentence.eatingOutNamed",
  },
};

const BAND_TOP = 18;
const BAND_BOTTOM = 110;
const MAP_HEIGHT = 176;
const ROW_HEIGHT = 58;

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

function incomeSentence(
  sources: Array<{ value: IncomeSource }>,
): { key: string; vars?: Record<string, string | number> } {
  const labels = sources
    .slice()
    .sort((a, b) => b.value.monthlyKes.typical - a.value.monthlyKes.typical)
    .map((row) => row.value.label.trim())
    .filter(Boolean);
  const named = joinNames(labels.slice(0, 2));
  if (sources.length === 1) {
    const kind = sources[0]?.value.kind;
    if (kind === "salary") {
      return named
        ? { key: "overview.map.sentence.salaryNamed", vars: { label: named } }
        : { key: "overview.map.sentence.salary" };
    }
    if (kind === "business") {
      return named
        ? { key: "overview.map.sentence.businessNamed", vars: { label: named } }
        : { key: "overview.map.sentence.business" };
    }
    if (kind === "transfer") {
      return named
        ? { key: "overview.map.sentence.transferNamed", vars: { label: named } }
        : { key: "overview.map.sentence.transfer" };
    }
  }
  if (named) {
    return { key: "overview.map.sentence.incomeCombinedNamed", vars: { labels: named } };
  }
  return { key: "overview.map.sentence.incomeCombined" };
}

function commitmentSentenceKey(category: CommitmentCategory): string {
  const map: Record<CommitmentCategory, string> = {
    rent: "overview.map.sentence.rentNamed",
    school_fees: "overview.map.sentence.schoolFeesNamed",
    utilities: "overview.map.sentence.utilitiesNamed",
    loan: "overview.map.sentence.loanNamed",
    insurance: "overview.map.sentence.insuranceNamed",
    chama: "overview.map.sentence.chamaNamed",
    other: "overview.map.sentence.commitmentNamed",
  };
  return map[category];
}

export function buildMoneyStops(profile: FinancialProfile): MapStop[] {
  const income = profile.income.monthlyKes;
  const floor = profile.surplus.monthlyKes.floor;
  const typicalIncome = income.typical;
  const incomeLine = incomeSentence(profile.income.sources);
  const stops: MapStop[] = [
    {
      id: "income",
      categoryKey: "overview.map.cat.income",
      categoryText: "",
      titleKey: null,
      titleText: topIncomeLabels(profile, 1)[0] ?? "",
      amount: { type: "range", low: income.floor, high: income.ceiling },
      whenKey: "overview.map.when.monthTypical",
      whenTypical: typicalIncome,
      share: null,
      sentenceKey: incomeLine.key,
      sentenceVars: incomeLine.vars,
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
      sentenceKey: commitmentSentenceKey(item.category),
      sentenceVars: { label: item.label },
    });
  });

  const biggestSpend = topSpendCategories(profile, 1)[0] ?? "";
  profile.spending.byCategory.forEach((item, index) => {
    const known = SPENDING[item.category];
    const label = titleCaseWords(item.category);
    const share = incomeShare(item.monthlyKes.typical, typicalIncome);
    const isTop = item.category === biggestSpend;
    stops.push({
      id: `spending-${index}`,
      categoryKey: known?.categoryKey ?? null,
      categoryText: known ? "" : label,
      titleKey: known?.categoryKey ?? null,
      titleText: known ? "" : label,
      amount: { type: "single", value: item.monthlyKes.typical },
      whenKey: "overview.map.when.month",
      whenTypical: null,
      share,
      sentenceKey: isTop
        ? "overview.map.sentence.spendingTop"
        : (known?.sentenceKey ?? "overview.map.sentence.spendingOtherNamed"),
      sentenceVars: {
        category: label,
        share: share ?? 0,
      },
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
    sentenceKey:
      floor <= 0
        ? "overview.map.sentence.surplusEmpty"
        : hasBusinessIncome(profile)
          ? "overview.map.sentence.surplusBusiness"
          : "overview.map.sentence.surplusNamed",
    sentenceVars: { floor: floor },
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

function snakePoints(
  count: number,
  width: number,
  rowHeight: number,
): Array<{ x: number; y: number }> {
  const colGap = width * 0.5;
  const leftX = width * 0.25;
  const rightX = leftX + colGap * 0.5;
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const goRight = row % 2 === 0;
    const x = goRight ? (col === 0 ? leftX : rightX) : col === 0 ? rightX : leftX;
    points.push({ x, y: 22 + row * rowHeight });
  }
  return points;
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
  const sectionRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(320);
  const headingId = useId();
  const detailId = useId();
  const rows = Math.ceil(stops.length / 2);
  const mobileHeight = Math.max(rows * ROW_HEIGHT + 8, ROW_HEIGHT);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(el.clientWidth - 24, 240));
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

  const desktopPoints = stops.map((_, index) => {
    const span = Math.max(stops.length - 1, 1);
    return {
      x: 28 + (index / span) * Math.max(width - 56, 1),
      y: index % 2 === 0 ? BAND_TOP : BAND_BOTTOM,
    };
  });
  const mobilePoints = snakePoints(stops.length, width, ROW_HEIGHT);

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
  const sentenceVars = {
    ...selected.sentenceVars,
    ...(typeof selected.sentenceVars?.floor === "number"
      ? { floor: kes(selected.sentenceVars.floor as number) }
      : {}),
  };
  const sentence = t(selected.sentenceKey, sentenceVars);

  function renderStop(
    stop: MapStop,
    index: number,
    point: { x: number; y: number },
    compact: boolean,
  ) {
    const isSelected = stop.id === selected!.id;
    const stopCategory = stop.categoryKey ? t(stop.categoryKey) : stop.categoryText;
    const stopTitle = stop.titleText
      ? stop.titleText
      : stop.titleKey
        ? t(stop.titleKey)
        : stopCategory;
    return (
      <button
        key={`${compact ? "m" : "d"}-${stop.id}`}
        type="button"
        aria-pressed={isSelected}
        aria-controls={detailId}
        onClick={() => setSelectedId(stop.id)}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c] ${
          compact ? "w-[6.5rem]" : "w-[3.5rem] md:w-[5.5rem]"
        }`}
        style={{ left: point.x, top: point.y }}
      >
        <span
          aria-hidden="true"
          className={`mx-auto flex items-center justify-center rounded-full font-semibold ${
            compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs"
          }`}
          style={{
            backgroundColor: isSelected ? "#e3b23c" : "transparent",
            color: isSelected ? "#1e3a32" : "#e3b23c",
            border: "1.5px solid #e3b23c",
            boxShadow: isSelected ? "0 0 0 3px rgb(227 178 60 / 28%)" : "none",
          }}
        >
          {index + 1}
        </span>
        <span
          className={`mt-0.5 block whitespace-normal break-words font-semibold text-[#e3b23c] uppercase ${
            compact ? "text-[8px] leading-2.5" : "text-[8px] leading-3 md:truncate md:text-[10px]"
          }`}
        >
          {stopCategory}
        </span>
        <span
          className={`block whitespace-normal break-words font-bold ${
            compact ? "text-[9px] leading-3" : "text-[9px] leading-3 md:truncate md:text-[11px]"
          }`}
          style={{ color: isSelected ? "#ffffff" : "#f6f1e4" }}
        >
          {stopTitle || stopCategory}
        </span>
      </button>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="month-path"
      className="overflow-x-clip rounded-[28px] border border-[#e3b23c]/25 bg-[#141210] px-3 py-4 sm:px-6 sm:py-6"
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

      {/* Phone: compact vertical path, two nodes per row */}
      <div className="money-map-track relative md:hidden" style={{ height: mobileHeight }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={mobileHeight}
          aria-hidden="true"
        >
          <path
            d={curveThrough(mobilePoints)}
            fill="none"
            stroke="#e3b23c"
            strokeWidth="1.5"
            strokeDasharray="5 7"
            strokeLinecap="round"
          />
        </svg>
        {stops.map((stop, index) => {
          const point = mobilePoints[index];
          if (!point) return null;
          return renderStop(stop, index, point, true);
        })}
      </div>

      {/* Desktop: wider winding path */}
      <div className="money-map-track relative hidden md:block" style={{ height: MAP_HEIGHT }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={MAP_HEIGHT}
          aria-hidden="true"
        >
          <path
            d={curveThrough(desktopPoints)}
            fill="none"
            stroke="#e3b23c"
            strokeWidth="1.75"
            strokeDasharray="7 9"
            strokeLinecap="round"
          />
        </svg>
        {stops.map((stop, index) => {
          const point = desktopPoints[index];
          if (!point) return null;
          const onLeft = index % 2 === 0;
          return renderStop(stop, index, { x: point.x, y: onLeft ? 28 : 124 }, false);
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
        <p className="mt-1 text-base font-bold text-white">{title || category}</p>
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
