"use client";

import type { ReactNode } from "react";
import { formatUsdCompact } from "@/lib/utils";

/** Shared axis tick formatter for USD. */
export const usdTick = (v: number) => formatUsdCompact(v);

/** Format an ISO period (YYYY-MM-DD) into a compact axis label. */
export function periodLabel(period: string, grain: "month" | "quarter" | "year"): string {
  const [y, m] = period.split("-");
  if (grain === "year") return y;
  if (grain === "quarter") {
    const q = Math.floor((Number(m) - 1) / 3) + 1;
    return `Q${q} '${y.slice(2)}`;
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} '${y.slice(2)}`;
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/** Themed tooltip for currency series (sorted desc, with total). */
export function CurrencyTooltip({
  active,
  payload,
  label,
  showTotal = true,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ReactNode;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = [...payload]
    .filter((p) => typeof p.value === "number" && (p.value as number) !== 0)
    .sort((a, b) => (b.value as number) - (a.value as number));
  const total = rows.reduce((s, r) => s + (r.value as number), 0);

  return (
    <div className="max-w-xs rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      {label != null && (
        <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {rows.slice(0, 12).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: r.color }}
              />
              {r.name ?? r.dataKey}
            </span>
            <span className="tabular font-medium text-foreground">
              {formatUsdCompact(r.value as number)}
            </span>
          </div>
        ))}
      </div>
      {showTotal && rows.length > 1 && (
        <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5 text-muted">
          <span>Total</span>
          <span className="tabular font-semibold text-foreground">
            {formatUsdCompact(total)}
          </span>
        </div>
      )}
    </div>
  );
}

export const AXIS_PROPS = {
  stroke: "hsl(var(--muted))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
