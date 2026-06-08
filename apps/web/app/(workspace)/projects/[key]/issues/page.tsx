import { notFound } from 'next/navigation';
import { ViewHeader, type ViewAs } from '@/components/views/view-header';
import { GroupedList, type Group } from '@/components/views/grouped-list';
import { CycleBoard } from '@/components/views/cycle-board';
import { GanttIcon } from '@/components/icons';
import { getProjectByKey, getIssuesForActiveWorkspace } from '@/lib/db/rsc';
import { getStatusLabel } from '@/components/primitives/status';
import type { Issue, StatusKey } from '@/lib/db/types';

const STATUS_ORDER: StatusKey[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done'];

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectIssuesPage({ params }: PageProps) {
  const { key } = await params;
  const project = await getProjectByKey(key.toUpperCase());
  if (!project) return notFound();

  const issues = await getIssuesForActiveWorkspace({ projectId: project.id, limit: 500 });
  const sorted = sortIssues(issues);
  const displayGroups: Group[] = STATUS_ORDER.map((s) => {
    const list = sorted.filter((i) => i.status === s);
    return {
      id: s,
      label: getStatusLabel(s),
      count: list.length,
      color: `var(--color-status-${s.replace('_', '-')})`,
      issues: list,
    };
  }).filter((g) => g.issues.length > 0);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={project.name}
        description={`${sorted.length} issues · ${displayGroups.reduce((acc, g) => acc + g.count, 0)} grouped by status`}
        count={sorted.length}
      />
      <div className="flex-1 overflow-y-auto">
        {displayGroups.length === 0 ? (
          <div className="flex h-full items-center justify-center p-12 text-center text-[12.5px] text-[var(--color-text-faint)]">
            No issues yet
          </div>
        ) : (
          <GroupedList groups={displayGroups} />
        )}
      </div>
    </div>
  );
}

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
