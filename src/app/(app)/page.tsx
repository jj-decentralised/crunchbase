import { getDb } from "@/lib/db";
import { parseFilterFromObject } from "@/lib/metrics/filters";
import { getOverview, getTimeseries, getStageSplit } from "@/lib/metrics/queries";
import { KpiCard } from "@/components/overview/kpi-card";
import { TopMovers } from "@/components/overview/top-movers";
import { OverviewTrend } from "@/components/overview/overview-trend";
import { Donut } from "@/components/charts/donut";
import { Panel } from "@/components/ui/panel";
import { Attribution } from "@/components/shell/attribution";
import { formatUsdCompact, formatUsdFull } from "@/lib/utils";
import { STAGE_COLORS } from "@/lib/colors";
import { DollarSign, Layers, Receipt, Ruler } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default async function OverviewPage(props: PageProps<"/">) {
  const filter = parseFilterFromObject(await props.searchParams);
  const db = await getDb();
  const [overview, timeseries, stageSplit] = await Promise.all([
    getOverview(db, filter),
    getTimeseries(db, filter, 8),
    getStageSplit(db, filter),
  ]);

  if (overview.rounds === 0) {
    return <EmptyState />;
  }

  const stageData = stageSplit.map((s) => ({ label: s.stage, value: s.total }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Capital deployed"
          value={formatUsdCompact(overview.totalUsd)}
          sub={formatUsdFull(overview.totalUsd)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Funding rounds"
          value={overview.rounds.toLocaleString()}
          sub="Distinct rounds in range"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg round size"
          value={formatUsdCompact(overview.avgRoundUsd)}
          sub="Mean across rounds"
          icon={<Ruler className="h-4 w-4" />}
        />
        <KpiCard
          label="Active categories"
          value={String(overview.activeCategories)}
          sub="Category groups with deals"
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Capital deployed over time"
          description="Stacked by top category groups · click a category to drill in"
        >
          <OverviewTrend
            series={timeseries.series}
            groups={timeseries.groups}
            grain={filter.grain}
          />
          <Attribution className="mt-3" />
        </Panel>

        <div className="space-y-5">
          <Panel title="Stage mix" description="Capital by funding stage">
            <Donut data={stageData} colorMap={STAGE_COLORS} />
          </Panel>
          <Panel
            title="Category momentum"
            description={`Latest period: ${overview.periodLabel}`}
          >
            <TopMovers gainers={overview.topGainers} losers={overview.topLosers} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
