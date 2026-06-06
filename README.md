# Capital Flows

A venture-capital research hub that turns a Crunchbase API key into an
interactive, shareable view of **how investment dollars flow across categories
over time**. Built for founders and VCs. Deployable on Vercel.

> **Powered by Crunchbase.** Aggregated analytics are public; record-level
> (raw deal) data is access-controlled and never redistributed, per the
> Crunchbase data license.

---

## What it does

- **Overview** — capital deployed, round counts, average round size, active
  categories, a stacked capital-over-time trend, stage mix, and category momentum.
- **Capital Flows** — the hero view: a streamgraph / stacked / share-of-total
  trend with a time brush, a **stage → category Sankey**, and a clickable
  category-share treemap.
- **Categories** — a ranked grid and per-category deep dives (trend, stage and
  geography splits, top deals).
- **Compare** — overlay 2+ categories, absolute dollars or share-of-set.
- **Deals** — gated, paginated, sortable funding rounds with CSV export.
- **Settings** — data status, admin-triggered sync, research-universe scope, and
  a license-compliant data purge.

Every view is **URL-synced** (filters live in the query string) so any analysis
is a shareable link. There's a ⌘K command palette, light/dark themes, and a data
freshness indicator.

---

## Architecture

```
Vercel Cron ──▶ /api/sync ──▶ CrunchbaseClient (rate-limited, retrying)
                    │                │
                    ▼                ▼
              Postgres (Drizzle)  capability detection
                    │
       SQL aggregation over a denormalized fact table
                    │
   Next.js (App Router) server components ─▶ Recharts client islands
```

- **No server-side aggregation in the Crunchbase API** + a 200 calls/min limit
  means we ingest a scoped slice into our own Postgres and aggregate there.
- The live key is only ever touched by the **ingestion** layer; all UI reads hit
  Postgres (fast, license-friendly aggregates).
- A denormalized `round_category_groups` fact table makes every attribution
  method (`each` / `fractional` / `primary`) a single-table `GROUP BY`.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Drizzle ORM ·
Recharts 3 · Postgres (Neon in prod, in-process **PGlite** locally) · Zod.

---

## Data modes

| Mode | `CRUNCHBASE_MODE` | Data source | Use |
| --- | --- | --- | --- |
| Mock (default) | `mock` | deterministic synthetic dataset (~12 yrs) | dev, CI, demos — no key needed |
| Live | `live` | Crunchbase API via your key | production |

The app **auto-detects** your API tier. The `funding_rounds` search endpoint
needs a **Full API (Enterprise/Applications)** license; with only a Basic key the
app degrades to organization-level estimates and shows a banner.

---

## Local development (mock mode)

```bash
npm install
cp .env.example .env.local        # defaults are fine for mock mode
npm run db:migrate                # applies schema to local PGlite (./.pglite)
npm run db:seed                   # loads the synthetic dataset
npm run dev                       # http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck       # tsc --noEmit
npm run test            # vitest (unit + integration)
npm run lint            # eslint
npm run sync            # run ingestion to completion (resumable)
npm run sync -- --reset # re-ingest from scratch
npm run data:purge      # expunge all ingested data
npx tsx scripts/stats.ts# print row counts + a sample aggregation
```

---

## Going live with your Enterprise key + Postgres

1. **Provision Postgres** (e.g. [Neon](https://neon.tech)). Copy the pooled
   connection string.
2. Set environment variables (see `.env.example`):
   ```bash
   CRUNCHBASE_MODE=live
   CRUNCHBASE_API_KEY=<your Enterprise key>
   DATABASE_URL=postgres://user:pass@host/db?sslmode=require
   CRON_SECRET=<openssl rand -hex 32>
   APP_ACCESS_PASSWORD=<password gating raw deal rows>
   AUTH_SECRET=<openssl rand -hex 32>
   ```
3. Apply the schema and run an initial backfill:
   ```bash
   npm run db:migrate
   npm run sync           # walks history into the DB (resumable)
   ```
4. Tune the **research universe** in Settings (start year, min round size,
   categories, geographies). Defaults: from 2013, all categories, all
   geographies, USD-normalized.

---

## Deploying on Vercel

1. Import the repo into Vercel and attach a Postgres database (Neon integration
   sets `DATABASE_URL`).
2. Add the environment variables above in **Project → Settings → Environment
   Variables**.
3. `vercel.json` registers a daily cron that calls `/api/sync`. Vercel
   automatically sends `Authorization: Bearer $CRON_SECRET`, so set `CRON_SECRET`.
4. Run the first backfill by triggering `/api/sync` a few times (Settings →
   *Sync now* once logged in, or `curl` with the cron secret).

### Public deployments & the license

- **Aggregated analytics can be public.** Set `APP_ACCESS_PASSWORD` so that
  **record-level deal rows** (Deals page, category top-deals) require unlocking —
  the Crunchbase license forbids redistributing raw data to third parties.
- Attribution ("Powered by Crunchbase") is rendered on every data surface.
- `npm run data:purge` (or Settings → *Purge*) expunges all acquired data to
  satisfy the 10-day expungement requirement on termination.

---

## Attribution methodology (the double-counting problem)

Companies belong to multiple categories, so naively summing "$ by category"
overcounts. Capital Flows makes the method explicit and switchable:

- **Each** — full round amount counted for every category (sums can exceed 100%).
- **Fractional** — amount split evenly across categories (series reconcile to the
  true total).
- **Primary** — the whole round assigned to its primary category only.

KPI totals (capital deployed / rounds / average) are computed over **distinct
rounds** and are therefore attribution-independent.
