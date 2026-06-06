import { getDb } from "@/lib/db";
import { purgeAll } from "@/lib/ingest/purge";
import { isAuthorized } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!(await isAuthorized())) return jsonError("Unauthorized", 401);
    const db = await getDb();
    await purgeAll(db);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
