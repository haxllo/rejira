"use client";

import * as React from "react";
import { ViewHeader } from "@/components/views/view-header";
import { FilterChips, FilterChipsFromState, buildFilterChips } from "@/components/views/filter-chips";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { FilterPopover } from "@/components/views/filter-popover";
import { USERS, ME_ID, type StatusKey } from "@/lib/mock";
import { getStatusLabel, StatusDot } from "@/components/primitives/status";
import { CircleAlertIcon, InboxIcon, PlusIcon } from "@/components/icons";
import { dueIsOverdue } from "@/lib/utils/date";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { useViewQuery } from "@/hooks/useViewQuery";
import { useFilteredIssues, type FilterState } from "@/lib/state/view-query";
import { IssueRow } from "@/components/issue/issue-row";

const STATUS_ORDER: StatusKey[] = ["in_progress", "in_review", "todo", "backlog", "done"];

export default function MyIssuesPage() {
  return (
    <React.Suspense fallback={null}>
      <MyIssuesBody />
    </React.Suspense>
  );
}

function MyIssuesBody() {
  const openDrawer = useUI((s) => s.openDrawer);
  const issues = useIssues((s) => s.issues);
  const me = USERS.find((u) => u.id === ME_ID)!;

  // Pre-filter to my issues
  const mine = React.useMemo(
    () => issues.filter((i) => i.assigneeIds.includes(ME_ID) && !i.archived),
    [issues],
  );

  // Seed URL with "me" + "not done" defaults
  const vq = useViewQuery("my-issues");
  React.useEffect(() => {
    if (
      vq.filter.assignee.length === 0 &&
      vq.filter.status.length === 0 &&
      !vq.filter.search
    ) {
      vq.setFilter((p) => ({
        ...p,
        assignee: ["me"],
        status: ["backlog", "todo", "in_progress", "in_review"],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { filtered, sorted, groups } = useFilteredIssues(
    vq.filter,
    vq.group,
    vq.sortKey,
    vq.sortDir,
    mine,
  );

  const overdue = sorted.filter((i) => i.dueDate && dueIsOverdue(i.dueDate) && i.status !== "done");
  const dueSoon = sorted.filter((i) => {
    if (!i.dueDate || i.status === "done") return false;
    const days = (new Date(i.dueDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  });

  // Always show status grouping on this page (per the spec)
  const effectiveGroup = vq.group === "none" ? "status" : vq.group;
  const displayGroups: Group[] =
    effectiveGroup === "status"
      ? STATUS_ORDER.map((s) => {
          const list = sorted.filter((i) => i.status === s);
          return {
            id: s,
            label: getStatusLabel(s),
            count: list.length,
            color: `var(--color-status-${s.replace("_", "-")})`,
            issues: list,
          };
        }).filter((g) => g.issues.length > 0)
      : (groups as Group[]);

  const chips = buildChips(vq.filter, vq.setFilter, vq.clear, vq.sortKey, vq.sortDir, vq.setSort);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="My Issues"
        description={`${filtered.length} open issues assigned to ${me.name.split(" ")[0]}`}
        count={filtered.length}
        primary={
          <div className="flex items-center gap-2">
            {overdue.length > 0 && (
              <div className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-2 text-[11.5px] text-[var(--color-danger)]">
                <CircleAlertIcon size={11} />
                <span className="font-mono">{overdue.length}</span>
                <span>overdue</span>
              </div>
            )}
            {dueSoon.length > 0 && (
              <div className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 text-[11.5px] text-[var(--color-text-muted)]">
                <span>Due in 3 days</span>
                <span className="font-mono">{dueSoon.length}</span>
              </div>
            )}
          </div>
        }
      />
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
        <FilterChipsFromState
          filter={vq.filter}
          onChange={(next) => vq.setFilter(() => next)}
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
          viewName="My Issues"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : vq.group === "none" ? (
          <div data-list-root className="flex flex-col">
            {sorted.map((issue, i) => (
              <IssueRow key={issue.id} issue={issue} index={i} onOpen={(iss, el) => openDrawer(iss.id, el)} />
            ))}
          </div>
        ) : (
          <GroupedList groups={displayGroups} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <InboxIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">All clear</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">No issues assigned to you — go celebrate.</p>
    </div>
  );
}

function buildChips(
  filter: FilterState,
  setFilter: (updater: (prev: FilterState) => FilterState) => void,
  clear: () => void,
  sortKey: ReturnType<typeof useViewQuery>["sortKey"],
  sortDir: ReturnType<typeof useViewQuery>["sortDir"],
  setSort: ReturnType<typeof useViewQuery>["setSort"],
) {
  return buildFilterChips(filter, (next) => setFilter(() => next), {
    sortKey,
    sortDir,
    onClearSort: () => setSort("updated", "desc"),
  });
}
