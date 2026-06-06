import { getDb } from "@/lib/db";
import { parseFilterFromObject } from "@/lib/metrics/filters";
import { getTimeseries } from "@/lib/metrics/queries";
import { CompareView } from "@/components/compare/compare-view";
import { GitCompareArrows } from "lucide-react";

export default async function ComparePage(props: PageProps<"/compare">) {
  const filter = parseFilterFromObject(await props.searchParams);

  if (filter.categoryGroupIds.length < 2) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          <GitCompareArrows className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold">Pick categories to compare</h3>
        <p className="max-w-md text-xs text-muted">
          Select 2 or more category groups in the <strong>Categories</strong>{" "}
          filter above to overlay their capital trajectories.
        </p>
      </div>
    );
  }

  const db = await getDb();
  const timeseries = await getTimeseries(db, filter, 24);

  return (
    <CompareView
      series={timeseries.series}
      groups={timeseries.groups.filter((g) => g.id !== "__other__")}
      grain={filter.grain}
    />
  );
}
