"use client";

import * as React from "react";
import { PriorityIcon } from "@/components/primitives/priority";
import { Avatar } from "@/components/primitives/avatar";
import { LabelChip } from "@/components/primitives/label";
import { userById, labelById, type Issue } from "@/lib/mock";
import { dueLabel, dueIsOverdue } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

/**
 * Floating preview shown in the drag layer for board cards.
 * This is the board equivalent of `DragRowOverlay` — a lifted copy of the
 * card with the same chrome (key, title, labels, priority, due, assignee).
 */
export function BoardDragOverlay({ issue }: { issue: Issue }) {
  const labels = issue.labelIds
    .map((id) => labelById(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const assignee = issue.assigneeIds[0] ? userById(issue.assigneeIds[0]) : null;
  return (
    <div
      className="w-[264px] rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-[var(--card-pad)] text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start gap-1.5">
        <span className="font-mono text-[10px] text-[var(--color-text-faint)]">{issue.key}</span>
        <PriorityIcon priority={issue.priority} size={10} className="mt-0.5" />
      </div>
      <p className="mt-1 line-clamp-2 text-[12.5px] font-medium leading-[1.35] text-[var(--color-text)]">
        {issue.title}
      </p>
      {labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} name={l.name} size="sm" />
          ))}
          {labels.length > 3 && (
            <span className="text-[10px] text-[var(--color-text-faint)]">+{labels.length - 3}</span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        {issue.dueDate && (
          <span
            className={cn(
              "text-[10.5px]",
              dueIsOverdue(issue.dueDate) ? "text-[var(--color-danger)]" : "text-[var(--color-text-faint)]",
            )}
          >
            {dueLabel(issue.dueDate)}
          </span>
        )}
        {assignee && <Avatar name={assignee.name} size="xs" />}
      </div>
    </div>
  );
}
