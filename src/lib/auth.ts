import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv, type Env } from "@/lib/env";

export const ACCESS_COOKIE = "cf_access";

/**
 * Lightweight password gate for record-level (raw deal) views. Required by the
 * Crunchbase license, which forbids redistributing raw data to third parties.
 *
 * If APP_ACCESS_PASSWORD is unset, raw views are open (suitable for private/dev
 * deployments). When set, a signed cookie is required.
 */
export function accessToken(env: Env = getEnv()): string | null {
  if (!env.APP_ACCESS_PASSWORD) return null;
  const secret = env.AUTH_SECRET || "capital-flows-dev-secret";
  return createHmac("sha256", secret).update(env.APP_ACCESS_PASSWORD).digest("hex");
}

/** Whether raw-data access is gated at all. */
export function isGated(env: Env = getEnv()): boolean {
  return Boolean(env.APP_ACCESS_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Validate a submitted password against the configured one. */
export function checkPassword(password: string, env: Env = getEnv()): boolean {
  if (!env.APP_ACCESS_PASSWORD) return true;
  return safeEqual(password, env.APP_ACCESS_PASSWORD);
}

/** Server-side authorization check for the current request's cookies. */
export async function isAuthorized(env: Env = getEnv()): Promise<boolean> {
  const expected = accessToken(env);
  if (!expected) return true; // not gated
  const store = await cookies();
  const tok = store.get(ACCESS_COOKIE)?.value;
  return Boolean(tok && safeEqual(tok, expected));
}
