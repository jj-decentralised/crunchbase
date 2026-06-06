"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { AccessGate } from "@/components/deals/access-gate";
import { ATTRIBUTION_METHODS, type Scope } from "@/lib/config";
import { formatNumberCompact } from "@/lib/utils";
import { RefreshCw, Trash2, Database, KeyRound } from "lucide-react";

interface Props {
  scope: Scope;
  canManage: boolean;
  mode: string;
  tier: string | null;
  counts: { rounds: number; orgs: number; groups: number };
  lastRunAt: string | null;
  status: string | null;
  groups: { id: string; name: string }[];
  countries: string[];
}

const SIZE_OPTIONS = [
  { label: "No floor", value: 0 },
  { label: "$1M+", value: 1_000_000 },
  { label: "$5M+", value: 5_000_000 },
  { label: "$10M+", value: 10_000_000 },
];

export function SettingsView(props: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(props.scope);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const post = async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  };

  const saveScope = async () => {
    setBusy("scope");
    setMsg(null);
    const res = await post("/api/settings/scope", scope);
    setMsg(res.ok ? "Scope saved." : "Failed to save scope.");
    setBusy(null);
  };

  const syncNow = async () => {
    setBusy("sync");
    setMsg(null);
    const res = await post("/api/sync?pages=50");
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Synced ${data.rounds ?? 0} rounds (${data.done ? "complete" : "partial"}).` : "Sync failed.");
    setBusy(null);
    router.refresh();
  };

  const purge = async () => {
    if (!confirm("Expunge ALL ingested Crunchbase data? This cannot be undone.")) return;
    setBusy("purge");
    setMsg(null);
    const res = await post("/api/admin/purge");
    setMsg(res.ok ? "All ingested data expunged." : "Purge failed.");
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel title="Data status" description="Current ingestion state">
        <dl className="space-y-2.5 text-sm">
          <Row label="Mode">
            <Badge tone={props.mode === "live" ? "primary" : "neutral"}>{props.mode}</Badge>
          </Row>
          <Row label="API tier">
            <Badge tone={props.tier === "full" ? "positive" : props.tier === "mock" ? "neutral" : "warning"}>
              {props.tier ?? "unknown"}
            </Badge>
          </Row>
          <Row label="Funding rounds">
            <span className="tabular font-medium">{formatNumberCompact(props.counts.rounds)}</span>
          </Row>
          <Row label="Organizations">
            <span className="tabular font-medium">{formatNumberCompact(props.counts.orgs)}</span>
          </Row>
          <Row label="Category groups">
            <span className="tabular font-medium">{props.counts.groups}</span>
          </Row>
          <Row label="Last sync">
            <span className="text-muted">
              {props.lastRunAt ? new Date(props.lastRunAt).toLocaleString() : "never"}{" "}
              {props.status && <Badge className="ml-1">{props.status}</Badge>}
            </span>
          </Row>
        </dl>
      </Panel>

      <Panel title="Ingestion" description="Pull the latest data into the database">
        {props.canManage ? (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Runs a bounded, resumable sync. For a full backfill, run a few times
              or schedule the Vercel Cron.
            </p>
            <Button variant="primary" onClick={syncNow} disabled={busy === "sync"}>
              <RefreshCw className={`h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted">
            <KeyRound className="h-4 w-4" /> Unlock with the access password to manage ingestion.
          </p>
        )}
      </Panel>

      <Panel
        title="Research universe"
        description="Scope of data ingested from Crunchbase"
        className="lg:col-span-2"
      >
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Start year">
            <input
              type="number"
              value={scope.startYear}
              onChange={(e) => setScope({ ...scope, startYear: Number(e.target.value) })}
              className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Min round size">
            <Select
              value={scope.minRoundSizeUsd ?? 0}
              onChange={(e) => setScope({ ...scope, minRoundSizeUsd: Number(e.target.value) })}
            >
              {SIZE_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Default attribution">
            <Select
              value={scope.attributionMethod}
              onChange={(e) =>
                setScope({ ...scope, attributionMethod: e.target.value as Scope["attributionMethod"] })
              }
            >
              {ATTRIBUTION_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Categories (empty = all)">
            <MultiSelect
              label="Categories"
              options={props.groups.map((g) => ({ value: g.id, label: g.name }))}
              selected={scope.categoryGroupIds}
              onChange={(v) => setScope({ ...scope, categoryGroupIds: v })}
            />
          </Field>
          <Field label="Geographies (empty = all)">
            <MultiSelect
              label="Geographies"
              options={props.countries.map((c) => ({ value: c, label: c }))}
              selected={scope.countryCodes}
              onChange={(v) => setScope({ ...scope, countryCodes: v })}
            />
          </Field>
          <Button variant="primary" onClick={saveScope} disabled={!props.canManage || busy === "scope"}>
            {busy === "scope" ? "Saving…" : "Save scope"}
          </Button>
        </div>
        {!props.canManage && (
          <p className="mt-3 text-xs text-muted">Unlock to edit the research universe.</p>
        )}
      </Panel>

      {msg && (
        <div className="lg:col-span-2">
          <div className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-foreground">
            {msg}
          </div>
        </div>
      )}

      <Panel
        title="Danger zone"
        description="Expunge all ingested Crunchbase data (license compliance)"
        className="lg:col-span-2"
      >
        {props.canManage ? (
          <Button variant="outline" onClick={purge} disabled={busy === "purge"} className="text-negative">
            <Trash2 className="h-4 w-4" />
            {busy === "purge" ? "Purging…" : "Purge all data"}
          </Button>
        ) : (
          <div className="max-w-md">
            <AccessGate compact />
          </div>
        )}
      </Panel>

      <p className="lg:col-span-2 flex items-center gap-1.5 text-[11px] text-muted-2">
        <Database className="h-3.5 w-3.5" />
        Data powered by Crunchbase. Aggregated for research; raw records are access-controlled and not redistributed.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
