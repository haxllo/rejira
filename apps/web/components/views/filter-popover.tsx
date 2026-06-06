"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon, PlusIcon, FilterIcon, SearchIcon } from "@/components/icons";
import { StatusDot, getStatusLabel } from "@/components/primitives/status";
import { PriorityIcon, getPriorityLabel } from "@/components/primitives/priority";
import { USERS, PROJECTS, LABELS, type StatusKey, type PriorityKey } from "@/lib/mock";
import { cn } from "@/lib/utils";
import type { FilterState, GroupBy, SortKey, SortDir, DueFilter } from "@/lib/state/view-query";

type Field = "status" | "assignee" | "label" | "priority" | "due" | "search";

const FIELD_LABELS: Record<Field, string> = {
  status: "Status",
  assignee: "Assignee",
  label: "Label",
  priority: "Priority",
  due: "Due date",
  search: "Search",
};

const DUE_OPTIONS: Array<{ value: DueFilter; label: string }> = [
  { value: "overdue", label: "Overdue" },
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "none", label: "No due date" },
  { value: "any", label: "Has due date" },
];

const VALID_STATUS: StatusKey[] = ["backlog", "todo", "in_progress", "in_review", "done"];
const VALID_PRIORITY: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];

export function FilterPopover({
  filter,
  setFilter,
  group,
  setGroup,
  sortKey,
  sortDir,
  setSort,
  viewName,
}: {
  filter: FilterState;
  setFilter: (updater: (prev: FilterState) => FilterState) => void;
  group: GroupBy;
  setGroup: (g: GroupBy) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (k: SortKey, d?: SortDir) => void;
  viewName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [section, setSection] = React.useState<Field | "group" | "sort">("status");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
      >
        <FilterIcon size={10} />
        Filter
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute right-0 top-full mt-1.5 z-50 flex w-[640px] max-w-[90vw] overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-[var(--shadow-popover)]"
          >
            {/* Left: field list */}
            <div className="w-44 shrink-0 border-r border-[var(--color-border)] p-2">
              {(["status", "assignee", "label", "priority", "due", "search", "group", "sort"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSection(f)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
                    section === f && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                  )}
                >
                  <span>{f === "group" ? "Group by" : f === "sort" ? "Sort" : FIELD_LABELS[f]}</span>
                </button>
              ))}
            </div>

            {/* Right: section content */}
            <div className="flex-1 p-3">
              {section === "status" && (
                <ChipList
                  options={VALID_STATUS.map((s) => ({ value: s, label: getStatusLabel(s), icon: <StatusDot status={s} size={7} /> }))}
                  selected={filter.status}
                  onToggle={(v) =>
                    setFilter((p) => ({
                      ...p,
                      status: p.status.includes(v as StatusKey)
                        ? p.status.filter((x) => x !== v)
                        : [...p.status, v as StatusKey],
                    }))
                  }
                />
              )}
              {section === "assignee" && (
                <ChipList
                  options={[
                    { value: "me", label: "Me" },
                    { value: "none", label: "Unassigned" },
                    ...USERS.slice(0, 8).map((u) => ({ value: u.id, label: u.name.split(" ")[0] })),
                  ]}
                  selected={filter.assignee}
                  onToggle={(v) =>
                    setFilter((p) => ({
                      ...p,
                      assignee: p.assignee.includes(v)
                        ? p.assignee.filter((x) => x !== v)
                        : [...p.assignee, v],
                    }))
                  }
                />
              )}
              {section === "label" && (
                <ChipList
                  options={[
                    { value: "none", label: "No label" },
                    ...LABELS.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                  selected={filter.label}
                  onToggle={(v) =>
                    setFilter((p) => ({
                      ...p,
                      label: p.label.includes(v)
                        ? p.label.filter((x) => x !== v)
                        : [...p.label, v],
                    }))
                  }
                />
              )}
              {section === "priority" && (
                <ChipList
                  options={VALID_PRIORITY.map((p) => ({
                    value: p,
                    label: getPriorityLabel(p),
                    icon: <PriorityIcon priority={p} size={10} />,
                  }))}
                  selected={filter.priority}
                  onToggle={(v) =>
                    setFilter((p) => ({
                      ...p,
                      priority: p.priority.includes(v as PriorityKey)
                        ? p.priority.filter((x) => x !== v)
                        : [...p.priority, v as PriorityKey],
                    }))
                  }
                />
              )}
              {section === "due" && (
                <ChipList
                  options={DUE_OPTIONS}
                  selected={filter.due}
                  onToggle={(v) =>
                    setFilter((p) => ({
                      ...p,
                      due: p.due.includes(v as DueFilter)
                        ? p.due.filter((x) => x !== v)
                        : [...p.due, v as DueFilter],
                    }))
                  }
                />
              )}
              {section === "search" && (
                <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5">
                  <SearchIcon size={11} className="text-[var(--color-text-faint)]" />
                  <input
                    autoFocus
                    value={filter.search}
                    onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
                    placeholder="Search title, key, description…"
                    className="flex-1 bg-transparent text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
                  />
                </div>
              )}
              {section === "group" && (
                <ChipList
                  options={[
                    { value: "none", label: "No grouping" },
                    { value: "status", label: "Status" },
                    { value: "priority", label: "Priority" },
                    { value: "assignee", label: "Assignee" },
                    { value: "label", label: "Label" },
                    { value: "project", label: "Project" },
                  ]}
                  selected={[group]}
                  onToggle={(v) => setGroup(v as GroupBy)}
                  single
                />
              )}
              {section === "sort" && (
                <div className="space-y-2">
                  <ChipList
                    options={[
                      { value: "updated", label: "Last updated" },
                      { value: "created", label: "Created" },
                      { value: "priority", label: "Priority" },
                      { value: "due", label: "Due date" },
                    ]}
                    selected={[sortKey]}
                    onToggle={(v) => setSort(v as SortKey)}
                    single
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSort(sortKey, "asc")}
                      className={cn(
                        "flex-1 rounded-md border border-[var(--color-border)] bg-[var(--surface-1)] px-2 py-1 text-[11.5px]",
                        sortDir === "asc"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                      )}
                    >
                      Ascending
                    </button>
                    <button
                      onClick={() => setSort(sortKey, "desc")}
                      className={cn(
                        "flex-1 rounded-md border border-[var(--color-border)] bg-[var(--surface-1)] px-2 py-1 text-[11.5px]",
                        sortDir === "desc"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                      )}
                    >
                      Descending
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipList<T extends string>({
  options,
  selected,
  onToggle,
  single,
}: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  selected: T[];
  onToggle: (value: T) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const isSelected = selected.includes(o.value);
        return (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            className={cn(
              "flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11.5px]",
              isSelected
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {o.icon}
            {o.label}
            {isSelected && <XIcon size={9} className="opacity-60" />}
          </button>
        );
      })}
    </div>
  );
}
