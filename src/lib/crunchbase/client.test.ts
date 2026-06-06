import { describe, it, expect, vi } from "vitest";
import { CrunchbaseClient, CrunchbaseApiError } from "./client";
import { RateLimiter } from "./rate-limiter";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function makeClient(fetchImpl: typeof fetch) {
  return new CrunchbaseClient({
    apiKey: "test-key",
    fetchImpl,
    // No real waiting in tests.
    rateLimiter: new RateLimiter({ capacity: 1000, refillPerMinute: 1e9 }),
    sleep: async () => {},
    backoffBaseMs: 1,
  });
}

describe("CrunchbaseClient", () => {
  it("sends the API key header and parses a search response", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)["X-cb-user-key"]).toBe("test-key");
      expect(init?.method).toBe("POST");
      return jsonResponse({ count: 1, entities: [{ uuid: "rd-1", properties: { a: 1 } }] });
    }) as unknown as typeof fetch;

    const client = makeClient(fetchImpl);
    const res = await client.searchEntities("funding_rounds", {
      field_ids: ["identifier"],
      query: [],
      limit: 1,
    });
    expect(res.entities).toHaveLength(1);
    expect(res.entities[0].uuid).toBe("rd-1");
  });

  it("retries on 429 then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) return jsonResponse({ error: "rate" }, 429, { "retry-after": "0" });
      return jsonResponse({ entities: [] });
    }) as unknown as typeof fetch;

    const client = makeClient(fetchImpl);
    const res = await client.autocomplete("ai", ["categories"]);
    expect(calls).toBe(2);
    expect(res.entities).toEqual([]);
  });

  it("retries on 500 up to maxRetries then throws", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "boom" }, 500)) as unknown as typeof fetch;
    const client = new CrunchbaseClient({
      apiKey: "k",
      fetchImpl,
      rateLimiter: new RateLimiter({ capacity: 1000, refillPerMinute: 1e9 }),
      sleep: async () => {},
      maxRetries: 2,
      backoffBaseMs: 1,
    });
    await expect(
      client.searchEntities("organizations", { field_ids: ["identifier"], query: [] }),
    ).rejects.toBeInstanceOf(CrunchbaseApiError);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3); // initial + 2 retries
  });

  it("throws a helpful error on 426 (HTTPS required)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 426)) as unknown as typeof fetch;
    const client = makeClient(fetchImpl);
    await expect(
      client.searchEntities("funding_rounds", { field_ids: ["identifier"], query: [] }),
    ).rejects.toThrow(/HTTPS/);
  });
});
