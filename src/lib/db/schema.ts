import {
  pgTable,
  text,
  date,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * Schema notes
 * ------------
 * Two record tables hold the ingested slice of Crunchbase data:
 *   - `organizations` + `funding_rounds` (+ `organization_categories`)
 *
 * One denormalized FACT table powers all category-flow analytics:
 *   - `round_category_groups` — one row per (round × category group) with the
 *     round's money/date/stage/country copied in, plus `group_count` and
 *     `is_primary` so every attribution method (each / fractional / primary)
 *     is a single-table GROUP BY. This keeps metrics queries fast and correct.
 */

export const categoryGroups = pgTable("category_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categoryGroupId: text("category_group_id"),
});

export const organizations = pgTable(
  "organizations",
  {
    uuid: text("uuid").primaryKey(),
    permalink: text("permalink").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    countryCode: text("country_code"),
    region: text("region"),
    city: text("city"),
    foundedOn: date("founded_on"),
    fundingTotalUsd: bigint("funding_total_usd", { mode: "number" }),
    lastFundingAt: date("last_funding_at"),
    cbUpdatedAt: date("cb_updated_at"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("org_country_idx").on(t.countryCode)],
);

export const organizationCategories = pgTable(
  "organization_categories",
  {
    orgUuid: text("org_uuid").notNull(),
    categoryId: text("category_id").notNull(),
    categoryGroupId: text("category_group_id"),
  },
  (t) => [
    primaryKey({ columns: [t.orgUuid, t.categoryId] }),
    index("orgcat_group_idx").on(t.categoryGroupId),
  ],
);

export const fundingRounds = pgTable(
  "funding_rounds",
  {
    uuid: text("uuid").primaryKey(),
    orgUuid: text("org_uuid").notNull(),
    orgName: text("org_name").notNull(),
    orgPermalink: text("org_permalink").notNull(),
    announcedOn: date("announced_on").notNull(),
    investmentType: text("investment_type").notNull(),
    stageBucket: text("stage_bucket").notNull(),
    moneyRaisedUsd: bigint("money_raised_usd", { mode: "number" }),
    currencyOriginal: text("currency_original"),
    numInvestors: integer("num_investors"),
    leadInvestorUuids: jsonb("lead_investor_uuids").$type<string[]>(),
    investorUuids: jsonb("investor_uuids").$type<string[]>(),
    cbUpdatedAt: date("cb_updated_at"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("fr_announced_idx").on(t.announcedOn),
    index("fr_org_idx").on(t.orgUuid),
    index("fr_stage_idx").on(t.stageBucket),
  ],
);

export const roundCategoryGroups = pgTable(
  "round_category_groups",
  {
    roundUuid: text("round_uuid").notNull(),
    categoryGroupId: text("category_group_id").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    groupCount: integer("group_count").notNull().default(1),
    // Denormalized round attributes for single-table aggregation.
    announcedOn: date("announced_on").notNull(),
    stageBucket: text("stage_bucket").notNull(),
    moneyRaisedUsd: bigint("money_raised_usd", { mode: "number" }),
    countryCode: text("country_code"),
  },
  (t) => [
    primaryKey({ columns: [t.roundUuid, t.categoryGroupId] }),
    index("rcg_group_idx").on(t.categoryGroupId),
    index("rcg_announced_idx").on(t.announcedOn),
    index("rcg_stage_idx").on(t.stageBucket),
    index("rcg_country_idx").on(t.countryCode),
  ],
);

/** Ingestion cursor + run stats, keyed by entity (e.g. "funding_rounds"). */
export const syncState = pgTable("sync_state", {
  id: text("id").primaryKey(),
  cursorUuid: text("cursor_uuid"),
  lastAnnouncedOn: date("last_announced_on"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  status: text("status"),
  stats: jsonb("stats").$type<Record<string, unknown>>(),
});

/** Key/value app configuration (research-universe scope, capabilities cache). */
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type OrganizationRow = typeof organizations.$inferSelect;
export type FundingRoundRow = typeof fundingRounds.$inferSelect;
export type RoundCategoryGroupRow = typeof roundCategoryGroups.$inferSelect;
export type CategoryGroupRow = typeof categoryGroups.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;
