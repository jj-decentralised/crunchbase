import { Database } from "lucide-react";

export function EmptyState({
  title = "No data yet",
  message = "Run an ingestion to populate the research hub. In mock mode: `npm run db:migrate && npm run db:seed`. With a live key: configure CRUNCHBASE_MODE=live and trigger a sync from Settings.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Database className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-md text-xs text-muted">{message}</p>
    </div>
  );
}
