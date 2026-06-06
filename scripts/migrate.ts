import "./_env";
import { getDbHandle } from "@/lib/db";

/**
 * Applies generated SQL migrations using the appropriate Drizzle migrator for
 * the active driver. Run after `npm run db:generate`.
 */
async function main() {
  const handle = await getDbHandle();
  const folder = "./drizzle";

  if (handle.driver === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const { PGlite } = await import("@electric-sql/pglite");
    await migrate(
      handle.db as Parameters<typeof migrate>[0],
      { migrationsFolder: folder },
    );
    void PGlite;
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(
      handle.db as Parameters<typeof migrate>[0],
      { migrationsFolder: folder },
    );
  }

  console.log(`✓ Migrations applied (${handle.driver}).`);
  await handle.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
