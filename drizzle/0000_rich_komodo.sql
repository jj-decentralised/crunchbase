CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_group_id" text
);
--> statement-breakpoint
CREATE TABLE "category_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_rounds" (
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
--> statement-breakpoint
CREATE TABLE "organization_categories" (
	"org_uuid" text NOT NULL,
	"category_id" text NOT NULL,
	"category_group_id" text,
	CONSTRAINT "organization_categories_org_uuid_category_id_pk" PRIMARY KEY("org_uuid","category_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
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
--> statement-breakpoint
CREATE TABLE "round_category_groups" (
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
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"id" text PRIMARY KEY NOT NULL,
	"cursor_uuid" text,
	"last_announced_on" date,
	"last_run_at" timestamp with time zone,
	"status" text,
	"stats" jsonb
);
--> statement-breakpoint
CREATE INDEX "fr_announced_idx" ON "funding_rounds" USING btree ("announced_on");--> statement-breakpoint
CREATE INDEX "fr_org_idx" ON "funding_rounds" USING btree ("org_uuid");--> statement-breakpoint
CREATE INDEX "fr_stage_idx" ON "funding_rounds" USING btree ("stage_bucket");--> statement-breakpoint
CREATE INDEX "orgcat_group_idx" ON "organization_categories" USING btree ("category_group_id");--> statement-breakpoint
CREATE INDEX "org_country_idx" ON "organizations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "rcg_group_idx" ON "round_category_groups" USING btree ("category_group_id");--> statement-breakpoint
CREATE INDEX "rcg_announced_idx" ON "round_category_groups" USING btree ("announced_on");--> statement-breakpoint
CREATE INDEX "rcg_stage_idx" ON "round_category_groups" USING btree ("stage_bucket");--> statement-breakpoint
CREATE INDEX "rcg_country_idx" ON "round_category_groups" USING btree ("country_code");