"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Password gate for record-level (raw deal) data, shown when the deployment sets
 * APP_ACCESS_PASSWORD. Aggregated analytics remain public; raw rows do not.
 */
export function AccessGate({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 text-center ${compact ? "p-6" : "p-10"}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Lock className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">Record-level data is protected</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
          Aggregated analytics are public. Individual funding rounds require
          access, per the Crunchbase data license.
        </p>
      </div>
      <form onSubmit={submit} className="flex w-full max-w-xs items-center gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Access password"
          className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" variant="primary" size="md" disabled={loading}>
          {loading ? "…" : "Unlock"}
        </Button>
      </form>
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
