import { getDb } from "@/lib/db";
import { getCategoryDetail } from "@/lib/metrics/queries";
import { filterFromRequest, jsonOk, jsonError } from "@/lib/metrics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/metrics/category/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const db = await getDb();
    return jsonOk(await getCategoryDetail(db, filterFromRequest(request), id));
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
