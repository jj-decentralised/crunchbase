import "./_env";
import { getDbHandle } from "@/lib/db";
import { purgeAll } from "@/lib/ingest/purge";

/**
 * Expunge all Crunchbase-derived data. Satisfies the license requirement to
 * delete acquired data within 10 days of termination. Leaves app_config intact.
 */
async function main() {
  const { db, close } = await getDbHandle();
  console.log("Purging all Crunchbase-derived data…");
  await purgeAll(db);
  console.log("✓ All ingested data expunged.");
  await close();
}

main().catch((err) => {
  console.error("Purge failed:", err);
  process.exit(1);
});
