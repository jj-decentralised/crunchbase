import { sql } from "drizzle-orm";
import { getDb, rowsOf } from "@/lib/db";
import { eq } from "drizzle-orm";
import { syncState } from "@/lib/db/schema";
import { getCapabilities } from "@/lib/caps-store";
import { getScope } from "@/lib/scope-store";
import { isGated } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getEnv();
    const db = await getDb();

    const counts = rowsOf<{ rounds: number; orgs: number; groups: number }>(
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

    const [caps, scope] = await Promise.all([
      getCapabilities(db),
      getScope(db),
    ]);

    return jsonOk({
      appName: env.NEXT_PUBLIC_APP_NAME,
      mode: env.CRUNCHBASE_MODE,
      gated: isGated(env),
      counts,
      sync: state[0]
        ? {
            status: state[0].status,
            lastRunAt: state[0].lastRunAt,
            lastAnnouncedOn: state[0].lastAnnouncedOn,
            cursor: state[0].cursorUuid,
            stats: state[0].stats,
          }
        : null,
      capabilities: caps,
      scope,
    });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
