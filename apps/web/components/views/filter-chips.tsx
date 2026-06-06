"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon, FilterIcon } from "@/components/icons";
import { USERS, labelById, userById, type StatusKey, type PriorityKey, type LabelId, type UserId } from "@/lib/mock";
import {
  type FilterState,
  type DueFilter,
  type GroupBy,
  type SortKey,
  type SortDir,
} from "@/lib/state/view-query";
import { getStatusLabel } from "@/components/primitives/status";
import { getPriorityLabel } from "@/components/primitives/priority";
import { cn } from "@/lib/utils";

export interface Filter {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export function FilterChips({
  filters,
  onClear,
}: {
  filters: Filter[];
  onClear: () => void;
}) {
  if (filters.length === 0) {
    return (
      <div className="flex items-center gap-2 px-6 py-2.5 text-[12px] text-[var(--color-text-faint)]">
        <FilterIcon size={11} />
        <span>No filters · All issues</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-6 py-2.5">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Filters</span>
      <AnimatePresence initial={false} mode="popLayout">
        {filters.map((f) => (
          <motion.button
            key={f.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={f.onRemove}
            className={cn(
              "flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] pl-2 pr-1 text-[11px] text-[var(--color-text-muted)]",
              "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
            )}
          >
            {f.icon && <span className="text-[var(--color-text-faint)]">{f.icon}</span>}
            <span>
              {f.label}: <span className="text-[var(--color-text)]">{f.value}</span>
            </span>
            <span className="grid size-4 place-items-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-hover)]">
              <XIcon size={9} />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
      <button
        onClick={onClear}
        className="ml-1 text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
      >
        Clear all
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FilterChipsFromState                                                      */
/* -------------------------------------------------------------------------- */

/** Map a `StatusKey` token to a human label. Re-exported locally. */
function statusLabel(k: StatusKey): string {
  return getStatusLabel(k);
}

/** Build the chip list from a `FilterState` and a single `remove` callback. */
export function buildFilterChips(
  filter: FilterState,
  onRemove: (next: FilterState) => void,
  extras?: {
    group?: GroupBy;
    onClearGroup?: () => void;
    sortKey?: SortKey;
    sortDir?: SortDir;
    onClearSort?: () => void;
  },
): Filter[] {
  const out: Filter[] = [];

  for (const s of filter.status) {
    out.push({
      id: `status:${s}`,
      label: "Status",
      value: statusLabel(s),
      onRemove: () => onRemove({ ...filter, status: filter.status.filter((x) => x !== s) }),
    });
  }
  for (const a of filter.assignee) {
    const isMe = a === "me";
    const user = isMe ? USERS.find((u) => u.id === "__me__") : userById(a as UserId);
    out.push({
      id: `assignee:${a}`,
      label: "Assignee",
      value: isMe ? "Me" : user?.name ?? a,
      onRemove: () => onRemove({ ...filter, assignee: filter.assignee.filter((x) => x !== a) }),
    });
  }
  for (const l of filter.label) {
    const isNone = l === "none";
    const label = isNone ? null : labelById(l as LabelId);
    out.push({
      id: `label:${l}`,
      label: "Label",
      value: isNone ? "No label" : label?.name ?? l,
      onRemove: () => onRemove({ ...filter, label: filter.label.filter((x) => x !== l) }),
    });
  }
  for (const p of filter.priority) {
    out.push({
      id: `priority:${p}`,
      label: "Priority",
      value: getPriorityLabel(p as PriorityKey),
      onRemove: () => onRemove({ ...filter, priority: filter.priority.filter((x) => x !== p) }),
    });
  }
  for (const d of filter.due) {
    out.push({
      id: `due:${d}`,
      label: "Due",
      value: dueLabel(d),
      onRemove: () => onRemove({ ...filter, due: filter.due.filter((x) => x !== d) }),
    });
  }
  if (filter.search.trim()) {
    out.push({
      id: `search`,
      label: "Search",
      value: `“${filter.search.trim()}”`,
      onRemove: () => onRemove({ ...filter, search: "" }),
    });
  }
  if (extras?.group && extras.group !== "none") {
    out.push({
      id: `group:${extras.group}`,
      label: "Group",
      value: extras.group,
      onRemove: extras.onClearGroup ?? (() => {}),
    });
  }
  if (extras?.sortKey && (extras.sortKey !== "updated" || extras.sortDir !== "desc")) {
    out.push({
      id: `sort:${extras.sortKey}:${extras.sortDir}`,
      label: "Sort",
      value: `${extras.sortKey} ${extras.sortDir}`,
      onRemove: extras.onClearSort ?? (() => {}),
    });
  }
  return out;
}

function dueLabel(d: DueFilter): string {
  switch (d) {
    case "overdue":
      return "Overdue";
    case "this_week":
      return "This week";
    case "next_week":
      return "Next week";
    case "none":
      return "No due date";
    case "any":
      return "Any date";
    default:
      return d;
  }
}

/** Convenience wrapper that wires `FilterChips` to a `FilterState`. */
export function FilterChipsFromState({
  filter,
  onChange,
  group,
  onClearGroup,
  sortKey,
  sortDir,
  onClearSort,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  group?: GroupBy;
  onClearGroup?: () => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onClearSort?: () => void;
}) {
  const chips = buildFilterChips(filter, onChange, {
    group,
    onClearGroup,
    sortKey,
    sortDir,
    onClearSort,
  });
  return (
    <FilterChips
      filters={chips}
      onClear={() => {
        onChange({ status: [], assignee: [], label: [], priority: [], due: [], search: "", archived: false });
        onClearGroup?.();
        onClearSort?.();
      }}
    />
  );
}
