import "./_env";
import { getDbHandle } from "@/lib/db";
import {
  categories,
  categoryGroups,
  fundingRounds,
  organizationCategories,
  organizations,
  roundCategoryGroups,
  syncState,
} from "@/lib/db/schema";

/**
 * Expunge all Crunchbase-derived data. Satisfies the license requirement to
 * delete acquired data within 10 days of termination. Leaves app_config intact.
 */
async function main() {
  const { db, close } = await getDbHandle();
  console.log("Purging all Crunchbase-derived data…");

  await db.delete(roundCategoryGroups);
  await db.delete(fundingRounds);
  await db.delete(organizationCategories);
  await db.delete(organizations);
  await db.delete(categories);
  await db.delete(categoryGroups);
  await db.delete(syncState);

  console.log("✓ All ingested data expunged.");
  await close();
}

main().catch((err) => {
  console.error("Purge failed:", err);
  process.exit(1);
});
