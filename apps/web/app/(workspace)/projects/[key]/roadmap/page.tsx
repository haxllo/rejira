import { notFound } from 'next/navigation';
import { ViewHeader } from '@/components/views/view-header';
import { RoadmapTimeline } from '@/components/views/roadmap-timeline';
import { getProjectByKey, getCycles } from '@/lib/db/rsc';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectRoadmapPage({ params }: PageProps) {
  const { key } = await params;
  const project = await getProjectByKey(key.toUpperCase());
  if (!project) return notFound();

  const cycles = await getCycles({ projectId: project.id });

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`${project.name} · Roadmap`}
        description={`${cycles.length} cycles planned`}
        count={cycles.length}
      />
      <div className="flex-1 overflow-y-auto">
        <RoadmapTimeline cycles={cycles} />
      </div>
    </div>
  );
}
