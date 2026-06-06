import { z } from "zod";

/**
 * The "research universe" — the bounded slice of Crunchbase the hub ingests and
 * analyzes. Stored in app_config (key "scope") and editable from Settings.
 */
export const ScopeSchema = z.object({
  /** Earliest announced_on year to ingest. */
  startYear: z.number().int().min(1990).max(2100).default(2013),
  /** Minimum round size (USD) to ingest; null = no floor. */
  minRoundSizeUsd: z.number().int().nonnegative().nullable().default(0),
  /** Restrict to these category-group ids; empty = all. */
  categoryGroupIds: z.array(z.string()).default([]),
  /** Restrict to these ISO country codes; empty = all. */
  countryCodes: z.array(z.string()).default([]),
  /** Default attribution method for category aggregation. */
  attributionMethod: z.enum(["each", "fractional", "primary"]).default("each"),
});

export type Scope = z.infer<typeof ScopeSchema>;

export const DEFAULT_SCOPE: Scope = ScopeSchema.parse({});

export const ATTRIBUTION_METHODS = ["each", "fractional", "primary"] as const;
export type AttributionMethod = (typeof ATTRIBUTION_METHODS)[number];

export const ATTRIBUTION_LABELS: Record<AttributionMethod, string> = {
  each: "Each category (full amount, sums may exceed 100%)",
  fractional: "Fractional (split evenly across categories)",
  primary: "Primary category only",
};
