"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatUsdCompact } from "@/lib/utils";

export function Donut({
  data,
  colorMap,
  height = 220,
}: {
  data: { label: string; value: number }[];
  colorMap: Record<string, string>;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="hsl(var(--surface))"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={colorMap[d.label] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-surface/95 p-2 text-xs shadow-xl">
                  <span className="font-medium text-foreground">
                    {payload[0].payload.label}
                  </span>
                  <div className="tabular text-muted">
                    {formatUsdCompact(Number(payload[0].value))} ·{" "}
                    {((Number(payload[0].value) / total) * 100).toFixed(0)}%
                  </div>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
