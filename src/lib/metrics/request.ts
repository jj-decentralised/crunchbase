import { NextResponse } from "next/server";
import { parseFilterFromParams, type MetricsFilter } from "./filters";

/** Build a MetricsFilter from a request URL's search params. */
export function filterFromRequest(request: Request): MetricsFilter {
  const url = new URL(request.url);
  return parseFilterFromParams(url.searchParams);
}

export function jsonOk(data: unknown): NextResponse {
  return NextResponse.json(data);
}

export function jsonError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
