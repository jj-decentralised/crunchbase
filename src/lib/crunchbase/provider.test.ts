import { describe, it, expect, vi } from "vitest";
import { MockProvider, LiveProvider } from "./provider";
import { generateMockDataset } from "./mock-data";
import { CrunchbaseClient } from "./client";
import { RateLimiter } from "./rate-limiter";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("MockProvider", () => {
  const data = generateMockDataset({ seed: 5 });
  const provider = new MockProvider(data);

  it("paginates through all rounds with no gaps or duplicates", async () => {
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await provider.fetchFundingRounds({ limit: 250, afterId: cursor });
      for (const r of page.rounds) {
        expect(seen.has(r.uuid)).toBe(false);
        seen.add(r.uuid);
      }
      cursor = page.nextCursor;
      pages++;
      expect(pages).toBeLessThan(1000);
    } while (cursor);
    expect(seen.size).toBe(data.rounds.length);
  });

  it("filters by announcedOnGte", async () => {
    const page = await provider.fetchFundingRounds({
      announcedOnGte: "2022",
      limit: 1000,
    });
    expect(page.rounds.every((r) => r.announcedOn >= "2022-01-01")).toBe(true);
    expect(page.rounds.length).toBeGreaterThan(0);
  });

  it("filters by category group", async () => {
    const page = await provider.fetchFundingRounds({
      categoryGroupIds: ["fintech"],
      limit: 1000,
    });
    expect(page.rounds.length).toBeGreaterThan(0);
    expect(
      page.rounds.every((r) => (r.orgCategoryGroupIds ?? []).includes("fintech")),
    ).toBe(true);
  });

  it("resolves organizations by id", async () => {
    const ids = data.organizations.slice(0, 3).map((o) => o.uuid);
    const orgs = await provider.fetchOrganizations(ids);
    expect(orgs.map((o) => o.uuid)).toEqual(ids);
  });
});

describe("LiveProvider.detectCapabilities", () => {
  function clientReturning(handler: (path: string) => Response) {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = typeof url === "string" ? url : url.toString();
      return handler(u);
    }) as unknown as typeof fetch;
    return new CrunchbaseClient({
      apiKey: "k",
      fetchImpl,
      rateLimiter: new RateLimiter({ capacity: 1000, refillPerMinute: 1e9 }),
      sleep: async () => {},
    });
  }

  it("classifies a Full API key when funding_rounds search works", async () => {
    const client = clientReturning((path) => {
      if (path.includes("/searches/funding_rounds")) {
        return jsonResponse({
          entities: [
            {
              uuid: "rd-1",
              properties: {
                announced_on: "2023-01-01",
                funded_organization_categories: [{ permalink: "ai" }],
              },
            },
          ],
        });
      }
      return jsonResponse({ entities: [] });
    });
    const caps = await new LiveProvider(client).detectCapabilities();
    expect(caps.tier).toBe("full");
    expect(caps.fundingRoundsSearch).toBe(true);
    expect(caps.fundingRoundOrgCategories).toBe(true);
  });

  it("classifies a Basic key when only organizations search works", async () => {
    const client = clientReturning((path) => {
      if (path.includes("/searches/funding_rounds")) return jsonResponse({}, 403);
      if (path.includes("/searches/organizations")) return jsonResponse({ entities: [] });
      return jsonResponse({}, 404);
    });
    const caps = await new LiveProvider(client).detectCapabilities();
    expect(caps.tier).toBe("basic");
    expect(caps.fundingRoundsSearch).toBe(false);
    expect(caps.organizationsSearch).toBe(true);
  });

  it("classifies unknown when nothing is accessible", async () => {
    const client = clientReturning(() => jsonResponse({}, 403));
    const caps = await new LiveProvider(client).detectCapabilities();
    expect(caps.tier).toBe("unknown");
  });
});
