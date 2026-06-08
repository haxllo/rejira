import * as React from 'react';
import { notFound } from 'next/navigation';
import { ViewHeader } from '@/components/views/view-header';
import { Avatar } from '@/components/primitives/avatar';
import { StatusDot } from '@/components/primitives/status';
import { PriorityIcon } from '@/components/primitives/priority';
import { getProjectByKey, getIssuesForActiveWorkspace, getCycles, getMemberships, getUsers } from '@/lib/db/rsc';
import { getStatusLabel } from '@/components/primitives/status';
import { relativeTime, dateWithYear } from '@/lib/utils/date';
import { RowsIcon, KanbanIconCustom, GanttIcon, UsersIconCustom } from '@/components/icons';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ProjectLandingPage({ params }: PageProps) {
  const { key } = await params;
  const project = await getProjectByKey(key.toUpperCase());
  if (!project) return notFound();

  const [openIssues, recentIssues, cycles, memberships, users] = await Promise.all([
    getIssuesForActiveWorkspace({ projectId: project.id, status: 'todo', limit: 100 }),
    getIssuesForActiveWorkspace({ projectId: project.id, limit: 6 }),
    getCycles({ projectId: project.id }),
    getMemberships(),
    getUsers(),
  ]);

  const open = openIssues.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
  const totalPts = open.reduce((acc, i) => acc + (i.estimatePoints ?? 0), 0);
  const userByExternal = new Map(users.map((u) => [u.externalId, u]));
  const members = memberships
    .map((m) => {
      const user = userByExternal.get(m.userId);
      if (!user) return null;
      return {
        id: String(user.id),
        name: user.name,
        avatarColor: user.avatarColor,
        status: user.status,
      };
    })
    .filter((m): m is { id: string; name: string; avatarColor: string | null; status: string | null } => m !== null);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={
          <span className="flex items-center gap-2">
            <span
              className="grid size-6 place-items-center rounded text-[12px] font-bold text-[oklch(0.16_0.005_250)]"
              style={{ background: project.iconColor ?? 'var(--color-accent)' }}
            >
              {(project.iconLetter ?? project.name.slice(0, 1)).toUpperCase()}
            </span>
            {project.name}
          </span>
        }
        description={project.description ?? undefined}
        count={open.length}
        primary={
          <div className="flex h-7 items-center gap-1.5">
            <NavLink href={`/projects/${project.key.toLowerCase()}/issues`} icon={<RowsIcon size={12} />} label="Issues" />
            <NavLink href={`/projects/${project.key.toLowerCase()}/cycles`} icon={<KanbanIconCustom size={12} />} label="Cycles" />
            <NavLink href={`/projects/${project.key.toLowerCase()}/roadmap`} icon={<GanttIcon size={12} />} label="Roadmap" />
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto p-6">
        <Stat label="Open issues" value={open.length} sub={`${totalPts} pts total`} />
        <Stat label="Total issues" value={recentIssues.length} sub="in this project" />
        <Stat label="Team" value={members.length} sub={`${members.filter((m) => m.status === 'online').length} online`} />

        <Card title="Active cycles" className="col-span-2">
          {cycles.length === 0 ? (
            <Empty>No cycles yet</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {cycles.map((c) => (
                <li key={c.externalId}>
                  <a
                    href={`/projects/${project.key.toLowerCase()}/cycles/${c.id}`}
                    className="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 hover:border-[var(--color-border-strong)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[12.5px] font-medium text-[var(--color-text)]">Cycle {c.number} — {c.goal ?? c.name}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                          {c.startsAt ? dateWithYear(c.startsAt) : '—'} → {c.endsAt ? dateWithYear(c.endsAt) : '—'} · {c.status}
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Members">
          <ul className="space-y-1.5">
            {members.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-center gap-2 text-[12px]">
                <Avatar name={u.name} size="sm" />
                <span className="flex-1 text-[var(--color-text-muted)]">{u.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-faint)]">
            <span className="flex items-center gap-1.5">
              <UsersIconCustom size={11} />
              {members.length} members
            </span>
            <span className="text-[var(--color-text-muted)]">+ Invite</span>
          </div>
        </Card>

        <Card title="Recent issues" className="col-span-2">
          {recentIssues.length === 0 ? (
            <Empty>Nothing here yet</Empty>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentIssues.map((i) => (
                <li key={i.externalId} className="py-2">
                  <div className="flex w-full items-center gap-3 text-left">
                    <StatusDot status={i.status} size={7} />
                    <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                    <span className="flex-1 truncate text-[12.5px] text-[var(--color-text-muted)]">{i.title}</span>
                    <PriorityIcon priority={i.priority} size={10} />
                    <span className="text-[10.5px] text-[var(--color-text-faint)]">{relativeTime(i.updatedAt.toISOString())}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status breakdown">
          <ul className="space-y-1.5">
            {(['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const).map((s) => {
              const n = recentIssues.filter((i) => i.status === s).length;
              const pct = recentIssues.length ? (n / recentIssues.length) * 100 : 0;
              return (
                <li key={s} className="flex items-center gap-2 text-[12px]">
                  <StatusDot status={s} size={6} />
                  <span className="w-20 text-[var(--color-text-muted)]">{getStatusLabel(s)}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: `var(--color-status-${s.replace('_', '-')})` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[10.5px] text-[var(--color-text-faint)]">{n}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold text-[var(--color-text)]">{value}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">{sub}</div>
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4", className)}>
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[11.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
    >
      {icon}
      {label}
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-[var(--color-border)] p-6 text-center text-[12px] text-[var(--color-text-faint)]">{children}</div>;
}
