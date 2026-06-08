'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarIcon } from '@/components/icons';
import { Avatar, AvatarGroup } from '@/components/primitives/avatar';
import { StatusDot } from '@/components/primitives/status';
import { PriorityIcon } from '@/components/primitives/priority';
import { LabelChip } from '@/components/primitives/label';
import { lookupUser, type UserView } from '@/lib/state/users';
import { lookupLabel, type LabelView } from '@/lib/state/labels';
import { shortDate, dueIsOverdue } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { useUI } from '@/lib/state/ui';
import type { Issue } from '@/lib/db/types';

type Props = {
  issue: Issue;
  index: number;
  onOpen: (issue: Issue, el: HTMLElement) => void;
  assigneeIds?: Array<string | number | bigint>;
};

export function IssueRow({ issue, index, onOpen, assigneeIds }: Props) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const selected = useUI((s) => s.selectedIssueIds.has(issue.externalId));
  const open = useUI((s) => s.drawerIssueId === issue.externalId);
  const isDraggingAny = useUI((s) => s.dragging !== null);

  const assignees: UserView[] = React.useMemo(() => {
    const ids: Array<string | number | bigint> =
      assigneeIds ?? (issue.assigneeIds as unknown as Array<string | number | bigint>) ?? [];
    return ids
      .map((id) => lookupUser(id))
      .filter((u): u is UserView => Boolean(u));
  }, [assigneeIds, issue.assigneeIds]);

  const labels: LabelView[] = React.useMemo(() => {
    const ids = (issue.labelIds as unknown as Array<string | number | bigint>) ?? [];
    return ids
      .map((id) => lookupLabel(id))
      .filter((l): l is LabelView => Boolean(l));
  }, [issue.labelIds]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.externalId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={(el) => {
        setNodeRef(el);
        (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      layout
      data-issue-id={issue.externalId}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: isDraggingAny ? 0 : Math.min(index * 0.012, 0.18) }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          useUI.getState().toggleSelected(issue.externalId, { anchor: true });
          return;
        }
        if (e.shiftKey) {
          e.preventDefault();
          const anchor = useUI.getState().selectionAnchorId ?? issue.externalId;
          const allIds = collectVisibleIds();
          useUI.getState().selectRange(anchor, issue.externalId, allIds);
          return;
        }
        onOpen(issue, e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(issue, e.currentTarget);
        }
      }}
      className={cn(
        "group relative grid cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-4 text-[length:var(--row-font)] outline-none",
        "transition-colors duration-[var(--duration-micro)]",
        "hover:bg-[var(--color-surface-1)]",
        "focus-visible:bg-[var(--color-surface-1)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-border-focus)]",
        open && "bg-[var(--color-surface-1)]",
        selected && "bg-[var(--color-accent-soft)]",
        isDragging && "z-10",
      )}
      style={{
        ...style,
        height: "var(--row-h)",
        paddingLeft: "var(--pad-x)",
        paddingRight: "var(--pad-x)",
        gridTemplateColumns: "auto 14px minmax(0, 1fr) 160px auto 80px 70px",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          useUI.getState().toggleSelected(issue.externalId, { anchor: true });
        }}
        className={cn(
          "grid size-4 place-items-center rounded-[4px] border border-[var(--color-border-strong)] transition-all",
          "hover:border-[var(--color-text-muted)]",
          selected && "border-[var(--color-accent)] bg-[var(--color-accent)]",
        )}
        aria-label={selected ? "Deselect issue" : "Select issue"}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5 5 9 9.5 3.5" stroke="oklch(0.16 0.005 250)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <StatusDot status={issue.status} size={8} />

      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[var(--color-text-faint)]">
          {issue.key}
        </span>
        <span className="min-w-0 truncate text-[var(--color-text)]">{issue.title}</span>
      </div>

      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {labels.slice(0, 2).map((l) => (
          <span key={l.id} className="shrink-0"><LabelChip name={l.name} size="sm" /></span>
        ))}
        {labels.length > 2 && (
          <span className="shrink-0 text-[10px] text-[var(--color-text-faint)]">+{labels.length - 2}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        <PriorityIcon priority={issue.priority} size={12} />
        <span className="capitalize">{issue.priority === "none" ? "—" : issue.priority}</span>
      </div>

      <div className="flex items-center justify-end">
        {assignees.length === 0 ? (
          <span className="text-[var(--color-text-faint)]">Unassigned</span>
        ) : assignees.length === 1 ? (
          <Avatar name={assignees[0]!.name} size="sm" />
        ) : (
          <AvatarGroup names={assignees.map((a) => a.name)} size="sm" max={3} />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] text-[var(--color-text-muted)]">
        {issue.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5",
              dueIsOverdue(issue.dueDate.toISOString())
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-text-muted)]",
            )}
          >
            <CalendarIcon size={10} />
            {shortDate(issue.dueDate.toISOString())}
          </span>
        ) : (
          <span className="text-[var(--color-text-faint)]">—</span>
        )}
      </div>
    </motion.div>
  );
}

function collectVisibleIds(): string[] {
  if (typeof document === "undefined") return [];
  const root = document.querySelector("[data-list-root]") as HTMLElement | null;
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>("[data-issue-id]");
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const n of Array.from(nodes)) {
    const id = n.dataset.issueId;
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
