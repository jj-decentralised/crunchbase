import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { appConfig } from "@/lib/db/schema";
import { DEFAULT_SCOPE, ScopeSchema, type Scope } from "@/lib/config";

const SCOPE_KEY = "scope";

/** Read the research-universe scope from app_config, falling back to defaults. */
export async function getScope(db: Database): Promise<Scope> {
  const rows = await db
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, SCOPE_KEY))
    .limit(1);
  const parsed = ScopeSchema.safeParse(rows[0]?.value);
  return parsed.success ? parsed.data : DEFAULT_SCOPE;
}

/** Persist the research-universe scope. */
export async function setScope(db: Database, scope: Scope): Promise<Scope> {
  const value = ScopeSchema.parse(scope);
  await db
    .insert(appConfig)
    .values({ key: SCOPE_KEY, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: sql`excluded.value`, updatedAt: sql`now()` },
    });
  return value;
}
