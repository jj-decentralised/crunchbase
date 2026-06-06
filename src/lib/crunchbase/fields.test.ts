import { describe, it, expect } from "vitest";
import { stageBucketFor, STAGE_BUCKETS } from "./fields";

describe("stageBucketFor", () => {
  it("maps seed-family types to Pre-Seed & Seed", () => {
    expect(stageBucketFor("seed")).toBe("Pre-Seed & Seed");
    expect(stageBucketFor("pre_seed")).toBe("Pre-Seed & Seed");
    expect(stageBucketFor("angel")).toBe("Pre-Seed & Seed");
  });

  it("maps A/B to Early", () => {
    expect(stageBucketFor("series_a")).toBe("Early (A/B)");
    expect(stageBucketFor("series_b")).toBe("Early (A/B)");
  });

  it("maps C+ to Growth", () => {
    expect(stageBucketFor("series_c")).toBe("Growth (C+)");
    expect(stageBucketFor("series_f")).toBe("Growth (C+)");
  });

  it("maps PE/IPO to Late & PE", () => {
    expect(stageBucketFor("private_equity")).toBe("Late & PE");
    expect(stageBucketFor("post_ipo_equity")).toBe("Late & PE");
  });

  it("is case-insensitive and defaults unknowns to Debt & Other", () => {
    expect(stageBucketFor("SERIES_A")).toBe("Early (A/B)");
    expect(stageBucketFor("something_new")).toBe("Debt & Other");
    expect(stageBucketFor(null)).toBe("Debt & Other");
    expect(stageBucketFor(undefined)).toBe("Debt & Other");
  });

  it("only produces buckets from the canonical ordered list", () => {
    const set = new Set<string>(STAGE_BUCKETS);
    for (const t of ["seed", "series_a", "series_c", "private_equity", "grant", "weird"]) {
      expect(set.has(stageBucketFor(t))).toBe(true);
    }
  });
});
