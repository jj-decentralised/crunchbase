import { getDb } from "@/lib/db";
import { parseFilterFromObject } from "@/lib/metrics/filters";
import { getTimeseries, getSankey, getTreemap } from "@/lib/metrics/queries";
import { FlowsView } from "@/components/flows/flows-view";
import { EmptyState } from "@/components/ui/empty-state";

export default async function FlowsPage(props: PageProps<"/flows">) {
  const filter = parseFilterFromObject(await props.searchParams);
  const db = await getDb();
  const [timeseries, sankey, treemap] = await Promise.all([
    getTimeseries(db, filter, 10),
    getSankey(db, filter),
    getTreemap(db, filter),
  ]);

  if (!treemap.length) return <EmptyState />;

  return (
    <FlowsView
      series={timeseries.series}
      groups={timeseries.groups}
      grain={filter.grain}
      sankey={sankey}
      treemap={treemap}
    />
  );
}
