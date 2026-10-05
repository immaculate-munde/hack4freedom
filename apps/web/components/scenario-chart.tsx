"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormat, useI18n } from "../contexts/language-context";

type ScenarioRow = {
  name: string;
  range: [number, number];
  fill: string;
  description: string;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ScenarioRow }>;
}) {
  const { t } = useI18n();
  const { number } = useFormat();
  const data = payload?.[0]?.payload;
  if (!active || !data) {
    return null;
  }
  return (
    <div className="rounded-xl border border-sand bg-paper p-3 shadow-card">
      <p className="text-xs font-semibold text-pine">{data.name}</p>
      <p className="mt-1 text-sm font-bold text-pine">
        {t("learn.chart.range", {
          low: number(data.range[0]),
          high: number(data.range[1]),
        })}
      </p>
      <p className="mt-1 text-[10px] tracking-wider text-slate uppercase">
        {data.description}
      </p>
    </div>
  );
}

export function ScenarioChart() {
  const { t } = useI18n();
  const { kes } = useFormat();
  const rows: ScenarioRow[] = [
    {
      name: t("learn.chart.lower"),
      range: [400, 800],
      fill: "var(--color-slate)",
      description: t("learn.chart.lowerBody"),
    },
    {
      name: t("learn.chart.middle"),
      range: [700, 1400],
      fill: "var(--color-moss)",
      description: t("learn.chart.middleBody"),
    },
    {
      name: t("learn.chart.higher"),
      range: [1200, 2200],
      fill: "var(--color-brass)",
      description: t("learn.chart.higherBody"),
    },
  ];

  return (
    <div className="flex w-full flex-col rounded-3xl border border-sand bg-surface p-5 shadow-card">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-pine">
            {t("learn.chart.title")}
          </h3>
          <span className="rounded-full border border-line bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate uppercase tracking-wide">
            {t("learn.chart.illustrative")}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate md:text-xs md:leading-5">
          {t("learn.chart.body", { amount: kes(1000) })}
        </p>
      </div>

      <div className="h-[220px] w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
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
              tickFormatter={(value: number) => kes(value)}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--color-pearl)" }}
            />
            <Bar dataKey="range" radius={[8, 8, 0, 0]}>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 rounded-xl bg-sand/30 p-3">
        <p className="text-sm leading-6 text-slate md:text-[10px] md:leading-4">
          {t("learn.disclaimer")}
        </p>
      </div>
    </div>
  );
}
