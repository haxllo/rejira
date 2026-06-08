'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { StatusDot, getStatusLabel } from '@/components/primitives/status';
import { PriorityIcon } from '@/components/primitives/priority';
import { Avatar } from '@/components/primitives/avatar';
import { LabelChip } from '@/components/primitives/label';
import { dueLabel, dueIsOverdue } from '@/lib/utils/date';
import { useUI } from '@/lib/state/ui';
import { lookupUser, type UserView } from '@/lib/state/users';
import { lookupLabel, type LabelView } from '@/lib/state/labels';
import { BoardDragOverlay } from '@/components/issue/board-drag-overlay';
import { cn } from '@/lib/utils';
import type { Issue, Cycle, StatusKey } from '@/lib/db/types';

const COLUMNS: Array<{ key: StatusKey; tone: string }> = [
  { key: "backlog", tone: "var(--color-text-faint)" },
  { key: "todo", tone: "var(--color-text-muted)" },
  { key: "in_progress", tone: "var(--color-status-in-progress)" },
  { key: "in_review", tone: "var(--color-status-in-review)" },
  { key: "done", tone: "var(--color-status-done)" },
];

interface Props {
  issues: Issue[];
  cycles: Cycle[];
  onOpen: (i: Issue) => void;
}

export function CycleBoard({ issues, onOpen }: Props) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<StatusKey | null>(null);
  const [overSlot, setOverSlot] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const issueById = React.useMemo(() => {
    const m = new Map<string, Issue>();
    for (const i of issues) m.set(i.externalId, i);
    return m;
  }, [issues]);

  const issuesByCol = React.useMemo(() => {
    const m: Record<StatusKey, Issue[]> = {
      backlog: [], todo: [], in_progress: [], in_review: [], done: [], cancelled: [],
    };
    for (const i of issues) m[i.status].push(i);
    return m;
  }, [issues]);

  const activeIssue = activeId ? issueById.get(activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    useUI.getState().startDrag([String(e.active.id)], issueById.get(String(e.active.id))?.title ?? "");
  };

  const onDragOver = (e: DragOverEvent) => {
    if (!e.over) {
      setOverCol(null);
      setOverSlot(null);
      return;
    }
    const overId = String(e.over.id);
    if (overId.startsWith("col:")) {
      const key = overId.slice(4) as StatusKey;
      setOverCol(key);
      setOverSlot(issuesByCol[key].length);
    } else {
      const issue = issueById.get(overId);
      if (issue) {
        setOverCol(issue.status);
        setOverSlot(issuesByCol[issue.status].findIndex((i) => i.externalId === overId));
      }
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverCol(null);
    setOverSlot(null);
    useUI.getState().endDrag();
  };

  const onDragCancel = () => {
    setActiveId(null);
    setOverCol(null);
    setOverSlot(null);
    useUI.getState().cancelDrag();
  };

  return (
    <DndContext
      id={React.useId()}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-6 py-3">
        {COLUMNS.map((col) => {
          const colIssues = issuesByCol[col.key];
          return (
            <BoardColumn
              key={col.key}
              colKey={col.key}
              tone={col.tone}
              issues={colIssues}
              onOpen={onOpen}
              isOver={overCol === col.key}
              overSlot={overCol === col.key ? overSlot : null}
            />
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeIssue ? <BoardDragOverlay issue={activeIssue} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  colKey,
  tone,
  issues,
  onOpen,
  isOver,
  overSlot,
}: {
  colKey: StatusKey;
  tone: string;
  issues: Issue[];
  onOpen: (i: Issue) => void;
  isOver: boolean;
  overSlot: number | null;
}) {
  const { setNodeRef } = useDroppable({ id: `col:${colKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] transition-colors",
        isOver && "border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]/30",
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <StatusDot status={colKey} size={7} />
        <span className="text-[12px] font-medium text-[var(--color-text)]">{getStatusLabel(colKey)}</span>
        <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{issues.length}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {issues.map((issue, i) => (
            <React.Fragment key={issue.externalId}>
              {isOver && overSlot === i && <DropIndicator />}
              <BoardCard
                issue={issue}
                index={i}
                onClick={() => onOpen(issue)}
              />
            </React.Fragment>
          ))}
          {isOver && overSlot !== null && overSlot >= issues.length && <DropIndicator />}
        </AnimatePresence>
        {!isOver && issues.length === 0 && (
          <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-[11px] text-[var(--color-text-faint)]">
            Drop issues here
          </div>
        )}
      </div>
    </div>
  );
}

function DropIndicator() {
  return (
    <div className="relative h-0">
      <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-[var(--color-accent)]" />
    </div>
  );
}

function BoardCard({ issue, index, onClick }: { issue: Issue; index: number; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.externalId });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: isDragging ? 0 : Math.min(index * 0.02, 0.2), type: "spring", stiffness: 380, damping: 30 }}
      {...attributes}
      {...listeners}
      className={cn("outline-none", isDragging && "z-10")}
    >
      <BoardCardBody issue={issue} onClick={onClick} />
    </motion.div>
  );
}

function BoardCardBody({ issue, onClick }: { issue: Issue; onClick?: () => void }) {
  const labels: LabelView[] = ((issue.labelIds as unknown as Array<string | number | bigint>) ?? [])
    .map((id) => lookupLabel(id))
    .filter((l): l is LabelView => Boolean(l));
  const firstAssignee: UserView | undefined = ((issue.assigneeIds as unknown as Array<string | number | bigint>) ?? [])
    .map((id) => lookupUser(id))
    .find((u): u is UserView => Boolean(u));
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--card-pad)] text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[var(--color-border-strong)]",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-border-focus)]",
      )}
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
          {labels.length > 3 && <span className="text-[10px] text-[var(--color-text-faint)]">+{labels.length - 3}</span>}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        {issue.dueDate && (
          <span
            className={cn(
              "text-[10.5px]",
              dueIsOverdue(issue.dueDate.toISOString()) ? "text-[var(--color-danger)]" : "text-[var(--color-text-faint)]",
            )}
          >
            {dueLabel(issue.dueDate.toISOString())}
          </span>
        )}
        {firstAssignee && <Avatar name={firstAssignee.name} size="xs" />}
      </div>
    </button>
  );
}
