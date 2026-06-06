"use client";

import { useState } from "react";
import { AreaTrend, type TrendMode } from "@/components/charts/area-trend";
import { ChartLegend } from "@/components/charts/legend";
import { CategoryTreemap } from "@/components/charts/treemap";
import { StageCategorySankey } from "@/components/charts/sankey";
import { Panel } from "@/components/ui/panel";
import { Attribution } from "@/components/shell/attribution";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils";

interface SankeyData {
  nodes: { id: string }[];
  links: { source: string; target: string; value: number }[];
}
interface TreemapNode {
  id: string;
  name: string;
  total: number;
  rounds: number;
}

const MODES: { value: TrendMode; label: string }[] = [
  { value: "stacked", label: "Stacked $" },
  { value: "stream", label: "Streamgraph" },
  { value: "share", label: "Share %" },
];

export function FlowsView({
  series,
  groups,
  grain,
  sankey,
  treemap,
}: {
  series: Array<Record<string, string | number>>;
  groups: { id: string; name: string; total: number }[];
  grain: "month" | "quarter" | "year";
  sankey: SankeyData;
  treemap: TreemapNode[];
}) {
  const [mode, setMode] = useState<TrendMode>("stream");
  const { hrefWithFilters } = useFilters();

  return (
    <div className="space-y-5">
      <Panel
        title="Capital flows across categories"
        description="How venture dollars are distributed across categories over time"
        actions={
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                  mode === m.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <AreaTrend
          data={series}
          groups={groups.map((g) => g.name)}
          grain={grain}
          mode={mode}
          height={400}
          showBrush
        />
        <div className="mt-3">
          <ChartLegend
            groups={groups}
            hrefFor={(g) =>
              g.id && g.id !== "__other__" ? hrefWithFilters(`/categories/${g.id}`) : null
            }
          />
        </div>
        <Attribution className="mt-3" />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title="Stage → Category"
          description="Where capital enters by funding stage"
        >
          <StageCategorySankey data={sankey} />
        </Panel>
        <Panel
          title="Category share"
          description="Capital share for the selected window · click to drill in"
        >
          <CategoryTreemap
            nodes={treemap}
            hrefFor={(id) => hrefWithFilters(`/categories/${id}`)}
          />
        </Panel>
      </div>
    </div>
  );
}
