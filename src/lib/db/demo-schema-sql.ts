/**
 * Inlined DDL used ONLY to bootstrap the zero-config in-memory demo (e.g. a
 * Vercel deploy with no DATABASE_URL). Real Postgres deployments use the
 * drizzle migrations in ./drizzle via `npm run db:migrate`.
 *
 * Keep in sync with drizzle/0000_*.sql (regenerate with `npm run db:generate`).
 */
export const DEMO_DDL = `
CREATE TABLE IF NOT EXISTS "app_config" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "categories" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "category_group_id" text
);
CREATE TABLE IF NOT EXISTS "category_groups" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "funding_rounds" (
  "uuid" text PRIMARY KEY NOT NULL,
  "org_uuid" text NOT NULL,
  "org_name" text NOT NULL,
  "org_permalink" text NOT NULL,
  "announced_on" date NOT NULL,
  "investment_type" text NOT NULL,
  "stage_bucket" text NOT NULL,
  "money_raised_usd" bigint,
  "currency_original" text,
  "num_investors" integer,
  "lead_investor_uuids" jsonb,
  "investor_uuids" jsonb,
  "cb_updated_at" date,
  "synced_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "organization_categories" (
  "org_uuid" text NOT NULL,
  "category_id" text NOT NULL,
  "category_group_id" text,
  CONSTRAINT "organization_categories_org_uuid_category_id_pk" PRIMARY KEY("org_uuid","category_id")
);
CREATE TABLE IF NOT EXISTS "organizations" (
  "uuid" text PRIMARY KEY NOT NULL,
  "permalink" text NOT NULL,
  "name" text NOT NULL,
  "short_description" text,
  "country_code" text,
  "region" text,
  "city" text,
  "founded_on" date,
  "funding_total_usd" bigint,
  "last_funding_at" date,
  "cb_updated_at" date,
  "synced_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "round_category_groups" (
  "round_uuid" text NOT NULL,
  "category_group_id" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "group_count" integer DEFAULT 1 NOT NULL,
  "announced_on" date NOT NULL,
  "stage_bucket" text NOT NULL,
  "money_raised_usd" bigint,
  "country_code" text,
  CONSTRAINT "round_category_groups_round_uuid_category_group_id_pk" PRIMARY KEY("round_uuid","category_group_id")
);
CREATE TABLE IF NOT EXISTS "sync_state" (
  "id" text PRIMARY KEY NOT NULL,
  "cursor_uuid" text,
  "last_announced_on" date,
  "last_run_at" timestamp with time zone,
  "status" text,
  "stats" jsonb
);
CREATE INDEX IF NOT EXISTS "fr_announced_idx" ON "funding_rounds" USING btree ("announced_on");
CREATE INDEX IF NOT EXISTS "fr_org_idx" ON "funding_rounds" USING btree ("org_uuid");
CREATE INDEX IF NOT EXISTS "fr_stage_idx" ON "funding_rounds" USING btree ("stage_bucket");
CREATE INDEX IF NOT EXISTS "orgcat_group_idx" ON "organization_categories" USING btree ("category_group_id");
CREATE INDEX IF NOT EXISTS "org_country_idx" ON "organizations" USING btree ("country_code");
CREATE INDEX IF NOT EXISTS "rcg_group_idx" ON "round_category_groups" USING btree ("category_group_id");
CREATE INDEX IF NOT EXISTS "rcg_announced_idx" ON "round_category_groups" USING btree ("announced_on");
CREATE INDEX IF NOT EXISTS "rcg_stage_idx" ON "round_category_groups" USING btree ("stage_bucket");
CREATE INDEX IF NOT EXISTS "rcg_country_idx" ON "round_category_groups" USING btree ("country_code");
`;
