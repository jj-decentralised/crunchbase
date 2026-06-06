"use client";

import { buildColorMap } from "@/lib/colors";
import { formatUsdCompact } from "@/lib/utils";
import Link from "next/link";

export function ChartLegend({
  groups,
  hrefFor,
}: {
  groups: { id?: string; name: string; total?: number }[];
  hrefFor?: (g: { id?: string; name: string }) => string | null;
}) {
  const colors = buildColorMap(groups.map((g) => g.name));
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {groups.map((g) => {
        const href = hrefFor?.(g) ?? null;
        const content = (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colors[g.name] }}
            />
            {g.name}
            {g.total != null && (
              <span className="tabular text-muted-2">{formatUsdCompact(g.total)}</span>
            )}
          </span>
        );
        return href ? (
          <Link key={g.name} href={href}>
            {content}
          </Link>
        ) : (
          <span key={g.name}>{content}</span>
        );
      })}
    </div>
  );
}
