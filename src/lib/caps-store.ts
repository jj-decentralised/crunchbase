import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { appConfig } from "@/lib/db/schema";
import type { Capabilities } from "@/lib/crunchbase/types";

const CAPS_KEY = "capabilities";

export async function getCapabilities(
  db: Database,
): Promise<Capabilities | null> {
  const rows = await db
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, CAPS_KEY))
    .limit(1);
  return (rows[0]?.value as Capabilities | undefined) ?? null;
}

export async function setCapabilities(
  db: Database,
  caps: Capabilities,
): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key: CAPS_KEY, value: caps })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: sql`excluded.value`, updatedAt: sql`now()` },
    });
}
