import { getDb } from "@/lib/db";
import { getTimeseries } from "@/lib/metrics/queries";
import { filterFromRequest, jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const filter = filterFromRequest(request);
    const topN = Number(new URL(request.url).searchParams.get("top") ?? "8") || 8;
    return jsonOk(await getTimeseries(db, filter, topN));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
