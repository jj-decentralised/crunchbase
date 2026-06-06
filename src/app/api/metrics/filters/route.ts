import { getDb } from "@/lib/db";
import { getFiltersMeta } from "@/lib/metrics/queries";
import { jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    return jsonOk(await getFiltersMeta(db));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
