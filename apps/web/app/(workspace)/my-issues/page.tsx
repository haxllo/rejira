import { ViewHeader } from '@/components/views/view-header';
import { GroupedList, type Group } from '@/components/views/grouped-list';
import { InboxIcon } from '@/components/icons';
import { getIssuesForActiveWorkspace } from '@/lib/db/rsc';
import { requireAuth } from '@/lib/auth/require-auth';
import { getStatusLabel } from '@/components/primitives/status';
import type { Issue, StatusKey } from '@/lib/db/types';

const STATUS_ORDER: StatusKey[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done'];

export default async function MyIssuesPage() {
  const user = await requireAuth();
  const meExternalId = user.id;
  const issues = await getIssuesForActiveWorkspace({ assigneeId: meExternalId, limit: 500 });

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
        title="My Issues"
        description={`${sorted.length} open issues assigned to ${user.name ?? meExternalId}`}
        count={sorted.length}
      />
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <GroupedList groups={displayGroups} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <InboxIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">All clear</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">No issues assigned to you — go celebrate.</p>
    </div>
  );
}

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
