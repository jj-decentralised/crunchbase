import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { getDb, rowsOf } from "@/lib/db";
import { syncState } from "@/lib/db/schema";
import { getScope } from "@/lib/scope-store";
import { getCapabilities } from "@/lib/caps-store";
import { getFiltersMeta } from "@/lib/metrics/queries";
import { isAuthorized } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const env = getEnv();
  const db = await getDb();

  const [scope, caps, meta, canManage] = await Promise.all([
    getScope(db),
    getCapabilities(db),
    getFiltersMeta(db),
    isAuthorized(),
  ]);

  const counts =
    rowsOf<{ rounds: number; orgs: number; groups: number }>(
      await db.execute(sql`
        select
          (select count(*) from funding_rounds)::int as rounds,
          (select count(*) from organizations)::int as orgs,
          (select count(distinct category_group_id) from round_category_groups)::int as groups
      `),
    )[0] ?? { rounds: 0, orgs: 0, groups: 0 };

  const state = await db
    .select()
    .from(syncState)
    .where(eq(syncState.id, "funding_rounds"))
    .limit(1);

  return (
    <SettingsView
      scope={scope}
      canManage={canManage}
      mode={env.CRUNCHBASE_MODE}
      tier={caps?.tier ?? null}
      counts={counts}
      lastRunAt={state[0]?.lastRunAt ? new Date(state[0].lastRunAt).toISOString() : null}
      status={state[0]?.status ?? null}
      groups={meta.groups}
      countries={meta.countries}
    />
  );
}
