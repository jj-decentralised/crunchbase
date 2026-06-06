import { getDb } from "@/lib/db";
import { getScope, setScope } from "@/lib/scope-store";
import { ScopeSchema } from "@/lib/config";
import { isAuthorized } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    return jsonOk(await getScope(db));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthorized())) return jsonError("Unauthorized", 401);
    const body = await request.json();
    const scope = ScopeSchema.parse(body);
    const db = await getDb();
    return jsonOk(await setScope(db, scope));
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}
