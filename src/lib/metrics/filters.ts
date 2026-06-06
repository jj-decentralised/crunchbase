import { z } from "zod";
import { ATTRIBUTION_METHODS } from "@/lib/config";

/**
 * Shared filter contract for every metrics query. Parsed from URL search params
 * so dashboard state is fully shareable.
 */
export const GRAINS = ["month", "quarter", "year"] as const;
export type Grain = (typeof GRAINS)[number];

export const MetricsFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grain: z.enum(GRAINS).default("quarter"),
  categoryGroupIds: z.array(z.string()).default([]),
  stageBuckets: z.array(z.string()).default([]),
  countryCodes: z.array(z.string()).default([]),
  minRoundSizeUsd: z.number().int().nonnegative().nullable().default(null),
  maxRoundSizeUsd: z.number().int().nonnegative().nullable().default(null),
  attributionMethod: z.enum(ATTRIBUTION_METHODS).default("each"),
});

export type MetricsFilter = z.infer<typeof MetricsFilterSchema>;

export const DEFAULT_FILTER: MetricsFilter = MetricsFilterSchema.parse({});

/** Parse a filter from URLSearchParams (comma-separated lists). */
export function parseFilterFromParams(
  params: URLSearchParams,
): MetricsFilter {
  const list = (key: string): string[] => {
    const v = params.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  };
  const num = (key: string): number | null => {
    const v = params.get(key);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return MetricsFilterSchema.parse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    grain: params.get("grain") ?? undefined,
    categoryGroupIds: list("groups"),
    stageBuckets: list("stages"),
    countryCodes: list("countries"),
    minRoundSizeUsd: num("min"),
    maxRoundSizeUsd: num("max"),
    attributionMethod: params.get("attr") ?? undefined,
  });
}

/** Parse a filter from a Next.js page `searchParams` object. */
export function parseFilterFromObject(
  obj: Record<string, string | string[] | undefined>,
): MetricsFilter {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    params.set(k, Array.isArray(v) ? v.join(",") : v);
  }
  return parseFilterFromParams(params);
}

/** Serialize a filter to a query string (omitting defaults for clean URLs). */
export function filterToSearchParams(filter: MetricsFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (filter.from) p.set("from", filter.from);
  if (filter.to) p.set("to", filter.to);
  if (filter.grain !== DEFAULT_FILTER.grain) p.set("grain", filter.grain);
  if (filter.categoryGroupIds.length) p.set("groups", filter.categoryGroupIds.join(","));
  if (filter.stageBuckets.length) p.set("stages", filter.stageBuckets.join(","));
  if (filter.countryCodes.length) p.set("countries", filter.countryCodes.join(","));
  if (filter.minRoundSizeUsd != null) p.set("min", String(filter.minRoundSizeUsd));
  if (filter.maxRoundSizeUsd != null) p.set("max", String(filter.maxRoundSizeUsd));
  if (filter.attributionMethod !== DEFAULT_FILTER.attributionMethod)
    p.set("attr", filter.attributionMethod);
  return p;
}
