import { notFound } from 'next/navigation';
import { ViewHeader } from '@/components/views/view-header';
import { CycleBoard } from '@/components/views/cycle-board';
import { getProjectByKey, getCycles, getIssuesForActiveWorkspace } from '@/lib/db/rsc';
import { dateWithYear } from '@/lib/utils/date';
import { CircleCheckIcon, TrendingUpIcon } from '@/components/icons';
import type { Issue } from '@/lib/db/types';

interface PageProps {
  params: Promise<{ key: string; id: string }>;
}

export default async function CyclePage({ params }: PageProps) {
  const { key, id } = await params;
  const project = await getProjectByKey(key.toUpperCase());
  if (!project) return notFound();

  const cycles = await getCycles({ projectId: project.id });
  const cycleIdNum = Number(id);
  const cycle = cycles.find((c) => String(c.id) === id || c.id === cycleIdNum);
  if (!cycle) return notFound();

  const issues = await getIssuesForActiveWorkspace({ cycleId: cycle.id, limit: 500 });

  const totalPoints = issues.reduce((acc: number, i: Issue) => acc + (i.estimatePoints ?? 0), 0);
  const donePoints = issues
    .filter((i) => i.status === 'done')
    .reduce((acc, i) => acc + (i.estimatePoints ?? 0), 0);
  const doneCount = issues.filter((i) => i.status === 'done').length;
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const velocity = 42;

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`Cycle ${cycle.number} — ${cycle.goal ?? cycle.name}`}
        description={`${cycle.startsAt ? dateWithYear(cycle.startsAt) : '—'} → ${cycle.endsAt ? dateWithYear(cycle.endsAt) : '—'} · ${issues.length} issues · ${totalPoints} pts`}
        count={issues.length}
        primary={
          <div className="flex items-center gap-3">
            <ProgressBar pct={progressPct} />
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <CircleCheckIcon size={11} className="text-[var(--color-status-done)]" />
                {doneCount}/{issues.length}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <TrendingUpIcon size={11} className="text-[var(--color-accent)]" />
                Velocity {velocity}
              </span>
            </div>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <CycleBoard issues={issues} cycles={cycles} onOpen={(i: Issue) => {
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('open-issue', { detail: i.externalId });
            window.dispatchEvent(event);
          }
        }} />
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11.5px] font-medium text-[var(--color-text)]">{pct}%</span>
    </div>
  );
}
