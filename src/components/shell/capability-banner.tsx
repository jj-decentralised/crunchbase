"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Health {
  mode: string;
  capabilities: { tier: string; message: string } | null;
}

export function CapabilityBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const tier = health?.capabilities?.tier;
  const show = !dismissed && (tier === "basic" || tier === "unknown");
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span className="flex-1">{health?.capabilities?.message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
