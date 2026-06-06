import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusKey =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; ringColor: string }
> = {
  backlog: { label: "Backlog", color: "var(--color-status-backlog)", ringColor: "var(--color-status-backlog)" },
  todo: { label: "Todo", color: "var(--color-status-todo)", ringColor: "var(--color-status-todo)" },
  in_progress: { label: "In Progress", color: "var(--color-status-progress)", ringColor: "var(--color-status-progress)" },
  in_review: { label: "In Review", color: "var(--color-status-review)", ringColor: "var(--color-status-review)" },
  done: { label: "Done", color: "var(--color-status-done)", ringColor: "var(--color-status-done)" },
  cancelled: { label: "Cancelled", color: "var(--color-status-cancel)", ringColor: "var(--color-status-cancel)" },
};

export function StatusDot({
  status,
  size = 8,
  className,
}: {
  status: StatusKey;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: STATUS_META[status].color,
        boxShadow: `0 0 0 2px oklch(1 0 0 / 0.08)`,
      }}
      aria-label={STATUS_META[status].label}
    />
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKey;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]",
        className,
      )}
    >
      <StatusDot status={status} size={6} />
      {STATUS_META[status].label}
    </span>
  );
}

export function getStatusLabel(s: StatusKey) {
  return STATUS_META[s].label;
}
