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

// Static illustrative data representing a hypothetical 1,000 KES investment over 1 year
const ILLUSTRATIVE_SCENARIO = [
  {
    name: "Bear Case",
    value: 600,
    fill: "#a8a29e", // muted neutral color for loss
    description: "If the market drops",
  },
  {
    name: "Base Case",
    value: 1150,
    fill: "#3d6b54", // moss token (#3d6b54)
    description: "Typical historical average",
  },
  {
    name: "Bull Case",
    value: 1800,
    fill: "#8c6a2f", // brass token (#8c6a2f)
    description: "High growth period",
  },
];

// Custom tooltip for clean formatting that matches our design tokens
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-sand bg-paper p-3 shadow-sm">
        <p className="text-xs font-semibold text-ink">{data.name}</p>
        <p className="mt-1 text-sm font-bold text-pine">
          KES {data.value.toLocaleString()}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-ink/60">
          {data.description}
        </p>
      </div>
    );
  }
  return null;
}

export function ScenarioChart() {
  return (
    <div className="flex w-full flex-col rounded-3xl border border-sand bg-paper p-5 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-pine">
            Historical Illustration Only
          </h3>
          <span className="rounded-full border border-line bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate uppercase tracking-wide">
            Illustrative
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink/60">
          Bitcoin's value goes up and down. Not a guarantee of future results. Based on a hypothetical KES 1,000 held for 1 year.
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ILLUSTRATIVE_SCENARIO}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#1a2420", opacity: 0.7 }} // text-ink/70 approx
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#1a2420", opacity: 0.7 }}
              tickFormatter={(val) => `KES ${val}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(231, 224, 212, 0.4)" }} // sand/40 approx
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {ILLUSTRATIVE_SCENARIO.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 rounded-xl bg-sand/30 p-3">
        <p className="text-[10px] leading-4 text-ink/50">
          {PAST_PERFORMANCE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
