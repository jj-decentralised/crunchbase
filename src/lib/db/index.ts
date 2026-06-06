import * as schema from "./schema";
import { getEnv, resolveDbDriver, type Env } from "@/lib/env";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type Database =
  | PgliteDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  driver: "pglite" | "pg";
  /** Underlying raw client (PGlite instance or pg Pool) for migrators/teardown. */
  raw: unknown;
  close: () => Promise<void>;
}

// Cache on globalThis so dev HMR / repeated script imports reuse one connection.
const globalForDb = globalThis as unknown as { __cfDb?: DbHandle };

export async function getDbHandle(env: Env = getEnv()): Promise<DbHandle> {
  if (globalForDb.__cfDb) return globalForDb.__cfDb;

  const { kind, target } = resolveDbDriver(env);
  let handle: DbHandle;

  if (kind === "pglite") {
    const { PGlite } = await import("@electric-sql/pglite");
    const client = new PGlite(target === ":memory:" ? undefined : target);
    const db = drizzlePglite(client, { schema });
    handle = {
      db,
      driver: "pglite",
      raw: client,
      close: async () => {
        await client.close();
      },
    };
  } else {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: target, max: 5 });
    const db = drizzlePg(pool, { schema });
    handle = {
      db,
      driver: "pg",
      raw: pool,
      close: async () => {
        await pool.end();
      },
    };
  }

  globalForDb.__cfDb = handle;
  return handle;
}

/** Convenience accessor for the Drizzle db instance. */
export async function getDb(): Promise<Database> {
  return (await getDbHandle()).db;
}

/** Extract typed rows from a `db.execute(sql)` result (works for pglite + pg). */
export function rowsOf<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? []) as T[];
}

export { schema };
