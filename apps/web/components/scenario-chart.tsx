"use client";

import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ScenarioRow = {
  name: string;
  range: [number, number];
  fill: string;
  description: string;
};

const ILLUSTRATIVE_SCENARIO: ScenarioRow[] = [
  {
    name: "Lower",
    range: [400, 800],
    fill: "var(--color-slate)",
    description: "The value can fall. You can lose money.",
  },
  {
    name: "Middle",
    range: [700, 1400],
    fill: "var(--color-moss)",
    description: "It might stay near where it started.",
  },
  {
    name: "Higher",
    range: [1200, 2200],
    fill: "var(--color-brass)",
    description: "It might be higher. This is not a forecast.",
  },
];

function formatRange(range: [number, number]): string {
  return `KES ${range[0].toLocaleString("en-KE")}–${range[1].toLocaleString("en-KE")}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ScenarioRow }>;
}) {
  const data = payload?.[0]?.payload;
  if (!active || !data) {
    return null;
  }
  return (
    <div className="rounded-xl border border-sand bg-surface p-3 shadow-sm">
      <p className="text-xs font-semibold text-pine">{data.name}</p>
      <p className="mt-1 text-sm font-bold text-pine">{formatRange(data.range)}</p>
      <p className="mt-1 text-[10px] tracking-wider text-ink/60 uppercase">
        {data.description}
      </p>
    </div>
  );
}

export function ScenarioChart() {
  return (
    <div className="flex w-full flex-col rounded-3xl border border-sand bg-paper p-5 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-pine">
            A sketch, not a forecast
          </h3>
          <span className="rounded-full border border-line bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate uppercase tracking-wide">
            Illustrative
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink/60 md:text-xs md:leading-5">
          Bitcoin's value goes up and down. Not a guarantee of future results. Based on
          a hypothetical KES 1,000 held for 1 year.
        </p>
      </div>

      <div className="h-[220px] w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ILLUSTRATIVE_SCENARIO}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fontWeight: 600, fill: "var(--color-slate)" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--color-slate)" }}
              tickFormatter={(value: number) => `KES ${value.toLocaleString("en-KE")}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--color-pearl)" }}
            />
            <Bar dataKey="range" radius={[8, 8, 0, 0]}>
              {ILLUSTRATIVE_SCENARIO.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 rounded-xl bg-sand/30 p-3">
        <p className="text-sm leading-6 text-ink/50 md:text-[10px] md:leading-4">
          {PAST_PERFORMANCE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
