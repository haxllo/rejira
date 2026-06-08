import { getStatusLabel } from '@/components/primitives/status';
import { dateWithYear } from '@/lib/utils/date';
import type { Cycle } from '@/lib/db/types';

interface Props {
  cycles: Cycle[];
}

export function RoadmapTimeline({ cycles }: Props) {
  if (cycles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-[12.5px] text-[var(--color-text-faint)]">
        No cycles yet
      </div>
    );
  }

  const sorted = [...cycles].sort((a, b) => {
    const aStart = a.startsAt?.getTime() ?? 0;
    const bStart = b.startsAt?.getTime() ?? 0;
    return aStart - bStart;
  });

  const minStart = sorted.reduce((min, c) => {
    const t = c.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return Math.min(min, t);
  }, Number.MAX_SAFE_INTEGER);
  const maxEnd = sorted.reduce((max, c) => {
    const t = c.endsAt?.getTime() ?? 0;
    return Math.max(max, t);
  }, 0);
  const total = Math.max(1, maxEnd - minStart);

  return (
    <div className="flex flex-col gap-3 p-6">
      {sorted.map((c) => {
        const start = c.startsAt?.getTime() ?? minStart;
        const end = c.endsAt?.getTime() ?? start;
        const left = ((start - minStart) / total) * 100;
        const width = Math.max(8, ((end - start) / total) * 100);
        return (
          <div
            key={c.externalId}
            className="flex items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3"
          >
            <div className="flex w-40 shrink-0 flex-col">
              <span className="text-[12.5px] font-medium text-[var(--color-text)]">Cycle {c.number}</span>
              <span className="text-[10.5px] text-[var(--color-text-faint)]">{c.name}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between text-[10.5px] text-[var(--color-text-faint)]">
                <span>{c.startsAt ? dateWithYear(c.startsAt) : '—'}</span>
                <span>{c.endsAt ? dateWithYear(c.endsAt) : '—'}</span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="absolute inset-y-0 rounded-full bg-[var(--color-accent)]"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
            <div className="flex w-40 shrink-0 flex-col items-end">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                {getStatusLabel(c.status)}
              </span>
              <span className="mt-0.5 text-[10.5px] text-[var(--color-text-faint)] line-clamp-1">{c.goal ?? ''}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
