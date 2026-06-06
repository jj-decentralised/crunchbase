import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, type TestDb } from "../helpers/test-db";
import {
  upsertCategoryGroups,
  upsertFundingRounds,
  upsertOrganizations,
} from "@/lib/ingest/persist";
import {
  getOverview,
  getTreemap,
  getTimeseries,
  getDeals,
  countDeals,
  getFiltersMeta,
} from "@/lib/metrics/queries";
import { DEFAULT_FILTER, type MetricsFilter } from "@/lib/metrics/filters";
import type { FundingRound, Organization } from "@/lib/crunchbase/types";

/**
 * Controlled fixture (hand-computable):
 *   Org1 -> [Alpha], Org2 -> [Alpha, Beta]
 *   R1: Org1 2020-01-15 seed     $1M   groups [Alpha]
 *   R2: Org2 2020-02-15 series_a $10M  groups [Alpha, Beta] (primary Alpha)
 *   R3: Org2 2021-03-15 series_b $20M  groups [Alpha, Beta] (primary Alpha)
 */
const orgs: Organization[] = [
  {
    uuid: "o1", permalink: "o1", name: "Org One", shortDescription: null,
    countryCode: "USA", region: null, city: null, foundedOn: "2019-01-01",
    fundingTotalUsd: 1_000_000, lastFundingAt: "2020-01-15",
    categoryIds: ["a1"], categoryGroupIds: ["alpha"], cbUpdatedAt: null,
  },
  {
    uuid: "o2", permalink: "o2", name: "Org Two", shortDescription: null,
    countryCode: "GBR", region: null, city: null, foundedOn: "2019-06-01",
    fundingTotalUsd: 30_000_000, lastFundingAt: "2021-03-15",
    categoryIds: ["a1", "b1"], categoryGroupIds: ["alpha", "beta"], cbUpdatedAt: null,
  },
];

function round(
  uuid: string, orgUuid: string, announcedOn: string, type: string,
  stage: string, money: number, groups: string[],
): FundingRound {
  return {
    uuid, orgUuid, orgName: orgUuid === "o1" ? "Org One" : "Org Two",
    orgPermalink: orgUuid, announcedOn, investmentType: type, stageBucket: stage,
    moneyRaisedUsd: money, currencyOriginal: "USD", numInvestors: 2,
    leadInvestorUuids: [], investorUuids: [], orgCategoryGroupIds: groups,
    cbUpdatedAt: null,
  };
}

const rounds: FundingRound[] = [
  round("r1", "o1", "2020-01-15", "seed", "Pre-Seed & Seed", 1_000_000, ["alpha"]),
  round("r2", "o2", "2020-02-15", "series_a", "Early (A/B)", 10_000_000, ["alpha", "beta"]),
  round("r3", "o2", "2021-03-15", "series_b", "Early (A/B)", 20_000_000, ["alpha", "beta"]),
];

const orgByUuid = new Map(orgs.map((o) => [o.uuid, o]));
const F = (over: Partial<MetricsFilter> = {}): MetricsFilter => ({ ...DEFAULT_FILTER, ...over });

describe("metrics queries", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    await upsertCategoryGroups(t.db, [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta" },
    ]);
    await upsertOrganizations(t.db, orgs);
    await upsertFundingRounds(t.db, rounds, orgByUuid);
  });
  afterAll(async () => {
    await t.close();
  });

  it("KPIs are attribution-independent (distinct rounds)", async () => {
    const ov = await getOverview(t.db, F());
    expect(ov.totalUsd).toBe(31_000_000);
    expect(ov.rounds).toBe(3);
    expect(ov.avgRoundUsd).toBe(Math.round(31_000_000 / 3));
    expect(ov.activeCategories).toBe(2);
  });

  it("treemap 'each' counts full money for every group", async () => {
    const tm = await getTreemap(t.db, F({ attributionMethod: "each" }));
    const byName = Object.fromEntries(tm.map((n) => [n.name, n.total]));
    expect(byName["Alpha"]).toBe(31_000_000);
    expect(byName["Beta"]).toBe(30_000_000);
  });

  it("treemap 'fractional' splits money and reconciles to the true total", async () => {
    const tm = await getTreemap(t.db, F({ attributionMethod: "fractional" }));
    const byName = Object.fromEntries(tm.map((n) => [n.name, n.total]));
    expect(byName["Alpha"]).toBe(16_000_000); // 1 + 5 + 10
    expect(byName["Beta"]).toBe(15_000_000); // 5 + 10
    expect(byName["Alpha"] + byName["Beta"]).toBe(31_000_000);
  });

  it("treemap 'primary' assigns the whole round to the primary group only", async () => {
    const tm = await getTreemap(t.db, F({ attributionMethod: "primary" }));
    const byName = Object.fromEntries(tm.map((n) => [n.name, n.total]));
    expect(byName["Alpha"]).toBe(31_000_000);
    expect(byName["Beta"]).toBeUndefined(); // no primary rows for beta
  });

  it("timeseries pivots by period and group (year grain, each)", async () => {
    const ts = await getTimeseries(t.db, F({ grain: "year", attributionMethod: "each" }));
    const y2020 = ts.series.find((r) => String(r.period).startsWith("2020"))!;
    const y2021 = ts.series.find((r) => String(r.period).startsWith("2021"))!;
    expect(y2020["Alpha"]).toBe(11_000_000);
    expect(y2020["Beta"]).toBe(10_000_000);
    expect(y2021["Alpha"]).toBe(20_000_000);
    expect(y2021["Beta"]).toBe(20_000_000);
  });

  it("respects stage, country, and size filters", async () => {
    // Only the £/GBR org's rounds in country GBR.
    const gbr = await getOverview(t.db, F({ countryCodes: ["GBR"] }));
    expect(gbr.totalUsd).toBe(30_000_000);
    expect(gbr.rounds).toBe(2);

    const seedOnly = await getOverview(t.db, F({ stageBuckets: ["Pre-Seed & Seed"] }));
    expect(seedOnly.totalUsd).toBe(1_000_000);

    const big = await getOverview(t.db, F({ minRoundSizeUsd: 15_000_000 }));
    expect(big.rounds).toBe(1);
    expect(big.totalUsd).toBe(20_000_000);
  });

  it("category filter selects rounds belonging to the group", async () => {
    const beta = await getOverview(t.db, F({ categoryGroupIds: ["beta"] }));
    // Rounds r2 + r3 belong to beta.
    expect(beta.rounds).toBe(2);
    expect(beta.totalUsd).toBe(30_000_000);
  });

  it("deals + countDeals return distinct rounds", async () => {
    const n = await countDeals(t.db, F());
    expect(n).toBe(3);
    const deals = await getDeals(t.db, F(), { limit: 10, offset: 0, sort: "money" });
    expect(deals.map((d) => d.uuid)).toEqual(["r3", "r2", "r1"]);
    expect(deals[0].moneyRaisedUsd).toBe(20_000_000);
  });

  it("filters meta lists groups, stages, countries, and range", async () => {
    const meta = await getFiltersMeta(t.db);
    expect(meta.groups.map((g) => g.name).sort()).toEqual(["Alpha", "Beta"]);
    expect(meta.countries.sort()).toEqual(["GBR", "USA"]);
    expect(meta.dateRange.min).toBe("2020-01-15");
    expect(meta.dateRange.max).toBe("2021-03-15");
    expect(meta.stages.length).toBeGreaterThan(0);
  });
});
