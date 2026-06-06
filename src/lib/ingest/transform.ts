import type { FundingRound, Organization } from "@/lib/crunchbase/types";

/** Sentinel group for rounds whose org has no category group resolved. */
export const UNCATEGORIZED_GROUP_ID = "__uncategorized__";
export const UNCATEGORIZED_GROUP_NAME = "Uncategorized";

export interface RoundCategoryGroupInput {
  roundUuid: string;
  categoryGroupId: string;
  isPrimary: boolean;
  groupCount: number;
  announcedOn: string;
  stageBucket: string;
  moneyRaisedUsd: number | null;
  countryCode: string | null;
}

/**
 * Expand a funding round into one fact row per associated category group.
 *
 * `groupCount` + `isPrimary` are stored so a single GROUP BY can serve every
 * attribution method:
 *   - "each":       SUM(money_raised_usd)
 *   - "fractional": SUM(money_raised_usd / group_count)
 *   - "primary":    SUM(money_raised_usd) WHERE is_primary
 */
export function buildRoundCategoryGroupRows(
  round: FundingRound,
  org: Organization | undefined,
): RoundCategoryGroupInput[] {
  const groupIds = dedupe(
    (round.orgCategoryGroupIds && round.orgCategoryGroupIds.length
      ? round.orgCategoryGroupIds
      : (org?.categoryGroupIds ?? [])
    ).filter(Boolean),
  );

  const effective = groupIds.length ? groupIds : [UNCATEGORIZED_GROUP_ID];
  const countryCode = org?.countryCode ?? null;

  return effective.map((categoryGroupId, idx) => ({
    roundUuid: round.uuid,
    categoryGroupId,
    isPrimary: idx === 0,
    groupCount: effective.length,
    announcedOn: round.announcedOn,
    stageBucket: round.stageBucket,
    moneyRaisedUsd: round.moneyRaisedUsd,
    countryCode,
  }));
}

export function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Chunk an array into batches of `size` (for batched DB inserts). */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
