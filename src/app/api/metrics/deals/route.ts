import { getDb } from "@/lib/db";
import { countDeals, getDeals } from "@/lib/metrics/queries";
import { filterFromRequest, jsonOk, jsonError } from "@/lib/metrics/request";
import { isAuthorized, isGated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Raw, record-level deal rows. Auth-gated because the Crunchbase license
 * forbids redistributing raw data to third parties.
 */
export async function GET(request: Request) {
  try {
    if (!(await isAuthorized())) {
      return jsonError("Unauthorized — record-level data requires access.", 401);
    }
    const db = await getDb();
    const filter = filterFromRequest(request);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);
    const sort = url.searchParams.get("sort") === "date" ? "date" : "money";

    const [rows, total] = await Promise.all([
      getDeals(db, filter, { limit, offset, sort }),
      countDeals(db, filter),
    ]);
    return jsonOk({ rows, total, limit, offset, gated: isGated() });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
