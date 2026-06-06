import { z } from "zod";

/**
 * Canonical, normalized domain types used everywhere downstream (ingestion, DB,
 * metrics, UI). Both the live Crunchbase provider and the mock provider emit
 * these shapes, so the rest of the system never depends on raw API JSON.
 */

export type ApiTier = "full" | "basic" | "unknown" | "mock";

export interface Capabilities {
  tier: ApiTier;
  /** Can we call POST /searches/funding_rounds? (Full API) */
  fundingRoundsSearch: boolean;
  /** Can we call POST /searches/organizations? (Basic + Full) */
  organizationsSearch: boolean;
  /** Does the funding_rounds payload include denormalized org categories? */
  fundingRoundOrgCategories: boolean;
  checkedAt: string;
  message: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
}

export interface Organization {
  uuid: string;
  permalink: string;
  name: string;
  shortDescription: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  foundedOn: string | null; // ISO date
  fundingTotalUsd: number | null;
  lastFundingAt: string | null; // ISO date
  /** Resolved category ids the org belongs to. */
  categoryIds: string[];
  /** Resolved category-group ids the org belongs to (denormalized for query speed). */
  categoryGroupIds: string[];
  cbUpdatedAt: string | null;
}

export interface FundingRound {
  uuid: string;
  orgUuid: string;
  orgName: string;
  orgPermalink: string;
  announcedOn: string; // ISO date
  investmentType: string;
  stageBucket: string;
  moneyRaisedUsd: number | null;
  currencyOriginal: string | null;
  numInvestors: number | null;
  leadInvestorUuids: string[];
  investorUuids: string[];
  /**
   * Optional denormalized categories carried on the round itself. Present only
   * when the provider/API exposes them; otherwise categories come from the org.
   */
  orgCategoryIds?: string[];
  orgCategoryGroupIds?: string[];
  cbUpdatedAt: string | null;
}

/** A page of funding rounds returned by a provider during ingestion. */
export interface FundingRoundPage {
  rounds: FundingRound[];
  /** Cursor (last item uuid) to pass as `after_id` for the next page; null when done. */
  nextCursor: string | null;
}

export interface FundingRoundQuery {
  /** Inclusive lower bound (ISO date or year string) on announced_on. */
  announcedOnGte?: string;
  /** Minimum money_raised in USD. */
  minMoneyRaisedUsd?: number;
  /** Restrict to these category-group ids (best-effort; live API filters via org). */
  categoryGroupIds?: string[];
  /** ISO country codes to include. */
  countryCodes?: string[];
  limit?: number;
  afterId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw Crunchbase API response schemas (Zod). Defensive: most fields optional.
// ─────────────────────────────────────────────────────────────────────────────

/** Crunchbase "identifier" object embedded in many fields. */
export const CbIdentifierSchema = z.object({
  uuid: z.string().optional(),
  value: z.string().optional(),
  permalink: z.string().optional(),
  entity_def_id: z.string().optional(),
});
export type CbIdentifier = z.infer<typeof CbIdentifierSchema>;

/** Crunchbase "Money" object. */
export const CbMoneySchema = z.object({
  value: z.number().optional(),
  currency: z.string().optional(),
  value_usd: z.number().optional(),
});

export const CbSearchEntitySchema = z.object({
  uuid: z.string(),
  properties: z.record(z.string(), z.unknown()),
});

export const CbSearchResponseSchema = z.object({
  count: z.number().optional(),
  entities: z.array(CbSearchEntitySchema).default([]),
});
export type CbSearchResponse = z.infer<typeof CbSearchResponseSchema>;

export const CbEntityLookupSchema = z.object({
  properties: z.record(z.string(), z.unknown()).optional(),
  cards: z.record(z.string(), z.unknown()).optional(),
});

export const CbAutocompleteEntitySchema = z.object({
  identifier: CbIdentifierSchema,
  facet_ids: z.array(z.string()).optional(),
  short_description: z.string().optional(),
});

export const CbAutocompleteResponseSchema = z.object({
  count: z.number().optional(),
  entities: z.array(CbAutocompleteEntitySchema).default([]),
});
export type CbAutocompleteResponse = z.infer<typeof CbAutocompleteResponseSchema>;
