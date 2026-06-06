import { sql, inArray } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  categories as categoriesTable,
  categoryGroups as categoryGroupsTable,
  fundingRounds as fundingRoundsTable,
  organizationCategories as orgCategoriesTable,
  organizations as organizationsTable,
  roundCategoryGroups as rcgTable,
} from "@/lib/db/schema";
import type {
  Category,
  CategoryGroup,
  FundingRound,
  Organization,
} from "@/lib/crunchbase/types";
import {
  buildRoundCategoryGroupRows,
  chunk,
  UNCATEGORIZED_GROUP_ID,
  UNCATEGORIZED_GROUP_NAME,
} from "./transform";

const BATCH = 500;

export async function upsertCategoryGroups(
  db: Database,
  groups: CategoryGroup[],
): Promise<void> {
  const rows = [
    ...groups,
    { id: UNCATEGORIZED_GROUP_ID, name: UNCATEGORIZED_GROUP_NAME },
  ];
  for (const batch of chunk(rows, BATCH)) {
    await db
      .insert(categoryGroupsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: categoryGroupsTable.id,
        set: { name: sql`excluded.name` },
      });
  }
}

export async function upsertCategories(
  db: Database,
  cats: Category[],
): Promise<void> {
  if (!cats.length) return;
  const rows = cats.map((c) => ({
    id: c.id,
    name: c.name,
    categoryGroupId: c.groupId,
  }));
  for (const batch of chunk(rows, BATCH)) {
    await db
      .insert(categoriesTable)
      .values(batch)
      .onConflictDoUpdate({
        target: categoriesTable.id,
        set: {
          name: sql`excluded.name`,
          categoryGroupId: sql`excluded.category_group_id`,
        },
      });
  }
}

export async function upsertOrganizations(
  db: Database,
  orgs: Organization[],
): Promise<void> {
  if (!orgs.length) return;
  const rows = orgs.map((o) => ({
    uuid: o.uuid,
    permalink: o.permalink,
    name: o.name,
    shortDescription: o.shortDescription,
    countryCode: o.countryCode,
    region: o.region,
    city: o.city,
    foundedOn: o.foundedOn,
    fundingTotalUsd: o.fundingTotalUsd,
    lastFundingAt: o.lastFundingAt,
    cbUpdatedAt: o.cbUpdatedAt,
  }));
  for (const batch of chunk(rows, BATCH)) {
    await db
      .insert(organizationsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: organizationsTable.uuid,
        set: {
          permalink: sql`excluded.permalink`,
          name: sql`excluded.name`,
          shortDescription: sql`excluded.short_description`,
          countryCode: sql`excluded.country_code`,
          region: sql`excluded.region`,
          city: sql`excluded.city`,
          foundedOn: sql`excluded.founded_on`,
          fundingTotalUsd: sql`excluded.funding_total_usd`,
          lastFundingAt: sql`excluded.last_funding_at`,
          cbUpdatedAt: sql`excluded.cb_updated_at`,
          syncedAt: sql`now()`,
        },
      });
  }

  // Replace org→category links for these orgs.
  const orgUuids = orgs.map((o) => o.uuid);
  for (const batch of chunk(orgUuids, BATCH)) {
    await db
      .delete(orgCategoriesTable)
      .where(inArray(orgCategoriesTable.orgUuid, batch));
  }
  const catRows = orgs.flatMap((o) =>
    o.categoryIds.map((categoryId, idx) => ({
      orgUuid: o.uuid,
      categoryId,
      categoryGroupId: o.categoryGroupIds[idx] ?? o.categoryGroupIds[0] ?? null,
    })),
  );
  // Dedupe on (orgUuid, categoryId) to respect the composite PK.
  const seen = new Set<string>();
  const deduped = catRows.filter((r) => {
    const k = `${r.orgUuid}::${r.categoryId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  for (const batch of chunk(deduped, BATCH)) {
    await db.insert(orgCategoriesTable).values(batch).onConflictDoNothing();
  }
}

export async function upsertFundingRounds(
  db: Database,
  rounds: FundingRound[],
  orgByUuid: Map<string, Organization>,
): Promise<void> {
  if (!rounds.length) return;

  const roundRows = rounds.map((r) => ({
    uuid: r.uuid,
    orgUuid: r.orgUuid,
    orgName: r.orgName,
    orgPermalink: r.orgPermalink,
    announcedOn: r.announcedOn,
    investmentType: r.investmentType,
    stageBucket: r.stageBucket,
    moneyRaisedUsd: r.moneyRaisedUsd,
    currencyOriginal: r.currencyOriginal,
    numInvestors: r.numInvestors,
    leadInvestorUuids: r.leadInvestorUuids,
    investorUuids: r.investorUuids,
    cbUpdatedAt: r.cbUpdatedAt,
  }));
  for (const batch of chunk(roundRows, BATCH)) {
    await db
      .insert(fundingRoundsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: fundingRoundsTable.uuid,
        set: {
          orgUuid: sql`excluded.org_uuid`,
          orgName: sql`excluded.org_name`,
          orgPermalink: sql`excluded.org_permalink`,
          announcedOn: sql`excluded.announced_on`,
          investmentType: sql`excluded.investment_type`,
          stageBucket: sql`excluded.stage_bucket`,
          moneyRaisedUsd: sql`excluded.money_raised_usd`,
          currencyOriginal: sql`excluded.currency_original`,
          numInvestors: sql`excluded.num_investors`,
          leadInvestorUuids: sql`excluded.lead_investor_uuids`,
          investorUuids: sql`excluded.investor_uuids`,
          cbUpdatedAt: sql`excluded.cb_updated_at`,
          syncedAt: sql`now()`,
        },
      });
  }

  // Rebuild the fact rows for these rounds (delete then insert = idempotent).
  const roundUuids = rounds.map((r) => r.uuid);
  for (const batch of chunk(roundUuids, BATCH)) {
    await db.delete(rcgTable).where(inArray(rcgTable.roundUuid, batch));
  }
  const factRows = rounds.flatMap((r) =>
    buildRoundCategoryGroupRows(r, orgByUuid.get(r.orgUuid)),
  );
  for (const batch of chunk(factRows, BATCH)) {
    await db.insert(rcgTable).values(batch).onConflictDoNothing();
  }
}
