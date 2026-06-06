import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  delta,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { pct: number | null; label?: string } | null;
  icon?: ReactNode;
}) {
  const tone =
    delta?.pct == null ? "neutral" : delta.pct >= 0 ? "positive" : "negative";
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="tabular text-2xl font-semibold tracking-tight">
          {value}
        </span>
        {delta && delta.pct != null && (
          <Badge tone={tone} className="mb-1">
            {delta.pct >= 0 ? "▲" : "▼"} {Math.abs(delta.pct * 100).toFixed(0)}%
          </Badge>
        )}
      </div>
      {sub && <p className={cn("mt-1 text-[11px] text-muted-2")}>{sub}</p>}
    </div>
  );
}
