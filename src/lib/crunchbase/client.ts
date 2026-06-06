import {
  CbSearchResponseSchema,
  CbAutocompleteResponseSchema,
  CbEntityLookupSchema,
  type CbSearchResponse,
  type CbAutocompleteResponse,
} from "./types";
import { RateLimiter } from "./rate-limiter";

export interface CrunchbaseClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Shared rate limiter; one is created if omitted. */
  rateLimiter?: RateLimiter;
  /** Max retry attempts on 429/5xx/network errors. */
  maxRetries?: number;
  /** Base backoff in ms (exponential). */
  backoffBaseMs?: number;
  /** Sleep fn (tests). */
  sleep?: (ms: number) => Promise<void>;
}

export class CrunchbaseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "CrunchbaseApiError";
  }
}

interface SearchBody {
  field_ids: readonly string[];
  query: unknown[];
  order?: { field_id: string; sort: "asc" | "desc" }[];
  limit?: number;
  after_id?: string;
  before_id?: string;
}

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class CrunchbaseClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: RateLimiter;
  private readonly maxRetries: number;
  private readonly backoffBaseMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: CrunchbaseClientOptions) {
    if (!opts.apiKey) throw new Error("CrunchbaseClient requires an apiKey");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.crunchbase.com/v4/data").replace(
      /\/$/,
      "",
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.limiter =
      opts.rateLimiter ??
      new RateLimiter({ capacity: 20, refillPerMinute: 180 });
    this.maxRetries = opts.maxRetries ?? 4;
    this.backoffBaseMs = opts.backoffBaseMs ?? 500;
    this.sleep = opts.sleep ?? realSleep;
  }

  private async request(
    path: string,
    init: RequestInit & { method: string },
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    let attempt = 0;
    for (;;) {
      await this.limiter.acquire();
      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-cb-user-key": this.apiKey,
            ...(init.headers ?? {}),
          },
        });
      } catch (err) {
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoffBaseMs * 2 ** attempt);
          attempt++;
          continue;
        }
        throw new CrunchbaseApiError(
          `Network error calling ${path}: ${(err as Error).message}`,
          0,
        );
      }

      if (res.ok) {
        return res.json();
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : this.backoffBaseMs * 2 ** attempt;
        await this.sleep(waitMs);
        attempt++;
        continue;
      }

      const body = await res.text().catch(() => "");
      if (res.status === 426) {
        throw new CrunchbaseApiError(
          "Crunchbase requires HTTPS (426). Check CRUNCHBASE_BASE_URL.",
          426,
          body,
        );
      }
      throw new CrunchbaseApiError(
        `Crunchbase API ${res.status} for ${path}`,
        res.status,
        body,
      );
    }
  }

  /** POST /searches/{collection} */
  async searchEntities(
    collection: string,
    body: SearchBody,
  ): Promise<CbSearchResponse> {
    const json = await this.request(`/searches/${collection}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return CbSearchResponseSchema.parse(json);
  }

  /** GET /entities/{collection}/{id} */
  async getEntity(
    collection: string,
    id: string,
    fieldIds: readonly string[],
    cardIds: readonly string[] = [],
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (fieldIds.length) params.set("field_ids", fieldIds.join(","));
    if (cardIds.length) params.set("card_ids", cardIds.join(","));
    const qs = params.toString();
    const json = await this.request(
      `/entities/${collection}/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
    return CbEntityLookupSchema.parse(json);
  }

  /** GET /autocompletes */
  async autocomplete(
    query: string,
    collectionIds: string[],
    limit = 25,
  ): Promise<CbAutocompleteResponse> {
    const params = new URLSearchParams({
      query,
      collection_ids: collectionIds.join(","),
      limit: String(limit),
    });
    const json = await this.request(`/autocompletes?${params.toString()}`, {
      method: "GET",
    });
    return CbAutocompleteResponseSchema.parse(json);
  }
}
