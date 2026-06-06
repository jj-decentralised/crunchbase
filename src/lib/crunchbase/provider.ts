import { getEnv, isMock, type Env } from "@/lib/env";
import { CrunchbaseClient, CrunchbaseApiError } from "./client";
import { FUNDING_ROUND_FIELDS, ORGANIZATION_FIELDS } from "./fields";
import { mapFundingRound, mapOrganization } from "./live-mappers";
import { getDefaultMockDataset, type MockDataset } from "./mock-data";
import type {
  Capabilities,
  Category,
  CategoryGroup,
  FundingRound,
  FundingRoundPage,
  FundingRoundQuery,
  Organization,
} from "./types";

/**
 * Provider abstraction. Ingestion + capability checks depend only on this
 * interface, so swapping mock <-> live is transparent to the rest of the app.
 */
export interface DataProvider {
  readonly mode: "mock" | "live";
  detectCapabilities(): Promise<Capabilities>;
  getCategoryTaxonomy(): Promise<{
    groups: CategoryGroup[];
    categories: Category[];
  }>;
  fetchFundingRounds(query: FundingRoundQuery): Promise<FundingRoundPage>;
  fetchOrganizations(ids: string[]): Promise<Organization[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock provider
// ─────────────────────────────────────────────────────────────────────────────

export class MockProvider implements DataProvider {
  readonly mode = "mock" as const;
  private readonly data: MockDataset;
  private readonly orgByUuid: Map<string, Organization>;

  constructor(data: MockDataset = getDefaultMockDataset()) {
    this.data = data;
    this.orgByUuid = new Map(data.organizations.map((o) => [o.uuid, o]));
  }

  async detectCapabilities(): Promise<Capabilities> {
    return {
      tier: "mock",
      fundingRoundsSearch: true,
      organizationsSearch: true,
      fundingRoundOrgCategories: true,
      checkedAt: new Date().toISOString(),
      message: "Using synthetic mock dataset (no Crunchbase key required).",
    };
  }

  async getCategoryTaxonomy() {
    return { groups: this.data.categoryGroups, categories: this.data.categories };
  }

  async fetchFundingRounds(query: FundingRoundQuery): Promise<FundingRoundPage> {
    const limit = Math.min(query.limit ?? 100, 1000);
    let rounds = this.data.rounds;

    if (query.announcedOnGte) {
      const gte = normalizeDateBound(query.announcedOnGte);
      rounds = rounds.filter((r) => r.announcedOn >= gte);
    }
    if (query.minMoneyRaisedUsd != null) {
      rounds = rounds.filter(
        (r) => (r.moneyRaisedUsd ?? 0) >= query.minMoneyRaisedUsd!,
      );
    }
    if (query.categoryGroupIds?.length) {
      const set = new Set(query.categoryGroupIds);
      rounds = rounds.filter((r) =>
        (r.orgCategoryGroupIds ?? []).some((g) => set.has(g)),
      );
    }
    if (query.countryCodes?.length) {
      const set = new Set(query.countryCodes);
      rounds = rounds.filter((r) => {
        const org = this.orgByUuid.get(r.orgUuid);
        return org?.countryCode ? set.has(org.countryCode) : false;
      });
    }

    // Keyset pagination on the (already chronologically sorted) list.
    let startIdx = 0;
    if (query.afterId) {
      const idx = rounds.findIndex((r) => r.uuid === query.afterId);
      startIdx = idx >= 0 ? idx + 1 : 0;
    }
    const page = rounds.slice(startIdx, startIdx + limit);
    const nextCursor =
      page.length === limit && startIdx + limit < rounds.length
        ? page[page.length - 1].uuid
        : null;
    return { rounds: page, nextCursor };
  }

  async fetchOrganizations(ids: string[]): Promise<Organization[]> {
    return ids
      .map((id) => this.orgByUuid.get(id))
      .filter((o): o is Organization => Boolean(o));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live provider
// ─────────────────────────────────────────────────────────────────────────────

export class LiveProvider implements DataProvider {
  readonly mode = "live" as const;
  private readonly client: CrunchbaseClient;
  private capabilities: Capabilities | null = null;

  constructor(client: CrunchbaseClient) {
    this.client = client;
  }

  async detectCapabilities(): Promise<Capabilities> {
    if (this.capabilities) return this.capabilities;

    let fundingRoundsSearch = false;
    let organizationsSearch = false;
    let fundingRoundOrgCategories = false;

    try {
      const res = await this.client.searchEntities("funding_rounds", {
        field_ids: FUNDING_ROUND_FIELDS,
        query: [],
        limit: 1,
      });
      fundingRoundsSearch = true;
      const first = res.entities[0]?.properties ?? {};
      fundingRoundOrgCategories =
        "funded_organization_categories" in first &&
        Array.isArray(first["funded_organization_categories"]);
    } catch (err) {
      if (!(err instanceof CrunchbaseApiError)) throw err;
    }

    try {
      await this.client.searchEntities("organizations", {
        field_ids: ["identifier"],
        query: [],
        limit: 1,
      });
      organizationsSearch = true;
    } catch (err) {
      if (!(err instanceof CrunchbaseApiError)) throw err;
    }

    const tier = fundingRoundsSearch
      ? "full"
      : organizationsSearch
        ? "basic"
        : "unknown";
    const message =
      tier === "full"
        ? "Full API access detected — round-level time series available."
        : tier === "basic"
          ? "Basic API only: organization endpoints work but funding_rounds search is unavailable. Showing organization-level estimates."
          : "Could not access Crunchbase search endpoints. Check your API key/tier.";

    this.capabilities = {
      tier,
      fundingRoundsSearch,
      organizationsSearch,
      fundingRoundOrgCategories,
      checkedAt: new Date().toISOString(),
      message,
    };
    return this.capabilities;
  }

  async getCategoryTaxonomy() {
    // Best-effort: many licenses expose categories/category_groups collections.
    const groups: CategoryGroup[] = [];
    const categories: Category[] = [];
    try {
      const res = await this.client.searchEntities("category_groups", {
        field_ids: ["identifier"],
        query: [],
        limit: 1000,
      });
      for (const e of res.entities) {
        const id = (e.properties["identifier"] as { permalink?: string; value?: string }) ?? {};
        groups.push({ id: id.permalink ?? e.uuid, name: id.value ?? e.uuid });
      }
    } catch {
      // Taxonomy will instead accumulate from organization enrichment.
    }
    return { groups, categories };
  }

  async fetchFundingRounds(query: FundingRoundQuery): Promise<FundingRoundPage> {
    const predicates: unknown[] = [];
    if (query.announcedOnGte) {
      predicates.push({
        type: "predicate",
        field_id: "announced_on",
        operator_id: "gte",
        values: [query.announcedOnGte],
      });
    }
    if (query.minMoneyRaisedUsd != null) {
      predicates.push({
        type: "predicate",
        field_id: "money_raised",
        operator_id: "gte",
        values: [{ value: query.minMoneyRaisedUsd, currency: "usd" }],
      });
    }
    if (query.countryCodes?.length) {
      predicates.push({
        type: "predicate",
        field_id: "funded_organization_location",
        operator_id: "includes",
        values: query.countryCodes,
      });
    }

    const limit = Math.min(query.limit ?? 100, 1000);
    const body = {
      field_ids: FUNDING_ROUND_FIELDS,
      query: predicates,
      order: [{ field_id: "announced_on" as const, sort: "asc" as const }],
      limit,
      ...(query.afterId ? { after_id: query.afterId } : {}),
    };

    const res = await this.client.searchEntities("funding_rounds", body);
    const rounds: FundingRound[] = [];
    for (const e of res.entities) {
      const mapped = mapFundingRound(e.uuid, e.properties);
      if (mapped) rounds.push(mapped);
    }
    const nextCursor =
      res.entities.length === limit
        ? res.entities[res.entities.length - 1].uuid
        : null;
    return { rounds, nextCursor };
  }

  async fetchOrganizations(ids: string[]): Promise<Organization[]> {
    const out: Organization[] = [];
    for (const id of ids) {
      try {
        const entity = (await this.client.getEntity(
          "organizations",
          id,
          ORGANIZATION_FIELDS,
        )) as { properties?: Record<string, unknown> };
        out.push(mapOrganization(id, entity.properties ?? {}));
      } catch (err) {
        if (!(err instanceof CrunchbaseApiError)) throw err;
        // Skip orgs we can't resolve; ingestion continues.
      }
    }
    return out;
  }
}

/** Normalize a year ("2018") or ISO date to an ISO date string for comparison. */
function normalizeDateBound(bound: string): string {
  return /^\d{4}$/.test(bound) ? `${bound}-01-01` : bound;
}

/** Factory: build the configured provider from environment. */
export function createProvider(env: Env = getEnv()): DataProvider {
  if (isMock(env)) return new MockProvider();
  if (!env.CRUNCHBASE_API_KEY) {
    throw new Error(
      "CRUNCHBASE_MODE=live requires CRUNCHBASE_API_KEY to be set.",
    );
  }
  const client = new CrunchbaseClient({
    apiKey: env.CRUNCHBASE_API_KEY,
    baseUrl: env.CRUNCHBASE_BASE_URL,
  });
  return new LiveProvider(client);
}
