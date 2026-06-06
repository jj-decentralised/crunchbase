"use client";

import Link from "next/link";
import { useFilters } from "@/hooks/use-filters";
import { formatUsdCompact, formatPercent } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Mover {
  groupId: string;
  name: string;
  current: number;
  previous: number;
  deltaPct: number | null;
}

export function TopMovers({
  gainers,
  losers,
}: {
  gainers: Mover[];
  losers: Mover[];
}) {
  const { hrefWithFilters } = useFilters();

  const Row = ({ m, up }: { m: Mover; up: boolean }) => (
    <Link
      href={hrefWithFilters(`/categories/${m.groupId}`)}
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2"
    >
      <span className="flex items-center gap-2 truncate text-xs text-foreground">
        {up ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-positive" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5 text-negative" />
        )}
        <span className="truncate">{m.name}</span>
      </span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="tabular text-xs text-muted">{formatUsdCompact(m.current)}</span>
        {m.deltaPct != null && (
          <span className={`tabular text-[11px] font-medium ${up ? "text-positive" : "text-negative"}`}>
            {formatPercent(m.deltaPct, { signed: true, digits: 0 })}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-2">
          Rising
        </p>
        <div className="space-y-0.5">
          {gainers.length ? (
            gainers.map((m) => <Row key={m.groupId} m={m} up />)
          ) : (
            <p className="px-2 text-xs text-muted-2">No data</p>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-2">
          Cooling
        </p>
        <div className="space-y-0.5">
          {losers.length ? (
            losers.map((m) => <Row key={m.groupId} m={m} up={false} />)
          ) : (
            <p className="px-2 text-xs text-muted-2">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}
