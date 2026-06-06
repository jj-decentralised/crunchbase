import { sql } from "drizzle-orm";
import type { Database } from "./index";
import { rowsOf } from "./index";
import { DEMO_DDL } from "./demo-schema-sql";

/**
 * Zero-config demo bootstrap for an ephemeral in-memory database (e.g. a Vercel
 * deploy with no DATABASE_URL). Creates the schema and seeds the deterministic
 * mock dataset so the app is fully explorable without any external services.
 *
 * Idempotent: skips seeding if data already exists in this instance.
 */
export async function bootstrapDemo(db: Database): Promise<void> {
  // Create schema (statements are individually executed; IF NOT EXISTS = safe).
  for (const stmt of DEMO_DDL.split(";")) {
    const s = stmt.trim();
    if (s) await db.execute(sql.raw(s));
  }

  const n =
    rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from funding_rounds`),
    )[0]?.n ?? 0;
  if (n > 0) return;

  // Lazy imports to avoid a module cycle (persist depends on db).
  const [{ generateMockDataset }, persist, { DEFAULT_SCOPE }, { setCapabilities }] =
    await Promise.all([
      import("@/lib/crunchbase/mock-data"),
      import("@/lib/ingest/persist"),
      import("@/lib/config"),
      import("@/lib/caps-store"),
    ]);
  const { appConfig, syncState } = await import("./schema");

  // Slightly trimmed for fast serverless cold-start seeding while staying rich.
  const ds = generateMockDataset({ scale: 0.6 });
  const orgByUuid = new Map(ds.organizations.map((o) => [o.uuid, o]));

  await persist.upsertCategoryGroups(db, ds.categoryGroups);
  await persist.upsertCategories(db, ds.categories);
  await persist.upsertOrganizations(db, ds.organizations);
  await persist.upsertFundingRounds(db, ds.rounds, orgByUuid);

  await db
    .insert(appConfig)
    .values({ key: "scope", value: DEFAULT_SCOPE })
    .onConflictDoNothing();
  await db.insert(syncState).values({
    id: "funding_rounds",
    lastAnnouncedOn: ds.rounds.at(-1)?.announcedOn ?? null,
    lastRunAt: new Date(),
    status: "demo",
    stats: { source: "mock-demo", rounds: ds.rounds.length },
  });
  await setCapabilities(db, {
    tier: "mock",
    fundingRoundsSearch: true,
    organizationsSearch: true,
    fundingRoundOrgCategories: true,
    checkedAt: new Date().toISOString(),
    message: "Live demo on synthetic data. Connect a Crunchbase key + Postgres for real data.",
  });
}
