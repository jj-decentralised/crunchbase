"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  filterToSearchParams,
  parseFilterFromParams,
  type MetricsFilter,
} from "@/lib/metrics/filters";

/**
 * Reads the current MetricsFilter from the URL and provides updaters that write
 * it back, keeping every view shareable via its URL.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(
    () => parseFilterFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const apply = useCallback(
    (next: MetricsFilter) => {
      const params = filterToSearchParams(next);
      // Preserve non-filter params already present (none today, future-proof).
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const update = useCallback(
    (patch: Partial<MetricsFilter>) => apply({ ...filter, ...patch }),
    [apply, filter],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [
    pathname,
    router,
  ]);

  /** Build an href for another page that carries the current filters. */
  const hrefWithFilters = useCallback(
    (path: string) => {
      const qs = filterToSearchParams(filter).toString();
      return qs ? `${path}?${qs}` : path;
    },
    [filter],
  );

  return { filter, update, apply, reset, hrefWithFilters, searchParams };
}
