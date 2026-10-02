import type { FinancialProfile } from "@pesasense/core";
import { formatKes, habitPercentOfFloor } from "../lib/format";

type Marker = {
  label: string;
  title: string;
  sentence: string;
};

function monthsLabel(months: number): string {
  if (Number.isInteger(months)) return String(months);
  return months.toFixed(1).replace(/\.0$/, "");
}

export function buildLifeMarkers(profile: FinancialProfile): Marker[] {
  const income = profile.income.monthlyKes;
  const surplus = profile.surplus.monthlyKes;
  const markers: Marker[] = [
    {
      label: "In",
      title: "What comes in",
      sentence: `Income runs from ${formatKes(income.floor)} to ${formatKes(income.ceiling)} a month, and a typical month is ${formatKes(income.typical)}.`,
    },
  ];

  if (profile.commitments.length > 0) {
    const promised = profile.commitments.reduce((sum, item) => sum + item.amountKes, 0);
    markers.push({
      label: "Bills",
      title: "Already promised",
      sentence: `Regular bills add up to ${formatKes(promised)} a month.`,
    });
  }

  if (profile.spending.byCategory.length > 0) {
    const dayToDay = profile.spending.byCategory.reduce(
      (sum, item) => sum + item.monthlyKes.typical,
      0,
    );
    markers.push({
      label: "Spend",
      title: "Day to day",
      sentence: `Day-to-day spending totals ${formatKes(dayToDay)} in a typical month.`,
    });
  }

  const plan = profile.investmentPlan;
  const floor = surplus.floor;
  const habit =
    plan && plan.amountKes > 0 && floor > 0
      ? `, and the habit is ${formatKes(plan.amountKes)}, ${habitPercentOfFloor(plan.amountKes, floor)}% of that floor`
      : "";
  markers.push({
    label: "Safe",
    title: "Safe to consider",
    sentence: `The safe floor is ${formatKes(floor)} a month, and the wider range is ${formatKes(surplus.typical)} to ${formatKes(surplus.ceiling)}${habit}.`,
  });

  const months = profile.resilience.monthsOfExpensesCovered;
  markers.push({
    label: "Cover",
    title: "How long it covers",
    sentence: `This history covers ${monthsLabel(months)} months of expenses.`,
  });

  return markers;
}

export function LifeMarkers({
  profile,
  isDemo,
}: {
  profile: FinancialProfile;
  isDemo: boolean;
}) {
  const markers = buildLifeMarkers(profile);

  return (
    <section className="rounded-[28px] bg-[#141210] px-4 py-4 sm:px-5" aria-label="The whole month">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-[#e3b23c] uppercase">
          The whole month
        </h2>
        {isDemo ? (
          <span className="rounded-full bg-[#e3b23c] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a32]">
            Demo data
          </span>
        ) : null}
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {markers.map((marker, index) => (
          <li key={marker.title} className="min-w-0 border-t border-[#e3b23c]/50 pt-2">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#e3b23c] uppercase">
              {index + 1} · {marker.label}
            </p>
            <p className="mt-1 text-sm leading-5 font-bold text-[#f6f1e4]">{marker.title}</p>
            <p className="mt-1 text-xs leading-4 text-[#c4b8a4]">{marker.sentence}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
