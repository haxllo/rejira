"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon, Trash2Icon, FlagIcon, UserIcon, TagIcon } from "@/components/icons";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { apply } from "@/lib/state/mutations";
import { convexSetStatus, convexSetPriority, convexBulkArchive } from "@/lib/state/convex-mutations";
import { StatusDot, getStatusLabel } from "@/components/primitives/status";
import { PriorityIcon, getPriorityLabel } from "@/components/primitives/priority";
import { USERS, PROJECTS, LABELS, type StatusKey, type PriorityKey, type LabelId, type ProjectId, type UserId } from "@/lib/mock";
import { cn } from "@/lib/utils";

const STATUS_ORDER: StatusKey[] = ["backlog", "todo", "in_progress", "in_review", "done"];
const PRIORITY_ORDER: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];

export function BulkActionBar() {
  const selectedIds = useUI((s) => s.selectedIssueIds);
  const clearSelected = useUI((s) => s.clearSelected);

  return (
    <AnimatePresence>
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto fixed inset-x-0 bottom-3 z-50 mx-auto flex max-w-fit items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/95 px-2 py-1.5 shadow-[var(--shadow-lg)] backdrop-blur"
        >
          <span className="flex h-6 items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 text-[11.5px] font-medium text-[var(--color-text)]">
            <span className="font-mono tabular-nums">{selectedIds.size}</span>
            selected
          </span>

          <Divider />

          <BulkMenu
            label="Status"
            trigger={<StatusDot status="backlog" size={7} className="text-[var(--color-text-faint)]" />}
            options={STATUS_ORDER.map((s) => ({
              value: s,
              label: getStatusLabel(s),
              icon: <StatusDot status={s} size={7} />,
            }))}
            onSelect={(status) => bulkSetStatus(Array.from(selectedIds), status)}
          />

          <BulkMenu
            label="Priority"
            trigger={<FlagIcon size={11} className="text-[var(--color-text-faint)]" />}
            options={PRIORITY_ORDER.map((p) => ({
              value: p,
              label: getPriorityLabel(p),
              icon: <PriorityIcon priority={p} size={10} />,
            }))}
            onSelect={(p) => bulkSetPriority(Array.from(selectedIds), p)}
          />

          <BulkMenu
            label="Assign"
            trigger={<UserIcon size={11} className="text-[var(--color-text-faint)]" />}
            options={USERS.slice(0, 8).map((u) => ({
              value: u.id,
              label: u.name,
              icon: <span className="size-3 rounded-full" style={{ background: u.avatarColor }} />,
            }))}
            onSelect={(uid) => bulkAssign(Array.from(selectedIds), uid)}
          />

          <BulkMenu
            label="Label"
            trigger={<TagIcon size={11} className="text-[var(--color-text-faint)]" />}
            options={LABELS.map((l) => ({ value: l.id, label: l.name }))}
            onSelect={(lid) => bulkAddLabel(Array.from(selectedIds), lid)}
          />

          <BulkMenu
            label="Move"
            trigger={<FolderGlyph size={11} className="text-[var(--color-text-faint)]" />}
            options={PROJECTS.map((p) => ({ value: p.id, label: p.name }))}
            onSelect={(pid) => bulkMove(Array.from(selectedIds), pid)}
          />

          <Divider />

          <button
            onClick={() => {
              const ids = Array.from(selectedIds);
              bulkArchive(ids);
            }}
            className="flex h-6 items-center gap-1.5 rounded-full px-2 text-[11.5px] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
          >
            <Trash2Icon size={11} />
            Archive
          </button>

          <button
            onClick={clearSelected}
            aria-label="Clear selection"
            className="ml-1 grid size-6 place-items-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)]"
          >
            <XIcon size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />;
}

function FolderGlyph({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3h2.7c.46 0 .9.2 1.2.55L8.5 5h4c.83 0 1.5.67 1.5 1.5v4.5c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BulkMenu<T extends string>({
  label,
  trigger,
  options,
  onSelect,
}: {
  label: string;
  trigger: React.ReactNode;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = React.useState(false);
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
        className={cn(
          "flex h-6 items-center gap-1.5 rounded-full px-2 text-[11.5px] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
          open && "bg-[var(--color-hover)] text-[var(--color-text)]",
        )}
      >
        {trigger}
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute bottom-[calc(100%+6px)] left-0 z-50 max-h-64 w-48 overflow-y-auto rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-1 shadow-[var(--shadow-popover)]"
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  onClick={() => {
                    onSelect(o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                >
                  {o.icon && <span className="grid size-4 place-items-center">{o.icon}</span>}
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function bulkSetStatus(ids: string[], status: StatusKey) {
  if (ids.length === 0) return;
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  const prev = useIssues.getState().issues.filter((i) => ids.includes(i.id));
  const prevStatuses = new Map(prev.map((i) => [i.id, i.status]));
  useIssues.getState().bulkSetStatus(ids, status);
  apply({
    message: `Moved ${ids.length} to ${getStatusLabel(status)}`,
    affectedIds: ids,
    undo: () => {
      useIssues.setState((s) => ({
        issues: s.issues.map((i) =>
          prevStatuses.has(i.id) ? { ...i, status: prevStatuses.get(i.id) as StatusKey } : i,
        ),
      }));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => useIssues.getState().bulkSetStatus(ids, status),
  });
  ids.forEach((id) => convexSetStatus(id, status));
}

function bulkSetPriority(ids: string[], priority: PriorityKey) {
  if (ids.length === 0) return;
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  const prev = useIssues.getState().issues.filter((i) => ids.includes(i.id));
  const prevPriorities = new Map(prev.map((i) => [i.id, i.priority]));
  ids.forEach((id) => useIssues.getState().setPriority(id, priority));
  apply({
    message: `Set ${ids.length} to ${getPriorityLabel(priority)} priority`,
    affectedIds: ids,
    undo: () => {
      useIssues.setState((s) => ({
        issues: s.issues.map((i) =>
          prevPriorities.has(i.id) ? { ...i, priority: prevPriorities.get(i.id) as PriorityKey } : i,
        ),
      }));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => ids.forEach((id) => useIssues.getState().setPriority(id, priority)),
  });
  ids.forEach((id) => convexSetPriority(id, priority));
}

function bulkAssign(ids: string[], userId: UserId) {
  if (ids.length === 0) return;
  const name = USERS.find((u) => u.id === userId)?.name.split(" ")[0] ?? "user";
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  const before = useIssues.getState().issues.filter((i) => ids.includes(i.id));
  const beforeHas = new Map(before.map((i) => [i.id, i.assigneeIds.includes(userId)]));
  useIssues.getState().bulkAssign(ids, userId);
  apply({
    message: `Assigned ${name} to ${ids.length} issue${ids.length === 1 ? "" : "s"}`,
    affectedIds: ids,
    undo: () => {
      useIssues.setState((s) => ({
        issues: s.issues.map((i) => {
          if (!ids.includes(i.id)) return i;
          const had = beforeHas.get(i.id);
          const has = i.assigneeIds.includes(userId);
          if (had === has) return i;
          return {
            ...i,
            assigneeIds: has
              ? i.assigneeIds.filter((u) => u !== userId)
              : [...i.assigneeIds, userId],
          };
        }),
      }));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => useIssues.getState().bulkAssign(ids, userId),
  });
}

function bulkAddLabel(ids: string[], labelId: LabelId) {
  if (ids.length === 0) return;
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  useIssues.getState().bulkAddLabel(ids, labelId);
  apply({
    message: `Added label to ${ids.length} issue${ids.length === 1 ? "" : "s"}`,
    affectedIds: ids,
    undo: () => {
      useIssues.setState((s) => ({
        issues: s.issues.map((i) =>
          ids.includes(i.id) ? { ...i, labelIds: i.labelIds.filter((l) => l !== labelId) } : i,
        ),
      }));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => useIssues.getState().bulkAddLabel(ids, labelId),
  });
}

function bulkMove(ids: string[], projectId: ProjectId) {
  if (ids.length === 0) return;
  const name = PROJECTS.find((p) => p.id === projectId)?.name ?? "project";
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  const before = useIssues.getState().issues.filter((i) => ids.includes(i.id));
  const beforeProject = new Map(before.map((i) => [i.id, i.projectId]));
  ids.forEach((id) => useIssues.getState().setProject(id, projectId));
  apply({
    message: `Moved ${ids.length} to ${name}`,
    affectedIds: ids,
    undo: () => {
      useIssues.setState((s) => ({
        issues: s.issues.map((i) => {
          if (!ids.includes(i.id)) return i;
          const prev = beforeProject.get(i.id);
          return prev ? { ...i, projectId: prev } : i;
        }),
      }));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => ids.forEach((id) => useIssues.getState().setProject(id, projectId)),
  });
}

function bulkArchive(ids: string[]) {
  if (ids.length === 0) return;
  const prevSelected = Array.from(useUI.getState().selectedIssueIds);
  useIssues.getState().bulkArchive(ids);
  apply({
    message: `Archived ${ids.length} issue${ids.length === 1 ? "" : "s"}`,
    affectedIds: ids,
    undo: () => {
      ids.forEach((id) => useIssues.getState().unarchiveIssue(id));
      useUI.getState().setSelected(prevSelected);
    },
    retry: () => useIssues.getState().bulkArchive(ids),
  });
  convexBulkArchive(ids);
}
