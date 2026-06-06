/**
 * Canonical Crunchbase field_id lists + the investment_type -> stage-bucket
 * mapping that powers the "venture stage" dimension across the app.
 */

export const FUNDING_ROUND_FIELDS = [
  "identifier",
  "announced_on",
  "investment_type",
  "money_raised",
  "num_investors",
  "funded_organization_identifier",
  "funded_organization_categories",
  "funded_organization_location",
  "investor_identifiers",
  "lead_investor_identifiers",
  "updated_at",
] as const;

export const ORGANIZATION_FIELDS = [
  "identifier",
  "short_description",
  "categories",
  "category_groups",
  "location_identifiers",
  "founded_on",
  "funding_total",
  "last_funding_at",
  "updated_at",
] as const;

/**
 * Ordered list of stage buckets. Order is used for stacked-chart layering and
 * legends so the visual goes early-stage -> late-stage consistently.
 */
export const STAGE_BUCKETS = [
  "Pre-Seed & Seed",
  "Early (A/B)",
  "Growth (C+)",
  "Late & PE",
  "Debt & Other",
] as const;

export type StageBucket = (typeof STAGE_BUCKETS)[number];

const INVESTMENT_TYPE_TO_STAGE: Record<string, StageBucket> = {
  pre_seed: "Pre-Seed & Seed",
  seed: "Pre-Seed & Seed",
  angel: "Pre-Seed & Seed",
  equity_crowdfunding: "Pre-Seed & Seed",
  product_crowdfunding: "Pre-Seed & Seed",
  initial_coin_offering: "Pre-Seed & Seed",

  series_a: "Early (A/B)",
  series_b: "Early (A/B)",

  series_c: "Growth (C+)",
  series_d: "Growth (C+)",
  series_e: "Growth (C+)",
  series_f: "Growth (C+)",
  series_g: "Growth (C+)",
  series_h: "Growth (C+)",
  series_i: "Growth (C+)",
  series_j: "Growth (C+)",

  private_equity: "Late & PE",
  corporate_round: "Late & PE",
  post_ipo_equity: "Late & PE",
  post_ipo_debt: "Late & PE",
  post_ipo_secondary: "Late & PE",
  secondary_market: "Late & PE",

  debt_financing: "Debt & Other",
  convertible_note: "Debt & Other",
  grant: "Debt & Other",
  non_equity_assistance: "Debt & Other",
  series_unknown: "Debt & Other",
  undisclosed: "Debt & Other",
};

/** Map a Crunchbase investment_type to a coarse stage bucket. */
export function stageBucketFor(investmentType: string | null | undefined): StageBucket {
  if (!investmentType) return "Debt & Other";
  return INVESTMENT_TYPE_TO_STAGE[investmentType.toLowerCase()] ?? "Debt & Other";
}

/** All investment types we recognize (handy for mock generation + tests). */
export const KNOWN_INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_TO_STAGE);
