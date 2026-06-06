import { getDb } from "@/lib/db";
import { parseFilterFromObject } from "@/lib/metrics/filters";
import { getCategoryDetail } from "@/lib/metrics/queries";
import { isAuthorized } from "@/lib/auth";
import { CategoryDetailView } from "@/components/categories/category-detail-view";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CategoryDetailPage(
  props: PageProps<"/categories/[id]">,
) {
  const { id } = await props.params;
  const filter = parseFilterFromObject(await props.searchParams);
  const db = await getDb();
  const [detail, canViewDeals] = await Promise.all([
    getCategoryDetail(db, filter, id),
    isAuthorized(),
  ]);

  if (!detail.rounds) {
    return (
      <EmptyState
        title="No activity"
        message="This category has no funding rounds for the current filters. Try widening the date range or clearing filters."
      />
    );
  }

  return (
    <CategoryDetailView detail={detail} grain={filter.grain} canViewDeals={canViewDeals} />
  );
}
