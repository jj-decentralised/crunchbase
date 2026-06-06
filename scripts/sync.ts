import "./_env";
import { getDbHandle } from "@/lib/db";
import { createProvider } from "@/lib/crunchbase/provider";
import { getScope } from "@/lib/scope-store";
import { runSync } from "@/lib/ingest/sync";

/**
 * Local ingestion / backfill runner.
 *
 *   npm run sync             # resume from cursor, walk to completion
 *   npm run sync -- --reset  # start over from the beginning
 *   npm run sync -- --pages=5
 */
async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const pagesArg = args.find((a) => a.startsWith("--pages="));
  const maxPagesPerLoop = pagesArg ? Number(pagesArg.split("=")[1]) : 20;

  const { db, driver, close } = await getDbHandle();
  const provider = createProvider();
  const scope = await getScope(db);

  console.log(
    `Sync starting (driver=${driver}, mode=${provider.mode}, reset=${reset})`,
  );
  const caps = await provider.detectCapabilities();
  console.log(`Capabilities: ${caps.tier} — ${caps.message}`);

  let totalRounds = 0;
  let loop = 0;
  let done = false;
  let firstLoop = true;
  while (!done) {
    const result = await runSync({
      db,
      provider,
      scope,
      maxPages: maxPagesPerLoop,
      reset: firstLoop && reset,
      log: (m) => console.log(`  ${m}`),
    });
    totalRounds += result.rounds;
    done = result.done;
    loop++;
    firstLoop = false;
    if (result.rounds === 0) break;
    if (loop > 10000) break; // safety
  }

  console.log(`✓ Sync complete. Ingested ${totalRounds} rounds across ${loop} batch(es).`);
  await close();
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
