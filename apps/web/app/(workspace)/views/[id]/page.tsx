"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { FilterChips, FilterChipsFromState, buildFilterChips } from "@/components/views/filter-chips";
import { FilterPopover } from "@/components/views/filter-popover";
import { type Issue, type StatusKey, type PriorityKey } from "@/lib/mock";
import { useIssues } from "@/lib/state/issues";
import { USERS } from "@/lib/mock";
import { getStatusLabel } from "@/components/primitives/status";
import { useUI } from "@/lib/state/ui";
import { useViewQuery } from "@/hooks/useViewQuery";
import { useFilteredIssues, type FilterState } from "@/lib/state/view-query";
import { StarIcon, ViewIcon, PlusIcon, Trash2Icon } from "@/components/icons";
import { useSavedViews } from "@/lib/state/saved-views";
import { apply } from "@/lib/state/mutations";
import { IssueRow } from "@/components/issue/issue-row";

type View = {
  id: string;
  name: string;
  description: string;
  starred: boolean;
  baseFilter: (i: Issue) => boolean;
};

const VIEWS: View[] = [
  {
    id: "all",
    name: "All Issues",
    description: "Every open issue across all projects, sorted by last update.",
    starred: true,
    baseFilter: (i) => !i.archived,
  },
  {
    id: "urgent",
    name: "Urgent",
    description: "High-priority issues needing attention this week.",
    starred: true,
    baseFilter: (i) => (i.priority === "urgent" || i.priority === "high") && i.status !== "done" && i.status !== "cancelled" && !i.archived,
  },
  {
    id: "starred",
    name: "Starred",
    description: "Issues you've marked for quick access.",
    starred: false,
    baseFilter: () => false,
  },
  {
    id: "recent",
    name: "Recently updated",
    description: "All issues, sorted by recency.",
    starred: false,
    baseFilter: (i) => !i.archived,
  },
];

export default function ViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense fallback={null}>
      <ViewBody params={params} />
    </React.Suspense>
  );
}

function ViewBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const view = VIEWS.find((v) => v.id === id) ?? VIEWS[0]!;
  const openDrawer = useUI((s) => s.openDrawer);
  const issues = useIssues((s) => s.issues);
  const savedViews = useSavedViews((s) => s.views);
  const saveView = useSavedViews((s) => s.save);
  const [savingState, setSavingState] = React.useState<"idle" | "saved">("idle");

  const vq = useViewQuery(view.id);

  // Pre-filter by view's base predicate (cheap), then let the URL filters
  // and group/sort logic do the rest.
  const baseFiltered = React.useMemo(() => issues.filter(view.baseFilter), [issues, view]);
  const { filtered, sorted, groups } = useFilteredIssues(vq.filter, vq.group, vq.sortKey, vq.sortDir, baseFiltered);

  const filterChips = buildFilterChips(
    vq.filter,
    (next) => vq.setFilter(() => next),
    {
      group: vq.group,
      onClearGroup: () => vq.setGroup("none"),
      sortKey: vq.sortKey,
      sortDir: vq.sortDir,
      onClearSort: () => vq.setSort("updated", "desc"),
    },
  );

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
        description={view.description}
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
          <Empty viewId={view.id} />
        ) : vq.group === "none" ? (
          <FlatList issues={sorted} onOpen={(iss, el) => openDrawer(iss.id, el)} />
        ) : (
          <GroupedList groups={groups as Group[]} />
        )}
      </div>
      {savedViews.length > 0 && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Saved views</div>
          <div className="flex flex-wrap gap-1.5">
            {savedViews.map((sv) => (
              <button
                key={sv.id}
                onClick={() => {
                  // navigate to the view with the saved filter set in the URL
                  const qs = new URLSearchParams();
                  if (sv.filter.status.length) qs.set("status", sv.filter.status.join(","));
                  if (sv.filter.priority.length) qs.set("priority", sv.filter.priority.join(","));
                  if (sv.filter.due.length) qs.set("due", sv.filter.due.join(","));
                  if (sv.filter.assignee.length) qs.set("assignee", sv.filter.assignee.join(","));
                  if (sv.filter.label.length) qs.set("label", sv.filter.label.join(","));
                  if (sv.filter.search) qs.set("search", sv.filter.search);
                  if (sv.group !== "none") qs.set("group", sv.group);
                  if (sv.sortKey !== "updated" || sv.sortDir !== "desc") qs.set("sort", `${sv.sortKey}:${sv.sortDir}`);
                  window.history.replaceState(null, "", `/views/${view.id}${qs.toString() ? `?${qs}` : ""}`);
                }}
                className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              >
                {sv.starred && <StarIcon size={9} className="text-[var(--color-warning)]" />}
                {sv.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useSavedViews.getState().remove(sv.id);
                  }}
                  className="ml-1 grid size-3.5 place-items-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-hover)] hover:text-[var(--color-danger)]"
                  aria-label={`Delete ${sv.name}`}
                >
                  <Trash2Icon size={9} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlatList({ issues, onOpen }: { issues: Issue[]; onOpen: (i: Issue, el: HTMLElement) => void }) {
  return (
    <div data-list-root className="flex flex-col">
      {issues.map((issue, i) => (
        <Row key={issue.id} issue={issue} index={i} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Row({ issue, index, onOpen }: { issue: Issue; index: number; onOpen: (i: Issue, el: HTMLElement) => void }) {
  return <IssueRow issue={issue} index={index} onOpen={onOpen} />;
}

function buildChips(
  filter: FilterState,
  setFilter: (updater: (prev: FilterState) => FilterState) => void,
  clear: () => void,
  group: ReturnType<typeof useViewQuery>["group"],
  setGroup: (g: ReturnType<typeof useViewQuery>["group"]) => void,
  sortKey: ReturnType<typeof useViewQuery>["sortKey"],
  sortDir: ReturnType<typeof useViewQuery>["sortDir"],
  setSort: ReturnType<typeof useViewQuery>["setSort"],
) {
  return buildFilterChips(filter, (next) => setFilter(() => next), {
    group,
    onClearGroup: () => setGroup("none"),
    sortKey,
    sortDir,
    onClearSort: () => setSort("updated", "desc"),
  });
}

function Empty({ viewId }: { viewId: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <ViewIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">
        {viewId === "starred" ? "No starred issues" : "No matching issues"}
      </h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        {viewId === "starred"
          ? "Star an issue to see it here. Use S in a row."
          : "Try adjusting your filters or create a new issue."}
      </p>
      {viewId === "starred" || (
        <button
          onClick={() => useUI.getState().openCreateIssue()}
          className="mt-4 flex h-7 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-2.5 text-[12px] font-medium text-[var(--color-text-inverse)] hover:opacity-90"
        >
          <PlusIcon size={11} />
          New issue
        </button>
      )}
    </div>
  );
}
