import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { getDb } from "@/lib/db";
import { getFiltersMeta } from "@/lib/metrics/queries";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const env = getEnv();
  let meta = {
    groups: [] as { id: string; name: string }[],
    stages: [] as string[],
    countries: [] as string[],
    dateRange: { min: null as string | null, max: null as string | null },
  };
  try {
    const db = await getDb();
    meta = await getFiltersMeta(db);
  } catch {
    // Empty DB / not yet migrated — shell still renders with empty filters.
  }

  return (
    <AppShell appName={env.NEXT_PUBLIC_APP_NAME} meta={meta}>
      {children}
    </AppShell>
  );
}
