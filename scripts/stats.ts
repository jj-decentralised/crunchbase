import "./_env";
import { getDbHandle, rowsOf } from "@/lib/db";
import { sql } from "drizzle-orm";

/** Prints row counts + a sample category-flow aggregation for quick sanity checks. */
async function main() {
  const { db, close } = await getDbHandle();
  const tables = [
    "category_groups",
    "categories",
    "organizations",
    "organization_categories",
    "funding_rounds",
    "round_category_groups",
  ];
  console.log("Row counts:");
  for (const t of tables) {
    const r = await db.execute(sql.raw(`select count(*)::int as n from ${t}`));
    const n = rowsOf<{ n: number }>(r)[0]?.n;
    console.log(`  ${t.padEnd(26)} ${n}`);
  }

  console.log("\nTop 8 category groups by total USD (attribution=each):");
  const res = await db.execute(
    sql.raw(`
    select cg.name, sum(rcg.money_raised_usd)::bigint as total, count(*)::int as rounds
    from round_category_groups rcg
    join category_groups cg on cg.id = rcg.category_group_id
    group by cg.name
    order by total desc
    limit 8
  `),
  );
  for (const row of rowsOf<{ name: string; total: number; rounds: number }>(res)) {
    const b = (Number(row.total) / 1e9).toFixed(1);
    console.log(`  ${String(row.name).padEnd(28)} $${b}B  (${row.rounds} rounds)`);
  }

  await close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
