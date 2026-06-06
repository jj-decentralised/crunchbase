import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only native deps (pg, pglite) out of the client/edge bundles.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
