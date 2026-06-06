import type { Database } from "@/lib/db";
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
export async function purgeAll(db: Database): Promise<void> {
  await db.delete(roundCategoryGroups);
  await db.delete(fundingRounds);
  await db.delete(organizationCategories);
  await db.delete(organizations);
  await db.delete(categories);
  await db.delete(categoryGroups);
  await db.delete(syncState);
}
