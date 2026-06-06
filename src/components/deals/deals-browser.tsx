"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { filterToSearchParams } from "@/lib/metrics/filters";
import { DealsTable, type DealRow } from "./deals-table";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Attribution } from "@/components/shell/attribution";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumberCompact } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

const LIMIT = 50;

export function DealsBrowser() {
  const { filter } = useFilters();
  const [rows, setRows] = useState<DealRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<"money" | "date">("money");
  const [loading, setLoading] = useState(true);

  const filterKey = useMemo(() => filterToSearchParams(filter).toString(), [filter]);

  useEffect(() => {
    // Reset to the first page whenever the filter set or sort changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [filterKey, sort]);

  useEffect(() => {
    // Data-fetching effect: synchronizes table rows with the external API.
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = filterToSearchParams(filter);
    params.set("limit", String(LIMIT));
    params.set("offset", String(offset));
    params.set("sort", sort);
    fetch(`/api/metrics/deals?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filterKey, offset, sort, filter]);

  const exportCsv = () => {
    const header = ["Company", "Announced", "Stage", "Type", "RaisedUSD", "Investors", "Country"];
    const lines = rows.map((r) =>
      [r.orgName, r.announcedOn, r.stageBucket, r.investmentType, r.moneyRaisedUsd ?? "", r.numInvestors ?? "", r.countryCode ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-flows-deals-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const from = total === 0 ? 0 : offset + 1;
  const to = offset + rows.length;

  return (
    <Panel
      title="Funding rounds"
      description={`${formatNumberCompact(total)} rounds match the current filters`}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            {[
              { v: "money", l: "Largest" },
              { v: "date", l: "Newest" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setSort(o.v as "money" | "date")}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  sort === o.v ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <DealsTable rows={rows} />
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">
          {from}–{to} of {formatNumberCompact(total)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={to >= total}
            onClick={() => setOffset(offset + LIMIT)}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Attribution className="mt-3" />
    </Panel>
  );
}
