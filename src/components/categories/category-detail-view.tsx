"use client";

import { AreaTrend } from "@/components/charts/area-trend";
import { BarSplit } from "@/components/charts/bar-split";
import { Panel } from "@/components/ui/panel";
import { KpiCard } from "@/components/overview/kpi-card";
import { DealsTable, type DealRow } from "@/components/deals/deals-table";
import { AccessGate } from "@/components/deals/access-gate";
import { Attribution } from "@/components/shell/attribution";
import { STAGE_COLORS } from "@/lib/colors";
import { formatUsdCompact } from "@/lib/utils";
import { DollarSign, Receipt } from "lucide-react";

interface Detail {
  groupId: string;
  name: string;
  totalUsd: number;
  rounds: number;
  timeseries: { period: string; total: number; rounds: number }[];
  stageSplit: { stage: string; total: number }[];
  countrySplit: { country: string; total: number }[];
  topDeals: DealRow[];
}

export function CategoryDetailView({
  detail,
  grain,
  canViewDeals,
}: {
  detail: Detail;
  grain: "month" | "quarter" | "year";
  canViewDeals: boolean;
}) {
  const series = detail.timeseries.map((t) => ({ period: t.period, [detail.name]: t.total }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Capital deployed"
          value={formatUsdCompact(detail.totalUsd)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Funding rounds"
          value={detail.rounds.toLocaleString()}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg round"
          value={formatUsdCompact(detail.rounds ? detail.totalUsd / detail.rounds : 0)}
        />
        <KpiCard label="Geographies" value={String(detail.countrySplit.length)} />
      </div>

      <Panel title={`${detail.name} — capital over time`}>
        <AreaTrend data={series} groups={[detail.name]} grain={grain} mode="stacked" />
        <Attribution className="mt-3" />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="By stage" description="Capital raised by funding stage">
          <BarSplit
            data={detail.stageSplit.map((s) => ({ label: s.stage, value: s.total }))}
            colorMap={STAGE_COLORS}
          />
        </Panel>
        <Panel title="By geography" description="Top locations by capital">
          <BarSplit
            data={detail.countrySplit.map((c) => ({ label: c.country, value: c.total }))}
          />
        </Panel>
      </div>

      <Panel title="Top deals" description="Largest funding rounds in this category">
        {canViewDeals ? <DealsTable rows={detail.topDeals} /> : <AccessGate compact />}
      </Panel>
    </div>
  );
}
