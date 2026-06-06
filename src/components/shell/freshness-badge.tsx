"use client";

import { useEffect, useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { formatNumberCompact } from "@/lib/utils";

interface Health {
  mode: string;
  counts: { rounds: number };
  sync: { lastRunAt: string | null; status: string | null } | null;
  capabilities: { tier: string } | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function FreshnessBadge() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => !cancelled && setHealth(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
      </span>
    );
  }

  return (
    <span
      className="hidden items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] text-muted sm:inline-flex"
      title={`Mode: ${health.mode} · Tier: ${health.capabilities?.tier ?? "?"} · Last sync ${timeAgo(health.sync?.lastRunAt ?? null)}`}
    >
      <Database className="h-3.5 w-3.5 text-accent" />
      <span className="tabular font-medium text-foreground">
        {formatNumberCompact(health.counts.rounds)}
      </span>
      rounds · synced {timeAgo(health.sync?.lastRunAt ?? null)}
    </span>
  );
}
