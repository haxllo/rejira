"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { FilterChipsFromState, buildFilterChips } from "@/components/views/filter-chips";
import { FilterPopover } from "@/components/views/filter-popover";
import { useUI } from "@/lib/state/ui";
import { useViewQuery } from "@/hooks/useViewQuery";
import { useFilteredIssues } from "@/lib/state/view-query";
import { StarIcon, ViewIcon, PlusIcon, Trash2Icon } from "@/components/icons";
import { useSavedViews } from "@/lib/state/saved-views";
import { apply } from "@/lib/state/mutations";
import { IssueRow } from "@/components/issue/issue-row";
import type { Issue, SavedView, StatusKey, PriorityKey } from "@/lib/db/types";

export interface ViewRendererProps {
  view: SavedView;
  issues: Issue[];
  currentUserId: string;
}

export function ViewRenderer({ view, issues, currentUserId }: ViewRendererProps) {
  const openDrawer = useUI((s) => s.openDrawer);
  const saveView = useSavedViews((s) => s.save);
  const [savingState, setSavingState] = React.useState<"idle" | "saved">("idle");

  const vq = useViewQuery(view.externalId);
  const { filtered, sorted, groups } = useFilteredIssues(
    vq.filter,
    vq.group,
    vq.sortKey,
    vq.sortDir,
    issues,
    currentUserId,
  );

  const filterChips = buildFilterChips(vq.filter, (next) => vq.setFilter(() => next), {
    group: vq.group,
    onClearGroup: () => vq.setGroup("none"),
    sortKey: vq.sortKey,
    sortDir: vq.sortDir,
    onClearSort: () => vq.setSort("updated", "desc"),
  });

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={
          <span className="flex items-center gap-2">
            <ViewIcon size={15} className="text-[var(--color-text-faint)]" />
            {view.name}
            {view.starred && <StarIcon size={12} className="text-[var(--color-warning)]" />}
          </span>
        }
        count={filtered.length}
        onNewIssue={() => useUI.getState().openCreateIssue()}
        onSaveAsView={(name) => {
          const saved = saveView({
            name,
            filter: vq.filter,
            group: vq.group,
            sortKey: vq.sortKey,
            sortDir: vq.sortDir,
            starred: false,
          });
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 1500);
          apply({
            message: `Saved view "${saved.name}"`,
            affectedIds: [],
            undo: () => useSavedViews.getState().remove(saved.id),
            retry: () => useSavedViews.getState().save(saved),
          });
        }}
        savingState={savingState}
        primary={
          <div className="flex items-center gap-1.5">
            <button className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[11.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]">
              <StarIcon size={11} />
              Star
            </button>
            <button className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[11.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]">
              Share
            </button>
          </div>
        }
      />
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
        <FilterChipsFromState
          filter={vq.filter}
          onChange={(next) => vq.setFilter(() => next)}
          group={vq.group}
          onClearGroup={() => vq.setGroup("none")}
          sortKey={vq.sortKey}
          sortDir={vq.sortDir}
          onClearSort={() => vq.setSort("updated", "desc")}
        />
        <FilterPopover
          filter={vq.filter}
          setFilter={vq.setFilter}
          group={vq.group}
          setGroup={vq.setGroup}
          sortKey={vq.sortKey}
          sortDir={vq.sortDir}
          setSort={vq.setSort}
          viewName={view.name}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <Empty viewName={view.name} />
        ) : vq.group === "none" ? (
          <FlatList issues={sorted} onOpen={(iss, el) => openDrawer(iss.externalId, el)} />
        ) : (
          <GroupedList groups={groups as Group[]} />
        )}
      </div>
    </div>
  );
}

function FlatList({
  issues,
  onOpen,
}: {
  issues: Issue[];
  onOpen: (i: Issue, el: HTMLElement) => void;
}) {
  return (
    <div data-list-root className="flex flex-col">
      {issues.map((issue, i) => (
        <Row key={issue.externalId} issue={issue} index={i} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Row({
  issue,
  index,
  onOpen,
}: {
  issue: Issue;
  index: number;
  onOpen: (i: Issue, el: HTMLElement) => void;
}) {
  return <IssueRow issue={issue} index={index} onOpen={onOpen} />;
}

function Empty({ viewName }: { viewName: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <ViewIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">No matching issues</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        The view <span className="font-medium text-[var(--color-text)]">&ldquo;{viewName}&rdquo;</span> has no issues.
      </p>
      <button
        onClick={() => useUI.getState().openCreateIssue()}
        className="mt-4 flex h-7 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-2.5 text-[12px] font-medium text-[var(--color-text-inverse)] hover:opacity-90"
      >
        <PlusIcon size={11} />
        New issue
      </button>
    </div>
  );
}

export type { StatusKey, PriorityKey };
