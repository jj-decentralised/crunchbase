import { sql, type SQL } from "drizzle-orm";
import { type Database, rowsOf } from "@/lib/db";
import type { MetricsFilter, Grain } from "./filters";
import { STAGE_BUCKETS } from "@/lib/crunchbase/fields";

/**
 * Analytical query layer over the `round_category_groups` fact table.
 *
 * Attribution handling:
 *  - "each":       money counted fully for every category group (sums can exceed 100%).
 *  - "fractional": money / group_count  (series sums reconcile to the true total).
 *  - "primary":    only the round's primary group row (is_primary = true).
 *
 * KPI totals (capital deployed / rounds / avg) are computed over DISTINCT rounds
 * and are therefore attribution-independent — they describe the filtered deal
 * set, while category breakdowns below use the selected attribution method.
 */

function inList(col: string, values: string[]): SQL {
  return sql`${sql.raw(col)} in (${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )})`;
}

/** Base WHERE conditions on the fact table (date/stage/country/size [+category]). */
function baseConditions(f: MetricsFilter, includeCategory: boolean): SQL[] {
  const c: SQL[] = [];
  if (f.from) c.push(sql`rcg.announced_on >= ${f.from}`);
  if (f.to) c.push(sql`rcg.announced_on <= ${f.to}`);
  if (f.stageBuckets.length) c.push(inList("rcg.stage_bucket", f.stageBuckets));
  if (f.countryCodes.length) c.push(inList("rcg.country_code", f.countryCodes));
  if (f.minRoundSizeUsd != null)
    c.push(sql`rcg.money_raised_usd >= ${f.minRoundSizeUsd}`);
  if (f.maxRoundSizeUsd != null)
    c.push(sql`rcg.money_raised_usd <= ${f.maxRoundSizeUsd}`);
  if (includeCategory && f.categoryGroupIds.length)
    c.push(inList("rcg.category_group_id", f.categoryGroupIds));
  return c;
}

function whereClause(conds: SQL[]): SQL {
  if (!conds.length) return sql``;
  return sql` where ${sql.join(conds, sql` and `)}`;
}

function moneyExpr(method: MetricsFilter["attributionMethod"]): SQL {
  return method === "fractional"
    ? sql`(rcg.money_raised_usd::numeric / rcg.group_count)`
    : sql`rcg.money_raised_usd`;
}

/** Conditions including the attribution primary filter (for breakdown queries). */
function breakdownConditions(f: MetricsFilter): SQL[] {
  const c = baseConditions(f, true);
  if (f.attributionMethod === "primary") c.push(sql`rcg.is_primary = true`);
  return c;
}

