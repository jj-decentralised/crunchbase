import "./_env";
import { getDbHandle } from "@/lib/db";
import { generateMockDataset } from "@/lib/crunchbase/mock-data";
import {
  upsertCategories,
  upsertCategoryGroups,
  upsertFundingRounds,
  upsertOrganizations,
} from "@/lib/ingest/persist";
import { appConfig, syncState } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { DEFAULT_SCOPE } from "@/lib/config";

/**
 * Seeds the database with the deterministic mock dataset. Useful for local dev,
 * CI, and demos. Idempotent: re-running upserts the same rows.
 */
async function main() {
  const { db, driver, close } = await getDbHandle();
  console.log(`Seeding mock dataset into ${driver}…`);

  const ds = generateMockDataset();
  console.log(
    `  dataset: ${ds.categoryGroups.length} groups, ${ds.categories.length} categories, ` +
      `${ds.organizations.length} orgs, ${ds.rounds.length} rounds`,
  );

  const orgByUuid = new Map(ds.organizations.map((o) => [o.uuid, o]));

  await upsertCategoryGroups(db, ds.categoryGroups);
  await upsertCategories(db, ds.categories);
  await upsertOrganizations(db, ds.organizations);
  await upsertFundingRounds(db, ds.rounds, orgByUuid);

  // Record scope + a synthetic sync state so the UI freshness badge has data.
  await db
    .insert(appConfig)
    .values({ key: "scope", value: DEFAULT_SCOPE })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: sql`excluded.value`, updatedAt: sql`now()` },
    });

  await db
    .insert(syncState)
    .values({
      id: "funding_rounds",
      cursorUuid: null,
      lastAnnouncedOn: ds.rounds.at(-1)?.announcedOn ?? null,
      lastRunAt: new Date(),
      status: "seeded",
      stats: { source: "mock", rounds: ds.rounds.length, orgs: ds.organizations.length },
    })
    .onConflictDoUpdate({
      target: syncState.id,
      set: {
        lastAnnouncedOn: sql`excluded.last_announced_on`,
        lastRunAt: sql`excluded.last_run_at`,
        status: sql`excluded.status`,
        stats: sql`excluded.stats`,
      },
    });

  console.log("✓ Seed complete.");
  await close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
