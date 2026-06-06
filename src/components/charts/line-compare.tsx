"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildColorMap } from "@/lib/colors";
import { AXIS_PROPS, CurrencyTooltip, periodLabel, usdTick } from "./chart-kit";
import { formatPercent } from "@/lib/utils";

export function LineCompare({
  data,
  groups,
  grain,
  normalized = false,
  height = 340,
}: {
  data: Array<Record<string, string | number>>;
  groups: string[];
  grain: "month" | "quarter" | "year";
  normalized?: boolean;
  height?: number;
}) {
  const colors = buildColorMap(groups);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="period"
            {...AXIS_PROPS}
            tickFormatter={(v: string) => periodLabel(v, grain)}
            minTickGap={24}
          />
          <YAxis
            {...AXIS_PROPS}
            width={48}
            tickFormatter={normalized ? (v: number) => formatPercent(v, { digits: 0 }) : usdTick}
          />
          <Tooltip content={<CurrencyTooltip showTotal={false} />} />
          {groups.map((g) => (
            <Line
              key={g}
              type="monotone"
              dataKey={g}
              stroke={colors[g]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