function periodExpr(grain: Grain): SQL {
  // grain is enum-validated, safe to inline.
  return sql`date_trunc(${sql.raw(`'${grain}'`)}, rcg.announced_on)`;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewKpis {
  totalUsd: number;
  rounds: number;
  avgRoundUsd: number;
  activeCategories: number;
}

export interface MoverRow {
  groupId: string;
  name: string;
  current: number;
  previous: number;
  deltaPct: number | null;
}

export interface OverviewResult extends OverviewKpis {
  topGainers: MoverRow[];
  topLosers: MoverRow[];
  periodLabel: string;
}

export async function getOverview(
  db: Database,
  f: MetricsFilter,
): Promise<OverviewResult> {
  const conds = baseConditions(f, true);
  const kpiSql = sql`
    with base as (
      select distinct rcg.round_uuid, rcg.money_raised_usd
      from round_category_groups rcg${whereClause(conds)}
    )
    select
      coalesce(sum(money_raised_usd), 0)::bigint as total,
      count(*)::int as rounds,
      coalesce(round(avg(money_raised_usd)), 0)::bigint as avg
    from base
  `;
  const kpiRows = rowsOf<{ total: number; rounds: number; avg: number }>(
    await db.execute(kpiSql),
  );
  const kpi = kpiRows[0] ?? { total: 0, rounds: 0, avg: 0 };

  const catSql = sql`
    select count(distinct rcg.category_group_id)::int as n
    from round_category_groups rcg${whereClause(conds)}
  `;
  const activeCategories =
    rowsOf<{ n: number }>(await db.execute(catSql))[0]?.n ?? 0;

  // Movers: compare the two most recent periods (by grain) per category group.
  const movers = await getMovers(db, f);

  return {
    totalUsd: Number(kpi.total),
    rounds: Number(kpi.rounds),
    avgRoundUsd: Number(kpi.avg),
    activeCategories,
    topGainers: movers.gainers,
    topLosers: movers.losers,
    periodLabel: movers.periodLabel,
  };
}

async function getMovers(db: Database, f: MetricsFilter) {
  const conds = breakdownConditions(f);
  const s = sql`
    select ${periodExpr(f.grain)} as period, cg.id as group_id, cg.name as name,
      sum(${moneyExpr(f.attributionMethod)})::bigint as total
    from round_category_groups rcg
    join category_groups cg on cg.id = rcg.category_group_id${whereClause(conds)}
    group by period, cg.id, cg.name
    order by period
  `;
  const rows = rowsOf<{ period: string; group_id: string; name: string; total: number }>(
    await db.execute(s),
  );
  const periods = Array.from(new Set(rows.map((r) => String(r.period)))).sort();
  const last = periods.at(-1);
  const prev = periods.at(-2);
  const byGroup = new Map<string, MoverRow>();
  for (const r of rows) {
    const p = String(r.period);
    const m =
      byGroup.get(r.group_id) ??
      ({ groupId: r.group_id, name: r.name, current: 0, previous: 0, deltaPct: null } as MoverRow);
    if (p === last) m.current = Number(r.total);
    else if (p === prev) m.previous = Number(r.total);
    byGroup.set(r.group_id, m);
  }
  const movers = [...byGroup.values()].map((m) => ({
    ...m,
    deltaPct: m.previous > 0 ? (m.current - m.previous) / m.previous : null,
  }));
  const gainers = [...movers]
    .filter((m) => m.current > 0)
    .sort((a, b) => b.current - b.previous - (a.current - a.previous))
    .slice(0, 5);
  const losers = [...movers]
    .sort((a, b) => a.current - a.previous - (b.current - b.previous))
    .slice(0, 5);
  return { gainers, losers, periodLabel: last ? String(last).slice(0, 10) : "—" };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TimeseriesResult {
  /** Pivoted rows: { period, [groupName]: number, ... } */
  series: Array<Record<string, string | number>>;
  /** Ordered group names included as series keys (plus possibly "Other"). */
  groups: { id: string; name: string; total: number }[];
}

export async function getTimeseries(
  db: Database,
  f: MetricsFilter,
  topN = 8,
): Promise<TimeseriesResult> {
  const conds = breakdownConditions(f);
  const s = sql`
    select ${periodExpr(f.grain)} as period, cg.id as group_id, cg.name as name,
      sum(${moneyExpr(f.attributionMethod)})::bigint as total,
      count(distinct rcg.round_uuid)::int as rounds
    from round_category_groups rcg
    join category_groups cg on cg.id = rcg.category_group_id${whereClause(conds)}
    group by period, cg.id, cg.name
    order by period
  `;
  const rows = rowsOf<{
    period: string;
    group_id: string;
    name: string;
    total: number;
  }>(await db.execute(s));

  // Rank groups by total across the whole range.
  const totals = new Map<string, { id: string; name: string; total: number }>();
  for (const r of rows) {
    const t = totals.get(r.group_id) ?? { id: r.group_id, name: r.name, total: 0 };
    t.total += Number(r.total);
    totals.set(r.group_id, t);
  }
  const ranked = [...totals.values()].sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, topN);
  const topIds = new Set(top.map((g) => g.id));
  const hasOther = ranked.length > topN;

  // Pivot into period rows.
  const periods = Array.from(new Set(rows.map((r) => String(r.period)))).sort();
  const series = periods.map((p) => {
    const row: Record<string, string | number> = { period: p.slice(0, 10) };
    for (const g of top) row[g.name] = 0;
    if (hasOther) row["Other"] = 0;
    return row;
  });
  const idx = new Map(periods.map((p, i) => [p, i]));
  for (const r of rows) {
    const i = idx.get(String(r.period));
    if (i == null) continue;
    const key = topIds.has(r.group_id) ? r.name : "Other";
    if (key === "Other" && !hasOther) continue;
    series[i][key] = (Number(series[i][key]) || 0) + Number(r.total);
  }

  const groups = hasOther
    ? [...top, { id: "__other__", name: "Other", total: ranked.slice(topN).reduce((s2, g) => s2 + g.total, 0) }]
    : top;

  return { series, groups };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TreemapNode {
  id: string;
  name: string;
  total: number;
  rounds: number;
}

export async function getTreemap(
  db: Database,
  f: MetricsFilter,
): Promise<TreemapNode[]> {
  const conds = breakdownConditions(f);
  const s = sql`
    select cg.id as id, cg.name as name,
      sum(${moneyExpr(f.attributionMethod)})::bigint as total,
      count(distinct rcg.round_uuid)::int as rounds
    from round_category_groups rcg
    join category_groups cg on cg.id = rcg.category_group_id${whereClause(conds)}
    group by cg.id, cg.name
    order by total desc
  `;
  return rowsOf<{ id: string; name: string; total: number; rounds: number }>(
    await db.execute(s),
  ).map((r) => ({
    id: r.id,
    name: r.name,
    total: Number(r.total),
    rounds: Number(r.rounds),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SankeyData {
  nodes: { id: string }[];
  links: { source: string; target: string; value: number }[];
}

export async function getSankey(
  db: Database,
  f: MetricsFilter,
  topGroups = 10,
): Promise<SankeyData> {
  const conds = breakdownConditions(f);
  const s = sql`
    select rcg.stage_bucket as stage, cg.name as name,
      sum(${moneyExpr(f.attributionMethod)})::bigint as total
    from round_category_groups rcg
    join category_groups cg on cg.id = rcg.category_group_id${whereClause(conds)}
    group by rcg.stage_bucket, cg.name
  `;
  const rows = rowsOf<{ stage: string; name: string; total: number }>(
    await db.execute(s),
  );

  // Limit to the top category groups by total for readability.
  const groupTotals = new Map<string, number>();
  for (const r of rows) groupTotals.set(r.name, (groupTotals.get(r.name) ?? 0) + Number(r.total));
  const topNames = new Set(
    [...groupTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, topGroups).map((e) => e[0]),
  );

  const stageNodes = STAGE_BUCKETS.filter((sb) => rows.some((r) => r.stage === sb));
  const nodeSet = new Set<string>([...stageNodes, ...topNames]);
  const links = new Map<string, number>();
  for (const r of rows) {
    if (!topNames.has(r.name)) continue;
    const key = `${r.stage}→${r.name}`;
    links.set(key, (links.get(key) ?? 0) + Number(r.total));
  }
  return {
    nodes: [...nodeSet].map((id) => ({ id })),
    links: [...links.entries()].map(([k, value]) => {
      const [source, target] = k.split("→");
      return { source, target, value };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryDetailResult {
  groupId: string;
  name: string;
  totalUsd: number;
  rounds: number;
  timeseries: { period: string; total: number; rounds: number }[];
  stageSplit: { stage: string; total: number }[];
  countrySplit: { country: string; total: number }[];
  topDeals: DealRow[];
}

export async function getCategoryDetail(
  db: Database,
  f: MetricsFilter,
  groupId: string,
): Promise<CategoryDetailResult> {
  const gf: MetricsFilter = { ...f, categoryGroupIds: [groupId] };
  const conds = breakdownConditions(gf);

  const tsRows = rowsOf<{ period: string; total: number; rounds: number }>(
    await db.execute(sql`
      select ${periodExpr(f.grain)} as period,
        sum(${moneyExpr(f.attributionMethod)})::bigint as total,
        count(distinct rcg.round_uuid)::int as rounds
      from round_category_groups rcg${whereClause(conds)}
      group by period order by period
    `),
  );

  const stageRows = rowsOf<{ stage: string; total: number }>(
    await db.execute(sql`
      select rcg.stage_bucket as stage, sum(${moneyExpr(f.attributionMethod)})::bigint as total
      from round_category_groups rcg${whereClause(conds)}
      group by rcg.stage_bucket order by total desc
    `),
  );

  const countryRows = rowsOf<{ country: string; total: number }>(
    await db.execute(sql`
      select coalesce(rcg.country_code, 'Unknown') as country,
        sum(${moneyExpr(f.attributionMethod)})::bigint as total
      from round_category_groups rcg${whereClause(conds)}
      group by rcg.country_code order by total desc limit 12
    `),
  );

  const nameRow = rowsOf<{ name: string }>(
    await db.execute(sql`select name from category_groups where id = ${groupId} limit 1`),
  )[0];

  const topDeals = await getDeals(db, gf, { limit: 10, offset: 0, sort: "money" });

  const totalUsd = tsRows.reduce((s, r) => s + Number(r.total), 0);
  const rounds = tsRows.reduce((s, r) => s + Number(r.rounds), 0);

  return {
    groupId,
    name: nameRow?.name ?? groupId,
    totalUsd,
    rounds,
    timeseries: tsRows.map((r) => ({ period: String(r.period).slice(0, 10), total: Number(r.total), rounds: Number(r.rounds) })),
    stageSplit: stageRows.map((r) => ({ stage: r.stage, total: Number(r.total) })),
    countrySplit: countryRows.map((r) => ({ country: r.country, total: Number(r.total) })),
    topDeals,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface DealRow {
  uuid: string;
  orgName: string;
  orgPermalink: string;
  announcedOn: string;
  investmentType: string;
  stageBucket: string;
  moneyRaisedUsd: number | null;
  numInvestors: number | null;
  countryCode: string | null;
}

export async function getDeals(
  db: Database,
  f: MetricsFilter,
  opts: { limit: number; offset: number; sort: "money" | "date" },
): Promise<DealRow[]> {
  const conds = baseConditions(f, true); // distinct-round semantics, no primary filter
  const order =
    opts.sort === "money"
      ? sql`fr.money_raised_usd desc nulls last`
      : sql`fr.announced_on desc`;
  const s = sql`
    select fr.uuid, fr.org_name, fr.org_permalink, fr.announced_on,
      fr.investment_type, fr.stage_bucket, fr.money_raised_usd, fr.num_investors,
      o.country_code
    from funding_rounds fr
    left join organizations o on o.uuid = fr.org_uuid
    where fr.uuid in (
      select distinct rcg.round_uuid from round_category_groups rcg${whereClause(conds)}
    )
    order by ${order}
    limit ${opts.limit} offset ${opts.offset}
  `;
  return rowsOf<{
    uuid: string;
    org_name: string;
    org_permalink: string;
    announced_on: string;
    investment_type: string;
    stage_bucket: string;
    money_raised_usd: number | null;
    num_investors: number | null;
    country_code: string | null;
  }>(await db.execute(s)).map((r) => ({
    uuid: r.uuid,
    orgName: r.org_name,
    orgPermalink: r.org_permalink,
    announcedOn: String(r.announced_on).slice(0, 10),
    investmentType: r.investment_type,
    stageBucket: r.stage_bucket,
    moneyRaisedUsd: r.money_raised_usd == null ? null : Number(r.money_raised_usd),
    numInvestors: r.num_investors,
    countryCode: r.country_code,
  }));
}

export async function countDeals(db: Database, f: MetricsFilter): Promise<number> {
  const conds = baseConditions(f, true);
  const s = sql`
    select count(distinct rcg.round_uuid)::int as n
    from round_category_groups rcg${whereClause(conds)}
  `;
  return rowsOf<{ n: number }>(await db.execute(s))[0]?.n ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface FiltersMeta {
  groups: { id: string; name: string }[];
  stages: string[];
  countries: string[];
  dateRange: { min: string | null; max: string | null };
}

export async function getFiltersMeta(db: Database): Promise<FiltersMeta> {
  const groups = rowsOf<{ id: string; name: string }>(
    await db.execute(sql`
      select distinct cg.id, cg.name
      from category_groups cg
      join round_category_groups rcg on rcg.category_group_id = cg.id
      order by cg.name
    `),
  );
  const countries = rowsOf<{ country_code: string }>(
    await db.execute(sql`
      select distinct country_code from round_category_groups
      where country_code is not null order by country_code
    `),
  ).map((r) => r.country_code);
  const range = rowsOf<{ min: string; max: string }>(
    await db.execute(sql`select min(announced_on) as min, max(announced_on) as max from round_category_groups`),
  )[0];

  return {
    groups,
    stages: [...STAGE_BUCKETS],
    countries,
    dateRange: {
      min: range?.min ? String(range.min).slice(0, 10) : null,
      max: range?.max ? String(range.max).slice(0, 10) : null,
    },
  };
}
