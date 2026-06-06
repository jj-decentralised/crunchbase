"use client";

import Link from "next/link";
import { useFilters } from "@/hooks/use-filters";
import { CATEGORY_PALETTE } from "@/lib/colors";
import { formatUsdCompact, formatNumberCompact } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface Node {
  id: string;
  name: string;
  total: number;
  rounds: number;
}

export function CategoryGrid({ nodes }: { nodes: Node[] }) {
  const { hrefWithFilters } = useFilters();
  const max = Math.max(...nodes.map((n) => n.total), 1);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {nodes.map((n, i) => {
        const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
        return (
          <Link
            key={n.id}
            href={hrefWithFilters(`/categories/${n.id}`)}
            className="group rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-sm font-medium">{n.name}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-2 transition-colors group-hover:text-foreground" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="tabular text-xl font-semibold tracking-tight">
                {formatUsdCompact(n.total)}
              </span>
              <span className="text-xs text-muted">
                {formatNumberCompact(n.rounds)} rounds
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${(n.total / max) * 100}%`, background: color }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
