"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";
import { IssueRow } from "@/components/issue/issue-row";
import { DragRowOverlay } from "@/components/issue/drag-overlay";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { apply } from "@/lib/state/mutations";
import { cn } from "@/lib/utils";
import type { Issue, StatusKey } from "@/lib/mock";

export interface Group {
  id: string;
  label: string;
  count: number;
  color?: string;
  meta?: string;
  issues: Issue[];
}

export function GroupedList({
  groups,
  emptyState,
}: {
  groups: Group[];
  emptyState?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const openDrawer = useUI((s) => s.openDrawer);
  const startDrag = useUI((s) => s.startDrag);
  const endDrag = useUI((s) => s.endDrag);
  const cancelDrag = useUI((s) => s.cancelDrag);
  const selectedIds = useUI((s) => s.selectedIssueIds);

  // The actively-dragged issue (head), used for the DragOverlay
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overGroupId, setOverGroupId] = React.useState<string | null>(null);
  const [overSlot, setOverSlot] = React.useState<{ groupId: string; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Build flat id → group map for fast lookup
  const issueToGroup = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) for (const i of g.issues) m.set(i.id, g.id);
    return m;
  }, [groups]);

  const issueById = React.useMemo(() => {
    const m = new Map<string, Issue>();
    for (const g of groups) for (const i of g.issues) m.set(i.id, i);
    return m;
  }, [groups]);

  const activeIssues: Issue[] = React.useMemo(() => {
    if (!activeId) return [];
    // If the active id is part of a multi-selection, drag the whole set;
    // otherwise drag just the single issue.
    if (selectedIds.has(activeId) && selectedIds.size > 1) {
      return Array.from(selectedIds).map((id) => issueById.get(id)!).filter(Boolean);
    }
    const single = issueById.get(activeId);
    return single ? [single] : [];
  }, [activeId, selectedIds, issueById]);

  if (groups.length === 0 && emptyState) {
    return <div className="px-6 py-12">{emptyState}</div>;
  }

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    const dragging = activeIssues;
    const label =
      dragging.length > 1
        ? `${dragging.length} issues`
        : dragging[0]?.title ?? id;
    startDrag(
      dragging.map((i) => i.id),
      label,
    );
  };

  const onDragOver = (e: { over: { id: string | number } | null; activatorEvent?: Event; delta?: { x: number; y: number } }) => {
    if (!e.over) {
      setOverGroupId(null);
      setOverSlot(null);
      return;
    }
    const overId = String(e.over.id);
    const g = issueToGroup.get(overId);
    if (!g) {
      setOverGroupId(null);
      setOverSlot(null);
      return;
    }
    setOverGroupId(g);

    // Compute slot: position in the group's issues array for the hovered issue,
    // adjusted down by one if the active item is in the same group and at or
    // before that position (so the indicator doesn't collapse to a stale spot
    // when the dragged row is removed from its source group).
    const group = groups.find((x) => x.id === g);
    if (!group) {
      setOverSlot(null);
      return;
    }
    const overIndex = group.issues.findIndex((i) => i.id === overId);
    if (overIndex === -1) {
      setOverSlot({ groupId: g, index: group.issues.length });
      return;
    }
    // Use the bottom-half heuristic via the row element's bounding box.
    const overEl = document.querySelector<HTMLElement>(`[data-issue-id="${overId}"]`);
    if (overEl) {
      const rect = overEl.getBoundingClientRect();
      const pointerY = (e.activatorEvent as PointerEvent | MouseEvent | undefined)?.clientY;
      // dnd-kit's deltaY is on the active, not over. Fall back to mid-point.
      if (typeof pointerY === "number") {
        const mid = rect.top + rect.height / 2;
        const slot = pointerY < mid ? overIndex : overIndex + 1;
        setOverSlot({ groupId: g, index: slot });
        return;
      }
    }
    setOverSlot({ groupId: g, index: overIndex });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverGroupId(null);
    setOverSlot(null);
    if (!over) {
      endDrag();
      return;
    }
    const fromId = String(active.id);
    const toId = String(over.id);
    if (fromId === toId) {
      endDrag();
      return;
    }
    const fromGroupId = issueToGroup.get(fromId);
    const toGroupId = issueToGroup.get(toId);
    if (!fromGroupId || !toGroupId) {
      endDrag();
      return;
    }
    const targetGroup = groups.find((g) => g.id === toGroupId)!;
    const draggedIds = activeIssues.map((i) => i.id);

    if (fromGroupId === toGroupId) {
      // Within-group reorder
      const fromIndex = targetGroup.issues.findIndex((i) => i.id === fromId);
      const toIndex = targetGroup.issues.findIndex((i) => i.id === toId);
      if (fromIndex === -1 || toIndex === -1) {
        endDrag();
        return;
      }
      const before = useIssues.getState().issues;
      draggedIds.forEach((id) => {
        useIssues.getState().reorderInGroup(toGroupId as StatusKey, fromIndex, toIndex);
      });
      const after = useIssues.getState().issues;
      apply({
        message:
          draggedIds.length > 1
            ? `Reordered ${draggedIds.length} issues`
            : "Reordered",
        affectedIds: draggedIds,
        undo: () => useIssues.setState({ issues: before }),
        retry: () => useIssues.setState({ issues: after }),
      });
    } else {
      // Cross-group: moveToStatus
      const toIndex = targetGroup.issues.findIndex((i) => i.id === toId);
      const before = useIssues.getState().issues;
      draggedIds.forEach((id) => {
        useIssues.getState().moveToStatus(id, toGroupId as StatusKey, toIndex);
      });
      const after = useIssues.getState().issues;
      apply({
        message:
          draggedIds.length > 1
            ? `Moved ${draggedIds.length} to ${targetGroup.label}`
            : `Moved to ${targetGroup.label}`,
        affectedIds: draggedIds,
        undo: () => useIssues.setState({ issues: before }),
        retry: () => useIssues.setState({ issues: after }),
      });
    }
    endDrag();
  };

  const onDragCancel = () => {
    setActiveId(null);
    setOverGroupId(null);
    setOverSlot(null);
    cancelDrag();
  };

  return (
    <DndContext
      id={React.useId()}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex flex-col" data-list-root>
        {groups.map((g) => {
          const isCollapsed = collapsed[g.id];
          const isOverGroup = overGroupId === g.id && activeId !== null;
          return (
            <section key={g.id} className="group/section border-b border-[var(--color-border)]">
              <div className="sticky top-0 z-[1] flex w-full items-center bg-[var(--color-bg)]/95 backdrop-blur">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                  className="flex h-[var(--group-h)] flex-1 items-center gap-1.5 px-6 text-left hover:bg-[var(--color-surface-1)]"
                  aria-expanded={!isCollapsed}
                >
                  <span className="grid size-3 place-items-center text-[var(--color-text-faint)]">
                    {isCollapsed ? <ChevronRightIcon size={10} /> : <ChevronDownIcon size={10} />}
                  </span>
                  {g.color && <span className="size-2 rounded-full" style={{ background: g.color }} />}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {g.label}
                  </span>
                  <span className="ml-1 font-mono text-[10.5px] tabular-nums text-[var(--color-text-faint)]">{g.count}</span>
                  {g.meta && <span className="ml-1.5 text-[10.5px] text-[var(--color-text-faint)]">· {g.meta}</span>}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="mr-2 grid size-5 place-items-center rounded text-[var(--color-text-faint)] opacity-0 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)] group-hover/section:opacity-100"
                  aria-label={`Add issue to ${g.label}`}
                >
                  <PlusIcon size={10} />
                </button>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  {g.issues.length === 0 && (
                    <div className="px-6 py-3 text-[12px] text-[var(--color-text-faint)]">No issues</div>
                  )}
                  {g.issues.map((issue, i) => {
                    const showIndicator =
                      isOverGroup &&
                      overSlot?.groupId === g.id &&
                      overSlot?.index === i &&
                      activeId !== issue.id;
                    return (
                      <React.Fragment key={issue.id}>
                        {showIndicator && <ListDropIndicator />}
                        <IssueRow
                          issue={issue}
                          index={i}
                          onOpen={(iss, el) => openDrawer(iss.id, el)}
                        />
                      </React.Fragment>
                    );
                  })}
                  {isOverGroup && overSlot?.groupId === g.id && overSlot?.index === g.issues.length && (
                    <ListDropIndicator />
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeId ? <DragRowOverlay issues={activeIssues} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function ListDropIndicator() {
  return (
    <div className="pointer-events-none relative h-0">
      <div className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-accent-soft)]" />
    </div>
  );
}
