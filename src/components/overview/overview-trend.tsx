"use client";

import { AreaTrend } from "@/components/charts/area-trend";
import { ChartLegend } from "@/components/charts/legend";
import { useFilters } from "@/hooks/use-filters";

export function OverviewTrend({
  series,
  groups,
  grain,
}: {
  series: Array<Record<string, string | number>>;
  groups: { id: string; name: string; total: number }[];
  grain: "month" | "quarter" | "year";
}) {
  const { hrefWithFilters } = useFilters();
  return (
    <div className="space-y-3">
      <AreaTrend
        data={series}
        groups={groups.map((g) => g.name)}
        grain={grain}
        mode="stacked"
      />
      <ChartLegend
        groups={groups}
        hrefFor={(g) =>
          g.id && g.id !== "__other__" ? hrefWithFilters(`/categories/${g.id}`) : null
        }
      />
    </div>
  );
}
