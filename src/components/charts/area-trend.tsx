"use client";

import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildColorMap } from "@/lib/colors";
import { AXIS_PROPS, CurrencyTooltip, periodLabel, usdTick } from "./chart-kit";
import { formatPercent } from "@/lib/utils";

export type TrendMode = "stacked" | "stream" | "share";

export function AreaTrend({
  data,
  groups,
  grain,
  mode = "stacked",
  height = 320,
  showBrush = false,
}: {
  data: Array<Record<string, string | number>>;
  groups: string[];
  grain: "month" | "quarter" | "year";
  mode?: TrendMode;
  height?: number;
  showBrush?: boolean;
}) {
  const colors = buildColorMap(groups);
  const stackOffset = mode === "stream" ? "wiggle" : mode === "share" ? "expand" : "none";
  const showY = mode !== "stream";

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} stackOffset={stackOffset} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            {groups.map((g) => (
              <linearGradient key={g} id={`grad-${cssId(g)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[g]} stopOpacity={0.85} />
                <stop offset="100%" stopColor={colors[g]} stopOpacity={0.25} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="period"
            {...AXIS_PROPS}
            tickFormatter={(v: string) => periodLabel(v, grain)}
            minTickGap={24}
          />
          {showY && (
            <YAxis
              {...AXIS_PROPS}
              width={48}
              tickFormatter={mode === "share" ? (v: number) => formatPercent(v, { digits: 0 }) : usdTick}
            />
          )}
          <Tooltip
            content={
              mode === "share" ? <ShareTooltip /> : <CurrencyTooltip showTotal={mode === "stacked"} />
            }
          />
          {groups.map((g) => (
            <Area
              key={g}
              type="monotone"
              dataKey={g}
              stackId="1"
              stroke={colors[g]}
              strokeWidth={1}
              fill={mode === "stream" ? colors[g] : `url(#grad-${cssId(g)})`}
              fillOpacity={mode === "stream" ? 0.85 : 1}
              isAnimationActive={false}
            />
          ))}
          {showBrush && (
            <Brush
              dataKey="period"
              height={22}
              travellerWidth={8}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--surface-2))"
              tickFormatter={(v: string) => periodLabel(v, grain)}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function cssId(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "_");
}

interface TipEntry { name?: string | number; value?: number | string; color?: string }
function ShareTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0) || 1;
  const rows = [...payload]
    .filter((p) => Number(p.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="max-w-xs rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      <div className="space-y-1">
        {rows.slice(0, 12).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            <span className="tabular font-medium text-foreground">
              {formatPercent(Number(r.value) / total, { digits: 1 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
