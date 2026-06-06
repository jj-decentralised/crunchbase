import { describe, it, expect } from "vitest";
import { accessToken, checkPassword, isGated } from "./auth";
import type { Env } from "./env";

const base = {
  NODE_ENV: "test",
  CRUNCHBASE_MODE: "mock",
  CRUNCHBASE_BASE_URL: "https://api.crunchbase.com/v4/data",
  PGLITE_PATH: ".pglite",
  NEXT_PUBLIC_APP_NAME: "Capital Flows",
} as unknown as Env;

describe("auth helpers", () => {
  it("is not gated when no password configured", () => {
    expect(isGated(base)).toBe(false);
    expect(accessToken(base)).toBeNull();
    // Without a password, any password is accepted (open access).
    expect(checkPassword("anything", base)).toBe(true);
  });

  it("gates and validates when a password is configured", () => {
    const env = { ...base, APP_ACCESS_PASSWORD: "s3cret", AUTH_SECRET: "k" } as Env;
    expect(isGated(env)).toBe(true);
    expect(checkPassword("s3cret", env)).toBe(true);
    expect(checkPassword("wrong", env)).toBe(false);
  });

  it("produces a stable, secret-dependent token", () => {
    const env1 = { ...base, APP_ACCESS_PASSWORD: "p", AUTH_SECRET: "a" } as Env;
    const env2 = { ...base, APP_ACCESS_PASSWORD: "p", AUTH_SECRET: "b" } as Env;
    const t1 = accessToken(env1);
    expect(t1).toBeTruthy();
    expect(t1).toBe(accessToken(env1)); // stable
    expect(t1).not.toBe(accessToken(env2)); // secret-dependent
  });
});
