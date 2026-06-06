"use client";

import { useMemo } from "react";
import { labelById, userById, USERS, type StatusKey, type PriorityKey, type UserId, type LabelId, type Issue } from "@/lib/mock";
/**
 * URL-encoded filter state for a list view.
 *
 * Grammar:
 *   ?status=in_progress,in_review&assignee=me,u_alice&label=lbl_perf,lbl_regression
 *    &priority=urgent,high&due=overdue,this_week&search=cursor%20bug
 *    &group=status&sort=updated:desc
 *
 * Comma-separated multi-value for OR within a field.
 * Special tokens: "me" (current user), "none" (unassigned / no label /
 * no due date), "overdue", "this_week", "next_week".
 */

export type DueFilter = "overdue" | "this_week" | "next_week" | "none" | "any";
export type GroupBy = "status" | "priority" | "assignee" | "none" | "label" | "project";
export type SortKey = "updated" | "created" | "priority" | "due";
export type SortDir = "asc" | "desc";

export type FilterState = {
  status: StatusKey[];
  assignee: Array<UserId | "me" | "none">;
  label: Array<LabelId | "none">;
  priority: PriorityKey[];
  due: DueFilter[];
  search: string;
  archived: boolean;
};

export const EMPTY_FILTER: FilterState = {
  status: [],
  assignee: [],
  label: [],
  priority: [],
  due: [],
  search: "",
  archived: false,
};

export const DEFAULT_FILTER_FOR_VIEW: Record<string, Partial<FilterState>> = {
  all: { status: ["backlog", "todo", "in_progress", "in_review"] },
  urgent: { priority: ["urgent", "high"] },
  starred: {},
  recent: {},
};

const VALID_STATUS: StatusKey[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
const VALID_PRIORITY: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];
const VALID_DUE: DueFilter[] = ["overdue", "this_week", "next_week", "none", "any"];

function csv(v: string | null): string[] {
  return v ? v.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

function isStatus(v: string): v is StatusKey {
  return (VALID_STATUS as string[]).includes(v);
}
function isPriority(v: string): v is PriorityKey {
  return (VALID_PRIORITY as string[]).includes(v);
}
function isDue(v: string): v is DueFilter {
  return (VALID_DUE as string[]).includes(v);
}

/** Parse a URLSearchParams into a FilterState. Invalid tokens are dropped. */
export function parseFilter(params: URLSearchParams, viewId?: string): FilterState {
  const defaults = (viewId && DEFAULT_FILTER_FOR_VIEW[viewId]) || {};
  const statusRaw = csv(params.get("status"));
  const status = statusRaw.filter(isStatus);
  const priorityRaw = csv(params.get("priority"));
  const priority = priorityRaw.filter(isPriority);
  const dueRaw = csv(params.get("due"));
  const due = dueRaw.filter(isDue);
  const assignee = csv(params.get("assignee"));
  const label = csv(params.get("label"));
  const search = (params.get("search") ?? "").trim();
  const archived = params.get("archived") === "1";
  return {
    status: status.length ? status : (defaults.status as StatusKey[]) ?? [],
    priority: priority.length ? priority : (defaults.priority as PriorityKey[]) ?? [],
    due: due.length ? due : (defaults.due as DueFilter[]) ?? [],
    assignee,
    label,
    search,
    archived,
  };
}

/** Serialize a FilterState back to URLSearchParams. Empty values are omitted. */
export function serializeFilter(state: FilterState): URLSearchParams {
  const out = new URLSearchParams();
  if (state.status.length) out.set("status", state.status.join(","));
  if (state.priority.length) out.set("priority", state.priority.join(","));
  if (state.due.length) out.set("due", state.due.join(","));
  if (state.assignee.length) out.set("assignee", state.assignee.join(","));
  if (state.label.length) out.set("label", state.label.join(","));
  if (state.search) out.set("search", state.search);
  if (state.archived) out.set("archived", "1");
  return out;
}

/** True if no filter is active beyond the view defaults. */
export function isEmptyFilter(state: FilterState, viewId?: string): boolean {
  const defaults = (viewId && DEFAULT_FILTER_FOR_VIEW[viewId]) || {};
  return (
    state.status.length === ((defaults.status as string[] | undefined)?.length ?? 0) &&
    state.priority.length === ((defaults.priority as string[] | undefined)?.length ?? 0) &&
    state.due.length === 0 &&
    state.assignee.length === 0 &&
    state.label.length === 0 &&
    state.search.length === 0 &&
    !state.archived
  );
}

const now = () => Date.now();
const DAY = 86_400_000;

function matchDue(due: DueFilter[], dueDate?: string): boolean {
  if (due.length === 0 || due.includes("any")) return true;
  if (due.includes("none") && !dueDate) return true;
  if (!dueDate) return false;
  const t = new Date(dueDate).getTime();
  const today = now();
  for (const d of due) {
    if (d === "overdue" && t < today) return true;
    if (d === "this_week" && t >= today && t <= today + 7 * DAY) return true;
    if (d === "next_week" && t > today + 7 * DAY && t <= today + 14 * DAY) return true;
  }
  return false;
}

function matchAssignee(filter: FilterState["assignee"], assigneeIds: UserId[]): boolean {
  if (filter.length === 0) return true;
  for (const f of filter) {
    if (f === "none" && assigneeIds.length === 0) return true;
    if (f === "me" && assigneeIds.includes("u_aria")) return true;
    if (typeof f === "string" && f !== "me" && f !== "none" && assigneeIds.includes(f)) return true;
  }
  return false;
}

function matchLabel(filter: FilterState["label"], labelIds: LabelId[]): boolean {
  if (filter.length === 0) return true;
  for (const f of filter) {
    if (f === "none" && labelIds.length === 0) return true;
    if (typeof f === "string" && f !== "none" && labelIds.includes(f)) return true;
  }
  return false;
}

function matchSearch(q: string, i: Issue): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    i.title.toLowerCase().includes(needle) ||
    i.key.toLowerCase().includes(needle) ||
    (i.description?.toLowerCase().includes(needle) ?? false)
  );
}

