import { getDb } from "@/lib/db";
import { getOverview } from "@/lib/metrics/queries";
import { filterFromRequest, jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const filter = filterFromRequest(request);
    return jsonOk(await getOverview(db, filter));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
