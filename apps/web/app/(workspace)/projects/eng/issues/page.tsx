"use client";

import * as React from "react";
import { ViewHeader, type ViewAs } from "@/components/views/view-header";
import { FilterChips, buildFilterChips, type Filter } from "@/components/views/filter-chips";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { CycleBoard } from "@/components/views/cycle-board";
import { FilterPopover } from "@/components/views/filter-popover";
import { projectById, type Issue, type StatusKey } from "@/lib/mock";
import { getStatusLabel } from "@/components/primitives/status";
import { GanttIcon } from "@/components/icons";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { useViewQuery } from "@/hooks/useViewQuery";
import { useFilteredIssues } from "@/lib/state/view-query";

const STATUS_ORDER: StatusKey[] = ["in_progress", "in_review", "todo", "backlog", "done"];

export default function ProjectIssuesPage() {
  return (
    <React.Suspense fallback={null}>
      <ProjectIssuesBody />
    </React.Suspense>
  );
}

function ProjectIssuesBody() {
  const [viewAs, setViewAs] = React.useState<ViewAs>("list");
  const openDrawer = useUI((s) => s.openDrawer);
  const issues = useIssues((s) => s.issues);
  const project = projectById("p_eng");

  const projectIssues = React.useMemo(
    () => issues.filter((i) => i.projectId === "p_eng" && !i.archived),
    [issues],
  );

  const vq = useViewQuery("eng-issues");
  const { filtered, sorted, groups } = useFilteredIssues(
    vq.filter,
    vq.group,
    vq.sortKey,
    vq.sortDir,
    projectIssues,
  );

  // Build display groups honoring URL state. Default group is "status" with
  // our preferred order.
  const displayGroups: Group[] =
    vq.group === "status" || vq.group === "none"
      ? STATUS_ORDER.map((s) => ({
          id: s,
          label: getStatusLabel(s),
          count: sorted.filter((i) => i.status === s).length,
          color: `var(--color-status-${s.replace("_", "-")})`,
          issues: sorted.filter((i) => i.status === s),
        })).filter((g) => g.issues.length > 0)
      : (groups as Group[]);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={project?.name ?? "Project"}
        description={`${filtered.length} open issues · active cycle in progress`}
        count={filtered.length}
        viewAs={viewAs}
        onViewAsChange={setViewAs}
        onNewIssue={() => useUI.getState().openCreateIssue()}
      />
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
        <FilterChips
          filters={[
            { id: "project", label: "Project", value: project?.name ?? "" },
            ...buildFilterChips(vq.filter, (next) => vq.setFilter(() => next), {
              group: vq.group,
              onClearGroup: () => vq.setGroup("none"),
              sortKey: vq.sortKey,
              sortDir: vq.sortDir,
              onClearSort: () => vq.setSort("updated", "desc"),
            }),
          ]}
          onClear={vq.clear}
        />
        <FilterPopover
          filter={vq.filter}
          setFilter={vq.setFilter}
          group={vq.group}
          setGroup={vq.setGroup}
          sortKey={vq.sortKey}
          sortDir={vq.sortDir}
          setSort={vq.setSort}
          viewName={project?.name ?? "Project"}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {viewAs === "board" ? (
          <CycleBoard issues={filtered} onOpen={(i) => openDrawer(i.id)} />
        ) : viewAs === "timeline" ? (
          <TimelineView issues={filtered} onOpen={(i) => openDrawer(i.id)} />
        ) : (
          <GroupedList groups={displayGroups} />
        )}
      </div>
    </div>
  );
}

function TimelineView({ issues, onOpen }: { issues: Issue[]; onOpen: (i: Issue) => void }) {
  return (
    <div className="flex h-full items-center justify-center p-12 text-center">
      <div>
        <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] mx-auto">
          <GanttIcon size={18} className="text-[var(--color-text-faint)]" />
        </div>
        <h2 className="mt-3 text-[14px] font-semibold text-[var(--color-text)]">Timeline coming soon</h2>
        <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">Gantt-style view with dependencies, ranges, and drag-resize.</p>
      </div>
    </div>
  );
}
