import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { syncState } from "@/lib/db/schema";
import type { DataProvider } from "@/lib/crunchbase/provider";
import type { Scope } from "@/lib/config";
import type { Organization } from "@/lib/crunchbase/types";
import {
  ensureCategoryGroups,
  loadOrganizations,
  upsertCategories,
  upsertCategoryGroups,
  upsertFundingRounds,
  upsertOrganizations,
} from "./persist";

const SYNC_ID = "funding_rounds";

export interface SyncOptions {
  db: Database;
  provider: DataProvider;
  scope: Scope;
  /** Max pages to process this invocation (keeps serverless runs bounded). */
  maxPages?: number;
  /** Rounds per page (<= 1000). */
  pageSize?: number;
  /** Start over from the beginning (ignore stored cursor). */
  reset?: boolean;
  /** Optional progress logger. */
  log?: (msg: string) => void;
}

export interface SyncResult {
  pages: number;
  rounds: number;
  orgsFetched: number;
  done: boolean;
  cursor: string | null;
  lastAnnouncedOn: string | null;
  durationMs: number;
}

export async function runSync(opts: SyncOptions): Promise<SyncResult> {
  const {
    db,
    provider,
    scope,
    maxPages = 20,
    pageSize = 500,
    reset = false,
    log = () => {},
  } = opts;
  const started = Date.now();

  // Load cursor.
  const existing = await db
    .select()
    .from(syncState)
    .where(eq(syncState.id, SYNC_ID))
    .limit(1);
  let cursor: string | null = reset ? null : (existing[0]?.cursorUuid ?? null);
  const isFreshStart = reset || !existing[0];

  // On a fresh start, seed the category taxonomy (best-effort for live keys).
  if (isFreshStart) {
    try {
      const tax = await provider.getCategoryTaxonomy();
      if (tax.groups.length) await upsertCategoryGroups(db, tax.groups);
      if (tax.categories.length) await upsertCategories(db, tax.categories);
      log(
        `taxonomy: ${tax.groups.length} groups, ${tax.categories.length} categories`,
      );
    } catch (err) {
      log(`taxonomy load skipped: ${(err as Error).message}`);
    }
  }

  let pages = 0;
  let rounds = 0;
  let orgsFetched = 0;
  let lastAnnouncedOn: string | null = existing[0]?.lastAnnouncedOn ?? null;

  for (let p = 0; p < maxPages; p++) {
    const page = await provider.fetchFundingRounds({
      announcedOnGte: String(scope.startYear),
      minMoneyRaisedUsd: scope.minRoundSizeUsd ?? undefined,
      categoryGroupIds: scope.categoryGroupIds.length
        ? scope.categoryGroupIds
        : undefined,
      countryCodes: scope.countryCodes.length ? scope.countryCodes : undefined,
      limit: pageSize,
      afterId: cursor,
    });

    if (page.rounds.length === 0) {
      cursor = null;
      break;
    }

    // Resolve organizations for this page (DB cache first, then enrich misses).
    const distinctOrgUuids = Array.from(
      new Set(page.rounds.map((r) => r.orgUuid)),
    );
    const orgMap = await loadOrganizations(db, distinctOrgUuids);
    const missing = distinctOrgUuids.filter((id) => !orgMap.has(id));
    let fetched: Organization[] = [];
    if (missing.length) {
      fetched = await provider.fetchOrganizations(missing);
      await upsertOrganizations(db, fetched);
      for (const o of fetched) orgMap.set(o.uuid, o);
      orgsFetched += fetched.length;
    }

    // Make sure any group referenced by the rounds/orgs exists for joins.
    const referencedGroups = new Set<string>();
    for (const r of page.rounds) {
      for (const g of r.orgCategoryGroupIds ?? []) referencedGroups.add(g);
      for (const g of orgMap.get(r.orgUuid)?.categoryGroupIds ?? [])
        referencedGroups.add(g);
    }
    await ensureCategoryGroups(db, Array.from(referencedGroups));

    await upsertFundingRounds(db, page.rounds, orgMap);

    pages++;
    rounds += page.rounds.length;
    lastAnnouncedOn = page.rounds[page.rounds.length - 1].announcedOn;
    cursor = page.nextCursor;

    // Persist progress after every page so runs are resumable.
    await persistState(db, {
      cursor,
      lastAnnouncedOn,
      status: cursor ? "in_progress" : "complete",
      stats: { pages, rounds, orgsFetched, mode: provider.mode },
    });

    log(
      `page ${pages}: +${page.rounds.length} rounds (${rounds} total), +${fetched.length} orgs`,
    );

    if (!cursor) break;
  }

  return {
    pages,
    rounds,
    orgsFetched,
    done: cursor === null,
    cursor,
    lastAnnouncedOn,
    durationMs: Date.now() - started,
  };
}

async function persistState(
  db: Database,
  data: {
    cursor: string | null;
    lastAnnouncedOn: string | null;
    status: string;
    stats: Record<string, unknown>;
  },
): Promise<void> {
  await db
    .insert(syncState)
    .values({
      id: SYNC_ID,
      cursorUuid: data.cursor,
      lastAnnouncedOn: data.lastAnnouncedOn,
      lastRunAt: new Date(),
      status: data.status,
      stats: data.stats,
    })
    .onConflictDoUpdate({
      target: syncState.id,
      set: {
        cursorUuid: sql`excluded.cursor_uuid`,
        lastAnnouncedOn: sql`excluded.last_announced_on`,
        lastRunAt: sql`excluded.last_run_at`,
        status: sql`excluded.status`,
        stats: sql`excluded.stats`,
      },
    });
}
