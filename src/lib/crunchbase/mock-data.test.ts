import { describe, it, expect } from "vitest";
import { generateMockDataset } from "./mock-data";
import { STAGE_BUCKETS } from "./fields";

describe("generateMockDataset", () => {
  const ds = generateMockDataset({ seed: 42 });

  it("is deterministic for a given seed", () => {
    const a = generateMockDataset({ seed: 7 });
    const b = generateMockDataset({ seed: 7 });
    expect(a.rounds.length).toBe(b.rounds.length);
    expect(a.organizations.length).toBe(b.organizations.length);
    expect(a.rounds[0].uuid).toBe(b.rounds[0].uuid);
    expect(a.rounds.at(-1)!.uuid).toBe(b.rounds.at(-1)!.uuid);
  });

  it("produces a substantial multi-year dataset", () => {
    expect(ds.categoryGroups.length).toBeGreaterThanOrEqual(15);
    expect(ds.organizations.length).toBeGreaterThan(500);
    expect(ds.rounds.length).toBeGreaterThan(1500);
    const years = new Set(ds.rounds.map((r) => r.announcedOn.slice(0, 4)));
    expect(years.size).toBeGreaterThanOrEqual(10);
  });

  it("keeps rounds chronologically sorted", () => {
    for (let i = 1; i < ds.rounds.length; i++) {
      expect(ds.rounds[i - 1].announcedOn <= ds.rounds[i].announcedOn).toBe(true);
    }
  });

  it("emits valid money, stage buckets, and category groups", () => {
    const groupIds = new Set(ds.categoryGroups.map((g) => g.id));
    const buckets = new Set<string>(STAGE_BUCKETS);
    for (const r of ds.rounds.slice(0, 500)) {
      expect(r.moneyRaisedUsd!).toBeGreaterThan(0);
      expect(buckets.has(r.stageBucket)).toBe(true);
      for (const g of r.orgCategoryGroupIds ?? []) expect(groupIds.has(g)).toBe(true);
    }
  });

  it("AI capital in 2024 exceeds AI capital in 2016 (surge modeled)", () => {
    const ai = (year: string) =>
      ds.rounds
        .filter(
          (r) =>
            r.announcedOn.startsWith(year) &&
            (r.orgCategoryGroupIds ?? []).includes("artificial-intelligence"),
        )
        .reduce((s, r) => s + (r.moneyRaisedUsd ?? 0), 0);
    expect(ai("2024")).toBeGreaterThan(ai("2016"));
  });
});
