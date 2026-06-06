import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "../helpers/test-db";
import { MockProvider } from "@/lib/crunchbase/provider";
import { generateMockDataset } from "@/lib/crunchbase/mock-data";
import { buildRoundCategoryGroupRows } from "@/lib/ingest/transform";
import { runSync } from "@/lib/ingest/sync";
import { DEFAULT_SCOPE } from "@/lib/config";
import { rowsOf } from "@/lib/db";

const dataset = generateMockDataset({ seed: 9, startYear: 2018, endYear: 2021 });
const provider = new MockProvider(dataset);
const orgByUuid = new Map(dataset.organizations.map((o) => [o.uuid, o]));

function expectedFactRows() {
  return dataset.rounds.reduce(
    (n, r) => n + buildRoundCategoryGroupRows(r, orgByUuid.get(r.orgUuid)).length,
    0,
  );
}

async function count(t: TestDb, table: string): Promise<number> {
  const res = await t.db.execute(sql.raw(`select count(*)::int as n from ${table}`));
  return rowsOf<{ n: number }>(res)[0]?.n ?? 0;
}

describe("runSync (mock provider)", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
  });
  afterAll(async () => {
    await t.close();
  });

  it("ingests the full dataset and builds fact rows", async () => {
    const result = await runSync({
      db: t.db,
      provider,
      scope: DEFAULT_SCOPE,
      maxPages: 1000,
      pageSize: 200,
    });
    const referencedOrgs = new Set(dataset.rounds.map((r) => r.orgUuid)).size;
    expect(result.done).toBe(true);
    expect(result.rounds).toBe(dataset.rounds.length);
    expect(await count(t, "funding_rounds")).toBe(dataset.rounds.length);
    // Only orgs that have at least one round are referenced and ingested.
    expect(await count(t, "organizations")).toBe(referencedOrgs);
    expect(await count(t, "round_category_groups")).toBe(expectedFactRows());
    expect(await count(t, "category_groups")).toBeGreaterThanOrEqual(
      dataset.categoryGroups.length,
    );
  });

  it("is idempotent on re-run (no duplicates)", async () => {
    const before = await count(t, "funding_rounds");
    const beforeFacts = await count(t, "round_category_groups");
    await runSync({ db: t.db, provider, scope: DEFAULT_SCOPE, maxPages: 1000, pageSize: 200, reset: true });
    expect(await count(t, "funding_rounds")).toBe(before);
    expect(await count(t, "round_category_groups")).toBe(beforeFacts);
  });
});

describe("runSync resumability", () => {
  it("resumes from a persisted cursor across bounded invocations", async () => {
    const t = await createTestDb();
    let done = false;
    let guard = 0;
    while (!done && guard < 1000) {
      const r = await runSync({
        db: t.db,
        provider,
        scope: DEFAULT_SCOPE,
        maxPages: 1, // one page per invocation
        pageSize: 150,
      });
      done = r.done;
      guard++;
      if (r.rounds === 0) break;
    }
    expect(done).toBe(true);
    expect(await count(t, "funding_rounds")).toBe(dataset.rounds.length);
    expect(guard).toBeGreaterThan(1); // genuinely took multiple invocations
    await t.close();
  });
});

describe("runSync scope filtering", () => {
  it("only ingests rounds at/after the scope start year", async () => {
    const t = await createTestDb();
    await runSync({
      db: t.db,
      provider,
      scope: { ...DEFAULT_SCOPE, startYear: 2020 },
      maxPages: 1000,
      pageSize: 200,
    });
    const res = await t.db.execute(
      sql.raw(`select min(announced_on) as min from funding_rounds`),
    );
    const min = rowsOf<{ min: string }>(res)[0]?.min;
    expect(String(min) >= "2020-01-01").toBe(true);
    const expected = dataset.rounds.filter((r) => r.announcedOn >= "2020-01-01").length;
    expect(await count(t, "funding_rounds")).toBe(expected);
    await t.close();
  });
});
