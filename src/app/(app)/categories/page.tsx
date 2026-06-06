import { getDb } from "@/lib/db";
import { parseFilterFromObject } from "@/lib/metrics/filters";
import { getTreemap } from "@/lib/metrics/queries";
import { CategoryGrid } from "@/components/categories/category-grid";
import { Attribution } from "@/components/shell/attribution";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CategoriesPage(props: PageProps<"/categories">) {
  const filter = parseFilterFromObject(await props.searchParams);
  const db = await getDb();
  const nodes = await getTreemap(db, filter);

  if (!nodes.length) return <EmptyState />;

  return (
    <div className="space-y-4">
      <CategoryGrid nodes={nodes.filter((n) => n.total > 0)} />
      <Attribution />
    </div>
  );
}
