import { getDb } from "@/lib/db";
import { getSankey } from "@/lib/metrics/queries";
import { filterFromRequest, jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    return jsonOk(await getSankey(db, filterFromRequest(request)));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
