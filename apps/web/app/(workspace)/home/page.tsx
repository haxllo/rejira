import { ViewHeader } from '@/components/views/view-header';
import { GroupedList, type Group } from '@/components/views/grouped-list';
import { RecentActivityWidget } from '@/components/home/recent-activity-widget';
import { TrendingUpIcon, ArrowUpRightIcon, ClockIcon, SparklesIcon } from '@/components/icons';
import { getIssuesForActiveWorkspace, getRecentActivities, getProjects } from '@/lib/db/rsc';
import { requireAuth } from '@/lib/auth/require-auth';
import { getStatusLabel } from '@/components/primitives/status';
import type { Issue, StatusKey } from '@/lib/db/types';

const STATUS_ORDER: StatusKey[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done'];

export default async function HomePage() {
  const user = await requireAuth();
  const meExternalId = user.id;
  const [myIssues, recentActivity, projects] = await Promise.all([
    getIssuesForActiveWorkspace({ assigneeId: meExternalId, limit: 20 }),
    getRecentActivities({ limit: 10 }),
    getProjects(),
  ]);

  const open = myIssues.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
  const upcoming = [...myIssues]
    .filter((i) => i.dueDate && i.status !== 'done' && i.status !== 'cancelled')
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5);
  const recent = [...myIssues]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`Welcome back, ${user.name ?? meExternalId}`}
        description="Here's your snapshot for today."
      />
      <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-6">
        <Card title="My open issues" icon={<ClockIcon size={12} />} value={open.length}>
          {open.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-[var(--color-text-faint)]">
              No issues assigned to you
            </div>
          ) : (
            <ul className="space-y-1.5">
              {open.slice(0, 5).map((i) => (
                <li key={i.externalId} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                  <span className="flex-1 truncate text-[var(--color-text-muted)]">{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Up next" icon={<TrendingUpIcon size={12} />}>
          {upcoming.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-[var(--color-text-faint)]">
              Nothing due soon
            </div>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((i) => (
                <li key={i.externalId} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                  <span className="flex-1 truncate text-[var(--color-text-muted)]">{i.title}</span>
                  <span className="text-[10.5px] text-[var(--color-text-faint)]">
                    {i.dueDate ? formatDate(i.dueDate) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity" icon={<SparklesIcon size={12} />}>
          <RecentActivityWidget activities={recentActivity} />
        </Card>
        <Card title="Active projects" icon={<ArrowUpRightIcon size={12} />}>
          {projects.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-[var(--color-text-faint)]">
              No projects yet
            </div>
          ) : (
            <ul className="space-y-1.5">
              {projects.slice(0, 6).map((p) => (
                <li key={p.externalId} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                    style={{ background: p.iconColor ?? 'var(--color-accent)' }}
                  >
                    {(p.iconLetter ?? p.name.slice(0, 1)).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-[var(--color-text-muted)]">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  value,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  value?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-[var(--color-text-faint)]">{icon}</span>
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{title}</h3>
        {value != null && <span className="ml-auto font-mono text-[10.5px] text-[var(--color-text-faint)]">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function formatDate(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${month}-${day}`;
}
