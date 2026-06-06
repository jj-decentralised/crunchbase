import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit only needs the dialect + schema to *generate* SQL migrations.
 * Migrations are applied by `scripts/migrate.ts`, which picks the right driver
 * (PGlite locally, node-postgres in production) at runtime.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
