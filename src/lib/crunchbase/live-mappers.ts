import { stageBucketFor } from "./fields";
import type { FundingRound, Organization } from "./types";

/**
 * Pure mappers from raw Crunchbase v4 property bags to our normalized domain
 * types. Kept separate from the client/provider so they can be unit-tested
 * against captured sample payloads.
 */

type Props = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface Identifier {
  uuid?: string;
  value?: string;
  permalink?: string;
}
function asIdentifier(v: unknown): Identifier | null {
  if (v && typeof v === "object") return v as Identifier;
  return null;
}
function asIdentifierArray(v: unknown): Identifier[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === "object") as Identifier[];
}

interface Money {
  value?: number;
  currency?: string;
  value_usd?: number;
}
function asMoney(v: unknown): Money | null {
  if (v && typeof v === "object") return v as Money;
  return null;
}

/** Map a funding_round search/entity property bag to a FundingRound. */
export function mapFundingRound(
  uuid: string,
  props: Props,
): FundingRound | null {
  const announcedOn = asString(props["announced_on"]);
  if (!announcedOn) return null;

  const org = asIdentifier(props["funded_organization_identifier"]);
  const money = asMoney(props["money_raised"]);
  const investmentType = asString(props["investment_type"]) ?? "undisclosed";

  const orgCategories = asIdentifierArray(props["funded_organization_categories"]);
  const orgCategoryIds = orgCategories
    .map((c) => c.permalink ?? c.uuid)
    .filter((x): x is string => Boolean(x));

  const leads = asIdentifierArray(props["lead_investor_identifiers"])
    .map((i) => i.uuid ?? i.permalink)
    .filter((x): x is string => Boolean(x));
  const investors = asIdentifierArray(props["investor_identifiers"])
    .map((i) => i.uuid ?? i.permalink)
    .filter((x): x is string => Boolean(x));

  return {
    uuid,
    orgUuid: org?.uuid ?? org?.permalink ?? "unknown",
    orgName: org?.value ?? "Unknown",
    orgPermalink: org?.permalink ?? org?.uuid ?? "unknown",
    announcedOn,
    investmentType,
    stageBucket: stageBucketFor(investmentType),
    moneyRaisedUsd: money?.value_usd ?? money?.value ?? null,
    currencyOriginal: money?.currency ?? null,
    numInvestors: asNumber(props["num_investors"]),
    leadInvestorUuids: leads,
    investorUuids: investors,
    orgCategoryIds: orgCategoryIds.length ? orgCategoryIds : undefined,
    cbUpdatedAt: asString(props["updated_at"]),
  };
}

/** Map an organization entity/search property bag to an Organization. */
export function mapOrganization(
  fallbackUuid: string,
  props: Props,
): Organization {
  const identifier = asIdentifier(props["identifier"]);
  const categories = asIdentifierArray(props["categories"]);
  const categoryGroups = asIdentifierArray(props["category_groups"]);
  const locations = asIdentifierArray(props["location_identifiers"]);
  const money = asMoney(props["funding_total"]);

  // Location identifiers come ordered city -> region -> country (location_type).
  const byType: Record<string, string> = {};
  for (const loc of locations) {
    const l = loc as Identifier & { location_type?: string };
    if (l.location_type && l.value) byType[l.location_type] = l.value;
  }

  return {
    uuid: identifier?.uuid ?? fallbackUuid,
    permalink: identifier?.permalink ?? fallbackUuid,
    name: identifier?.value ?? "Unknown",
    shortDescription: asString(props["short_description"]),
    countryCode: byType["country"] ?? null,
    region: byType["region"] ?? null,
    city: byType["city"] ?? null,
    foundedOn: asString(props["founded_on"]),
    fundingTotalUsd: money?.value_usd ?? money?.value ?? null,
    lastFundingAt: asString(props["last_funding_at"]),
    categoryIds: categories
      .map((c) => c.permalink ?? c.uuid)
      .filter((x): x is string => Boolean(x)),
    categoryGroupIds: categoryGroups
      .map((c) => c.permalink ?? c.uuid)
      .filter((x): x is string => Boolean(x)),
    cbUpdatedAt: asString(props["updated_at"]),
  };
}
