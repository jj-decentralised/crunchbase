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
import { AXIS_PROPS, usdTick } from "./chart-kit";
import { formatUsdCompact } from "@/lib/utils";
import { CATEGORY_PALETTE } from "@/lib/colors";

export function BarSplit({
  data,
  colorMap,
  height = 260,
}: {
  data: { label: string; value: number }[];
  colorMap?: Record<string, string>;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis type="number" {...AXIS_PROPS} tickFormatter={usdTick} />
          <YAxis
            type="category"
            dataKey="label"
            {...AXIS_PROPS}
            width={110}
            tick={{ fontSize: 11, fill: "hsl(var(--muted))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--surface-2))" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-surface/95 p-2 text-xs shadow-xl">
                  <span className="font-medium text-foreground">
                    {payload[0].payload.label}
                  </span>
                  <span className="tabular ml-2 text-muted">
                    {formatUsdCompact(Number(payload[0].value))}
                  </span>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={d.label}
                fill={colorMap?.[d.label] ?? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
