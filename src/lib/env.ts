import { z } from "zod";

/**
 * Centralized, validated environment configuration.
 *
 * The app is designed to run in two data modes:
 *  - `mock`  : a deterministic synthetic dataset (no Crunchbase key required).
 *              Ideal for local development, CI, and demos.
 *  - `live`  : talks to the real Crunchbase API using CRUNCHBASE_API_KEY.
 *
 * Database driver is selected from DATABASE_URL:
 *  - unset / "pglite" / "pglite://<path>" -> in-process PGlite (local/dev/test)
 *  - "postgres://..." / "postgresql://..." -> node-postgres pool (prod / Neon)
 */

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Data source mode.
  CRUNCHBASE_MODE: z.enum(["mock", "live"]).default("mock"),
  CRUNCHBASE_API_KEY: z.string().optional(),
  CRUNCHBASE_BASE_URL: z
    .string()
    .url()
    .default("https://api.crunchbase.com/v4/data"),

  // Database. Empty -> PGlite file store under .pglite (local dev).
  DATABASE_URL: z.string().optional(),
  PGLITE_PATH: z.string().default(".pglite"),

  // Protects the ingestion endpoint when triggered by Vercel Cron / manually.
  CRON_SECRET: z.string().optional(),

  // Simple access gate for record-level (raw deal) views, per Crunchbase license.
  APP_ACCESS_PASSWORD: z.string().optional(),
  AUTH_SECRET: z.string().optional(),

  // Optional public-facing flags.
  NEXT_PUBLIC_APP_NAME: z.string().default("Capital Flows"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export type DbDriverKind = "pglite" | "pg";

export function resolveDbDriver(env: Env = getEnv()): {
  kind: DbDriverKind;
  // For pglite: filesystem path or ":memory:". For pg: a connection string.
  target: string;
} {
  const url = env.DATABASE_URL?.trim();
  if (!url || url === "pglite" || url.startsWith("pglite://")) {
    // On a serverless host (Vercel) with no DATABASE_URL, the filesystem is
    // read-only — use an ephemeral in-memory DB that self-seeds a demo dataset.
    if (!url && process.env.VERCEL) {
      return { kind: "pglite", target: ":memory:" };
    }
    const target = url?.startsWith("pglite://")
      ? url.slice("pglite://".length) || env.PGLITE_PATH
      : env.PGLITE_PATH;
    return { kind: "pglite", target };
  }
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return { kind: "pg", target: url };
  }
  // Fallback: treat unknown values as a pglite path so we never crash at boot.
  return { kind: "pglite", target: url };
}

export function isMock(env: Env = getEnv()): boolean {
  return env.CRUNCHBASE_MODE === "mock";
}
