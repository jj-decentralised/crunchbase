"use client";

import { useState } from "react";
import { LineCompare } from "@/components/charts/line-compare";
import { ChartLegend } from "@/components/charts/legend";
import { Panel } from "@/components/ui/panel";
import { Attribution } from "@/components/shell/attribution";
import { cn } from "@/lib/utils";

export function CompareView({
  series,
  groups,
  grain,
}: {
  series: Array<Record<string, string | number>>;
  groups: { id: string; name: string; total: number }[];
  grain: "month" | "quarter" | "year";
}) {
  const [normalized, setNormalized] = useState(false);
  const names = groups.map((g) => g.name);

  const data = normalized
    ? series.map((row) => {
        const total = names.reduce((s, n) => s + (Number(row[n]) || 0), 0) || 1;
        const out: Record<string, string | number> = { period: row.period };
        for (const n of names) out[n] = (Number(row[n]) || 0) / total;
        return out;
      })
    : series;

  return (
    <Panel
      title="Category comparison"
      description="Overlay capital trajectories for the selected categories"
      actions={
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
          {[
            { v: false, l: "Absolute $" },
            { v: true, l: "Share of set" },
          ].map((o) => (
            <button
              key={o.l}
              onClick={() => setNormalized(o.v)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                normalized === o.v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      }
    >
      <LineCompare data={data} groups={names} grain={grain} normalized={normalized} height={380} />
      <div className="mt-3">
        <ChartLegend groups={groups} />
      </div>
      <Attribution className="mt-3" />
    </Panel>
  );
}
