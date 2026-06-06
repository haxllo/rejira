"use client";

import * as React from "react";
import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Link2Icon,
  PaperclipIcon,
  MessageSquareIcon,
  GitPullRequestIcon,
  CalendarIcon,
} from "@/components/icons";
import { Avatar, AvatarGroup } from "@/components/primitives/avatar";
import { StatusDot } from "@/components/primitives/status";
import { PriorityIcon } from "@/components/primitives/priority";
import { LabelChip } from "@/components/primitives/label";
import { USERS, labelById } from "@/lib/mock";
import type { Issue } from "@/lib/mock";
import { shortDate, dueLabel, dueIsOverdue } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/state/ui";

type Props = {
  issue: Issue;
  index: number;
  onOpen: (issue: Issue, el: HTMLElement) => void;
};

export function IssueRow({ issue, index, onOpen }: Props) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const selected = useUI((s) => s.selectedIssueIds.has(issue.id));
  const open = useUI((s) => s.drawerIssueId === issue.id);
  const isDraggingAny = useUI((s) => s.dragging !== null);
  const assignees = issue.assigneeIds
    .map((id) => USERS.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const labels = issue.labelIds
    .map((id) => labelById(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
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
      data-issue-id={issue.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: isDraggingAny ? 0 : Math.min(index * 0.012, 0.18) }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          useUI.getState().toggleSelected(issue.id, { anchor: true });
          return;
        }
        if (e.shiftKey) {
          e.preventDefault();
          const anchor = useUI.getState().selectionAnchorId ?? issue.id;
          const allIds = collectVisibleIds();
          useUI.getState().selectRange(anchor, issue.id, allIds);
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
        issue.pending && "pending-pulse",
        isDragging && "z-10",
      )}
      style={{
        ...style,
        height: "var(--row-h)",
        paddingLeft: "var(--pad-x)",
        paddingRight: "var(--pad-x)",
        gridTemplateColumns: "auto 14px minmax(0, 1fr) 160px auto 80px 70px 56px 28px 28px 28px",
      }}
    >
      {/* Checkbox (acts as a 16px hot zone) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          useUI.getState().toggleSelected(issue.id, { anchor: true });
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

      {/* Status */}
      <StatusDot status={issue.status} size={8} />

      {/* Title + key */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[var(--color-text-faint)]">
          {issue.key}
        </span>
        <span className="min-w-0 truncate text-[var(--color-text)]">{issue.title}</span>
      </div>

      {/* Labels */}
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {labels.slice(0, 2).map((l) => (
          <span key={l.id} className="shrink-0"><LabelChip name={l.name} size="sm" /></span>
        ))}
        {labels.length > 2 && (
          <span className="shrink-0 text-[10px] text-[var(--color-text-faint)]">+{labels.length - 2}</span>
        )}
      </div>

      {/* Sub-issues / blocked-by summary (empty cell reserved) */}
      <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--color-text-faint)]">
        {issue.subIssueIds.length > 0 && (
          <span className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[var(--color-text-muted)]">
            <Link2Icon size={10} />
            {issue.subIssueIds.length}
          </span>
        )}
        {issue.blockedBy.length > 0 && (
          <span className="flex items-center gap-1 rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-1.5 py-0.5 text-[var(--color-danger)]">
            ⊘ {issue.blockedBy.length}
          </span>
        )}
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        <PriorityIcon priority={issue.priority} size={12} />
        <span className="capitalize">{issue.priority === "none" ? "—" : issue.priority}</span>
      </div>

      {/* Assignees */}
      <div className="flex items-center justify-end">
        {assignees.length === 0 ? (
          <span className="text-[var(--color-text-faint)]">Unassigned</span>
        ) : assignees.length === 1 ? (
          <Avatar name={assignees[0]!.name} size="sm" />
        ) : (
          <AvatarGroup names={assignees.map((a) => a.name)} size="sm" max={3} />
        )}
      </div>

      {/* Due date + relative updated (combined) */}
      <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] text-[var(--color-text-muted)]">
        {issue.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5",
              dueIsOverdue(issue.dueDate)
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-text-muted)]",
            )}
          >
            <CalendarIcon size={10} />
            {shortDate(issue.dueDate)}
          </span>
        ) : (
          <span className="text-[var(--color-text-faint)]">—</span>
        )}
      </div>

      {/* PR badge */}
      <div className="flex items-center justify-center">
        {issue.pr && (
          <span
            className="flex items-center gap-1 text-[10px] text-[var(--color-text-faint)]"
            title={`PR #${issue.pr.number} ${issue.pr.status}`}
          >
            <GitPullRequestIcon size={11} />
          </span>
        )}
      </div>

      {/* Comments */}
      <div className="flex items-center justify-center text-[10px] text-[var(--color-text-faint)]">
        {issue.attachmentCount > 0 && <PaperclipIcon size={11} />}
      </div>

      {/* Comments indicator (always-on, even if 0) */}
      <div className="flex items-center justify-center text-[10px] text-[var(--color-text-faint)]">
        <MessageSquareIcon size={11} />
      </div>
    </motion.div>
  );
}

/** Walk up from any row to the closest list root and read every visible issue id in DOM order. */
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
