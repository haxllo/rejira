"use client";

import * as React from "react";
import { Avatar, AvatarGroup } from "@/components/primitives/avatar";
import { LabelChip } from "@/components/primitives/label";
import { PriorityIcon } from "@/components/primitives/priority";
import { USERS, labelById, type Issue } from "@/lib/mock";

/**
 * Floating preview shown in the drag layer while a row is being dragged.
 * For multi-row drags, the source rows collapse and the overlay shows a
 * stacked card with the head row + a "+ N more" badge.
 */
export function DragRowOverlay({
  issues,
  count,
}: {
  issues: Issue[];
  count?: number;
}) {
  const head = issues[0];
  if (!head) return null;
  const assignees = head.assigneeIds
    .map((id) => USERS.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const labels = head.labelIds
    .map((id) => labelById(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const total = count ?? issues.length;

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-[var(--color-accent)]/60 bg-[var(--color-surface-1)] px-3 py-1.5 text-[12.5px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      style={{ minWidth: 320 }}
    >
      <span className="grid size-4 place-items-center rounded-[4px] border border-[var(--color-accent)] bg-[var(--color-accent)]">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.5 5 9 9.5 3.5" stroke="oklch(0.16 0.005 250)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-mono text-[10.5px] tabular-nums text-[var(--color-text-faint)]">{head.key}</span>
      <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">{head.title}</span>
      {labels.slice(0, 2).map((l) => (
        <span key={l.id} className="shrink-0"><LabelChip name={l.name} size="sm" /></span>
      ))}
      <PriorityIcon priority={head.priority} size={11} className="text-[var(--color-text-muted)]" />
      {assignees.length > 0 && (
        assignees.length === 1 ? (
          <Avatar name={assignees[0]!.name} size="sm" />
        ) : (
          <AvatarGroup names={assignees.map((a) => a.name)} size="sm" max={2} />
        )
      )}
      {total > 1 && (
        <span className="ml-1 rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-medium text-[var(--color-text-inverse)]">
          +{total - 1}
        </span>
      )}
    </div>
  );
}
