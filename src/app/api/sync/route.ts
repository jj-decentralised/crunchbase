import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { createProvider } from "@/lib/crunchbase/provider";
import { getScope } from "@/lib/scope-store";
import { runSync } from "@/lib/ingest/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ingestion endpoint. Triggered by Vercel Cron (GET with
 * `Authorization: Bearer $CRON_SECRET`) or manually (POST). Does a bounded
 * amount of work per invocation and persists a resumable cursor.
 */
async function handle(request: Request): Promise<NextResponse> {
  const env = getEnv();

  // Auth: require CRON_SECRET in production; allow open access only in dev.
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    const alt = request.headers.get("x-cron-secret");
    const ok = auth === `Bearer ${env.CRON_SECRET}` || alt === env.CRON_SECRET;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const reset = url.searchParams.get("reset") === "1";
  const maxPages = Number(url.searchParams.get("pages") ?? "10") || 10;

  try {
    const db = await getDb();
    const provider = createProvider(env);
    const scope = await getScope(db);
    const result = await runSync({ db, provider, scope, maxPages, reset });
    return NextResponse.json({ ok: true, mode: provider.mode, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
