import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { bootstrapDemo } from "@/lib/db/bootstrap";
import { rowsOf } from "@/lib/db";

describe("bootstrapDemo (Vercel zero-config demo path)", () => {
  it("creates schema and seeds the mock dataset into a fresh in-memory db", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });

    await bootstrapDemo(db);

    const rounds = rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from funding_rounds`),
    )[0].n;
    const facts = rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from round_category_groups`),
    )[0].n;
    expect(rounds).toBeGreaterThan(1500);
    expect(facts).toBeGreaterThanOrEqual(rounds);

    // Idempotent: a second call must not duplicate data.
    await bootstrapDemo(db);
    const rounds2 = rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from funding_rounds`),
    )[0].n;
    expect(rounds2).toBe(rounds);

    await client.close();
  });
});
