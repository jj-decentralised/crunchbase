import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only native deps (pg, pglite) out of the client/edge bundles.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Ensure PGlite's WASM/data files are bundled into the serverless functions
  // (needed for the zero-config in-memory demo on Vercel).
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@electric-sql/pglite/dist/*.wasm",
      "./node_modules/@electric-sql/pglite/dist/*.data",
    ],
  },
};

export default nextConfig;
