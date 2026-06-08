import { notFound } from "next/navigation";
import { getSavedViews, getIssuesForActiveWorkspace } from "@/lib/db/rsc";
import { ViewRenderer } from "@/components/views/view-renderer";
import { SavedViewsHydrator } from "@/components/views/saved-views-hydrator";
import { requireAuth } from "@/lib/auth/require-auth";
import type { FilterState, GroupBy, SortKey, SortDir } from "@/lib/state/view-query";
import type { SavedView as ClientSavedView } from "@/lib/state/saved-views";

export const dynamic = "force-dynamic";

interface SavedViewPageProps {
  params: Promise<{ id: string }>;
}

function mapRowToClient(row: Awaited<ReturnType<typeof getSavedViews>>[number]): ClientSavedView {
  const f = (row.filter ?? {}) as Partial<FilterState>;
  return {
    id: row.externalId,
    name: row.name,
    filter: {
      status: (f.status as FilterState["status"]) ?? [],
      assignee: (f.assignee as FilterState["assignee"]) ?? [],
      label: (f.label as FilterState["label"]) ?? [],
      priority: (f.priority as FilterState["priority"]) ?? [],
      due: (f.due as FilterState["due"]) ?? [],
      search: f.search ?? "",
      archived: f.archived ?? false,
    },
    group: (row.groupBy as GroupBy) ?? "none",
    sortKey: (row.sortKey as SortKey) ?? "updated",
    sortDir: (row.sortDir as SortDir) ?? "desc",
    starred: row.starred,
    createdAt: row.createdAt.toISOString(),
  };
}

export default async function SavedViewPage({ params }: SavedViewPageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const views = await getSavedViews();
  const view = views.find((v) => v.externalId === id) ?? views.find((v) => String(v.id) === id);

  if (!view) notFound();

  const filterObj = (view.filter ?? {}) as {
    status?: string[];
    priority?: string[];
  };
  const statusFilter = (filterObj.status?.[0] ?? filterObj.priority?.[0]) as never;
  const issues = await getIssuesForActiveWorkspace({
    status: statusFilter,
    limit: 200,
  });

  const allViewsForStore = views.map(mapRowToClient);

  return (
    <>
      <SavedViewsHydrator initialViews={allViewsForStore} />
      <ViewRenderer view={view} issues={issues} currentUserId={user.id} />
    </>
  );
}
