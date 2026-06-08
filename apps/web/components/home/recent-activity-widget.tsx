import { ClockIcon, CheckIcon, MessageSquareIcon, TagIcon, FlagIcon, SparklesIcon, BookmarkIcon } from '@/components/icons';
import { Avatar } from '@/components/primitives/avatar';
import { relativeTime } from '@/lib/utils/date';
import type { ActivityWithActor } from '@/lib/db/rsc';

interface Props {
  activities: ActivityWithActor[];
}

function verbLabel(verb: string): string {
  switch (verb) {
    case 'created':
      return 'created';
    case 'updated':
      return 'updated';
    case 'deleted':
      return 'deleted';
    case 'archived':
      return 'archived';
    case 'restored':
      return 'restored';
    case 'assigned':
      return 'assigned';
    case 'unassigned':
      return 'unassigned';
    case 'commented':
      return 'commented on';
    case 'status_changed':
      return 'changed status of';
    case 'priority_changed':
      return 'changed priority of';
    default:
      return verb;
  }
}

function VerbIcon({ verb }: { verb: string }) {
  switch (verb) {
    case 'created':
      return <CheckIcon size={11} className="text-[var(--color-success)]" />;
    case 'updated':
      return <SparklesIcon size={11} className="text-[var(--color-text-faint)]" />;
    case 'deleted':
      return <ClockIcon size={11} className="text-[var(--color-danger)]" />;
    case 'archived':
      return <BookmarkIcon size={11} className="text-[var(--color-text-faint)]" />;
    case 'restored':
      return <SparklesIcon size={11} className="text-[var(--color-text-faint)]" />;
    case 'assigned':
      return <FlagIcon size={11} className="text-[var(--color-accent)]" />;
    case 'unassigned':
      return <FlagIcon size={11} className="text-[var(--color-text-faint)]" />;
    case 'commented':
      return <MessageSquareIcon size={11} className="text-[var(--color-text-faint)]" />;
    case 'status_changed':
      return <TagIcon size={11} className="text-[var(--color-accent)]" />;
    case 'priority_changed':
      return <FlagIcon size={11} className="text-[var(--color-text-faint)]" />;
    default:
      return <ClockIcon size={11} className="text-[var(--color-text-faint)]" />;
  }
}

export function RecentActivityWidget({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="rounded border border-dashed border-[var(--color-border)] p-6 text-center text-[12px] text-[var(--color-text-faint)]">
        No recent activity
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {activities.map((a) => {
        const actorName = a.actorName ?? 'Someone';
        const actorColor = a.actorAvatarColor ?? 'var(--color-text-faint)';
        const objectLabel = a.objectType ? a.objectType.replace(/s$/, '') : 'item';
        return (
          <li key={a.id} className="flex items-center gap-2 text-[12px]">
            <Avatar name={actorName} size="xs" />
            <span className="font-medium text-[var(--color-text)]">{actorName}</span>
            <span className="text-[var(--color-text-faint)]">{verbLabel(a.verb)}</span>
            <span className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-text-muted)]">
              <VerbIcon verb={a.verb} />
              {objectLabel}
            </span>
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: actorColor }}
              aria-hidden
            />
            <span className="ml-auto text-[10.5px] text-[var(--color-text-faint)]">{relativeTime(a.createdAt.toISOString())}</span>
          </li>
        );
      })}
    </ul>
  );
}