export function applyFilter(state: FilterState, issues: Issue[]): Issue[] {
  return issues.filter((i) => {
    if (!state.archived && i.archived) return false;
    if (state.status.length && !state.status.includes(i.status)) return false;
    if (state.priority.length && !state.priority.includes(i.priority)) return false;
    if (!matchDue(state.due, i.dueDate)) return false;
    if (!matchAssignee(state.assignee, i.assigneeIds)) return false;
    if (!matchLabel(state.label, i.labelIds)) return false;
    if (!matchSearch(state.search, i)) return false;
    return true;
  });
}

const PRIORITY_RANK: Record<PriorityKey, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
};

export function applySort(issues: Issue[], key: SortKey, dir: SortDir): Issue[] {
  const sorted = [...issues];
  const mult = dir === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    switch (key) {
      case "updated":
        return mult * a.updatedAt.localeCompare(b.updatedAt);
      case "created":
        return mult * a.createdAt.localeCompare(b.createdAt);
      case "priority":
        return mult * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      case "due": {
        const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return mult * (at - bt);
      }
    }
  });
  return sorted;
}

export function applyGroup(state: GroupBy, issues: Issue[]): Array<{ id: string; label: string; count: number; color?: string; issues: Issue[] }> {
  if (state === "none") {
    return [{ id: "all", label: "Results", count: issues.length, issues }];
  }
  const map = new Map<string, Issue[]>();
  for (const i of issues) {
    let key = "other";
    let label = "Other";
    let color: string | undefined;
    switch (state) {
      case "status":
        key = i.status;
        label = i.status.replace("_", " ");
        color = `var(--color-status-${i.status.replace("_", "-")})`;
        break;
      case "priority":
        key = i.priority;
        label = i.priority;
        color = `var(--color-priority-${i.priority})`;
        break;
      case "assignee": {
        if (i.assigneeIds.length === 0) {
          key = "none";
          label = "Unassigned";
        } else {
          const u = userById(i.assigneeIds[0]!);
          key = u?.id ?? "unknown";
          label = u?.name ?? "Unknown";
        }
        break;
      }
      case "label": {
        if (i.labelIds.length === 0) {
          key = "none";
          label = "No label";
        } else {
          const l = labelById(i.labelIds[0]!);
          key = l?.id ?? "unknown";
          label = l?.name ?? "Unknown";
          color = undefined;
        }
        break;
      }
      case "project":
        key = i.projectId;
        label = i.projectId;
        break;
    }
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([id, list]) => ({
    id,
    label: mapLabel(id, state, list),
    count: list.length,
    color: list[0] && (state === "status" || state === "priority")
      ? `var(--color-status-${list[0].status.replace("_", "-")})`
      : undefined,
    issues: list,
  }));
}

function mapLabel(id: string, state: GroupBy, list: Issue[]): string {
  if (state === "status") return id.replace("_", " ");
  if (state === "priority") return id;
  if (state === "assignee") {
    if (id === "none") return "Unassigned";
    return userById(id)?.name ?? "Unknown";
  }
  if (state === "label") {
    if (id === "none") return "No label";
    return labelById(id)?.name ?? "Unknown";
  }
  return id;
}

/** Parse `?group=status&sort=updated:desc` from URL. */
export function parseViewParams(params: URLSearchParams): { group: GroupBy; sortKey: SortKey; sortDir: SortDir } {
  const g = params.get("group");
  const group: GroupBy =
    g === "status" || g === "priority" || g === "assignee" || g === "label" || g === "project" ? g : "none";
  const sort = params.get("sort") ?? "updated:desc";
  const [key, dir] = sort.split(":");
  const sortKey: SortKey =
    key === "updated" || key === "created" || key === "priority" || key === "due" ? key : "updated";
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";
  return { group, sortKey, sortDir };
}

export function serializeViewParams(group: GroupBy, sortKey: SortKey, sortDir: SortDir): URLSearchParams {
  const out = new URLSearchParams();
  if (group !== "none") out.set("group", group);
  if (sortKey !== "updated" || sortDir !== "desc") out.set("sort", `${sortKey}:${sortDir}`);
  return out;
}

export function useFilteredIssues(
  state: FilterState,
  group: GroupBy,
  sortKey: SortKey,
  sortDir: SortDir,
  source: Issue[],
): { filtered: Issue[]; sorted: Issue[]; groups: ReturnType<typeof applyGroup> } {
  return useMemo(() => {
    const filtered = applyFilter(state, source);
    const sorted = applySort(filtered, sortKey, sortDir);
    const groups = applyGroup(group, sorted);
    return { filtered, sorted, groups };
  }, [state, group, sortKey, sortDir, source]);
}
