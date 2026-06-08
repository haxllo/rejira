import { notFound } from "next/navigation";
import { getProjectByKey, getActivitiesForObject } from "@/lib/db/rsc";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ViewHeader } from "@/components/views/view-header";

export const dynamic = "force-dynamic";

interface ProjectActivityPageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectActivityPage({ params }: ProjectActivityPageProps) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const activities = await getActivitiesForObject({
    objectType: "project",
    objectId: String(project.id),
    limit: 100,
  });

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`${project.name} · Activity`}
        description="Audit log of changes to this project and its issues."
        count={activities.length}
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
