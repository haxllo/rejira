import { getRecentActivities } from "@/lib/db/rsc";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ViewHeader } from "@/components/views/view-header";

export const dynamic = "force-dynamic";

interface WorkspaceActivityPageProps {
  searchParams: Promise<{ limit?: string }>;
}

export default async function WorkspaceActivityPage({ searchParams }: WorkspaceActivityPageProps) {
  const { limit } = await searchParams;
  const pageLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  const activities = await getRecentActivities({ limit: pageLimit });

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Activity"
        description="Recent changes across your workspace."
        count={activities.length}
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
