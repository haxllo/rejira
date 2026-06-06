"use client";

import { create } from "zustand";
import {
  ISSUES as INITIAL_ISSUES,
  type Issue,
  type StatusKey,
  type PriorityKey,
  type ProjectId,
  type LabelId,
  type UserId,
} from "@/lib/mock";
import { useUI } from "./ui";

type IssuesState = {
  issues: Issue[];
  setStatus: (id: string, status: StatusKey) => void;
  setPriority: (id: string, priority: PriorityKey) => void;
  toggleAssignee: (id: string, userId: UserId) => void;
  setTitle: (id: string, title: string) => void;
  setDescription: (id: string, description: string) => void;
  setDueDate: (id: string, dueDate: string | undefined) => void;
  setEstimate: (id: string, points: number | undefined) => void;
  setProject: (id: string, projectId: ProjectId) => void;
  addLabel: (id: string, labelId: LabelId) => void;
  removeLabel: (id: string, labelId: LabelId) => void;
  /** Adds a new issue. Returns the new issue's id. */
  addIssue: (input: Omit<Issue, "id" | "key" | "number" | "createdAt" | "updatedAt" | "urlCount" | "attachmentCount" | "subIssueIds" | "blockedBy" | "pending" | "archived"> & { id?: string; key?: string; number?: number; subIssueIds?: string[]; blockedBy?: string[]; }) => string;
  /** Move to a status + position within a group. Pass `toIndex = -1` for end. */
  moveToStatus: (id: string, status: StatusKey, toIndex?: number) => void;
  /** Reorder within or across groups. The set of affected ids is returned via the call site. */
  reorderInGroup: (status: StatusKey, fromIndex: number, toIndex: number) => void;
  archiveIssue: (id: string) => void;
  unarchiveIssue: (id: string) => void;
  /** Bulk: set status for many issues at once. */
  bulkSetStatus: (ids: string[], status: StatusKey) => void;
  /** Bulk: archive many issues. */
  bulkArchive: (ids: string[]) => void;
  /** Bulk: add an assignee to many issues. */
  bulkAssign: (ids: string[], userId: UserId) => void;
  /** Bulk: add a label to many issues. */
  bulkAddLabel: (ids: string[], labelId: LabelId) => void;
  /** Legacy: undo a specific issue's most recent mutation (per-issue HISTORY). */
  undo: (id: string) => void;
  /** Reset to initial data (for tests). */
  reset: () => void;
};

const HISTORY = new Map<string, Partial<Issue>[]>();

function now(): string {
  return new Date().toISOString();
}

function pushHistory(id: string, prev: Partial<Issue>): void {
  const list = HISTORY.get(id) ?? [];
  list.push(prev);
  HISTORY.set(id, list);
}

function nextIssueNumber(projectId: string): number {
  const used = INITIAL_ISSUES.filter((i) => i.projectId === projectId).map((i) => i.number);
  const projectPrefix = projectId.split("_")[1] ?? "x";
  return Math.max(1000, ...used) + 1 + Math.floor(Math.random() * 3);
}

const PROJECT_KEY: Record<string, string> = {
  p_eng: "ENG",
  p_design: "DES",
  p_ops: "OPS",
};

export const useIssues = create<IssuesState>((set, get) => ({
  issues: INITIAL_ISSUES,

  setStatus: (id, status) =>
    set((s) => {
      const prev = s.issues.find((i) => i.id === id);
      if (prev) pushHistory(id, { status: prev.status });
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, status, updatedAt: now() } : i,
      );
      return { issues };
    }),

  setPriority: (id, priority) =>
    set((s) => {
      const prev = s.issues.find((i) => i.id === id);
      if (prev) pushHistory(id, { priority: prev.priority });
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, priority, updatedAt: now() } : i,
      );
      return { issues };
    }),

  toggleAssignee: (id, userId) =>
    set((s) => {
      const issues = s.issues.map((i) => {
        if (i.id !== id) return i;
        const has = i.assigneeIds.includes(userId);
        return {
          ...i,
          assigneeIds: has
            ? i.assigneeIds.filter((u) => u !== userId)
            : [...i.assigneeIds, userId],
          updatedAt: now(),
        };
      });
      return { issues };
    }),

  setTitle: (id, title) =>
    set((s) => {
      const prev = s.issues.find((i) => i.id === id);
      if (prev) pushHistory(id, { title: prev.title });
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, title, updatedAt: now() } : i,
      );
      return { issues };
    }),

  setDescription: (id, description) =>
    set((s) => {
      const prev = s.issues.find((i) => i.id === id);
      if (prev) pushHistory(id, { description: prev.description });
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, description, updatedAt: now() } : i,
      );
      return { issues };
    }),

  setDueDate: (id, dueDate) =>
    set((s) => {
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, dueDate, updatedAt: now() } : i,
      );
      return { issues };
    }),

  setEstimate: (id, points) =>
    set((s) => {
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, estimatePoints: points, updatedAt: now() } : i,
      );
      return { issues };
    }),

  setProject: (id, projectId) =>
    set((s) => {
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, projectId, updatedAt: now() } : i,
      );
      return { issues };
    }),

  addLabel: (id, labelId) =>
    set((s) => {
      const issues = s.issues.map((i) =>
        i.id === id && !i.labelIds.includes(labelId)
          ? { ...i, labelIds: [...i.labelIds, labelId], updatedAt: now() }
          : i,
      );
      return { issues };
    }),

  removeLabel: (id, labelId) =>
    set((s) => {
      const issues = s.issues.map((i) =>
        i.id === id
          ? { ...i, labelIds: i.labelIds.filter((l) => l !== labelId), updatedAt: now() }
          : i,
      );
      return { issues };
    }),

  addIssue: (input) => {
    const id = input.id ?? `i_${input.projectId.split("_")[1] ?? "x"}_${Date.now().toString(36)}`;
    const number = input.number ?? nextIssueNumber(input.projectId);
    const keyPrefix = PROJECT_KEY[input.projectId] ?? input.projectId.toUpperCase();
    const key = input.key ?? `${keyPrefix}-${number}`;
    const issue: Issue = {
      ...input,
      id,
      key,
      number,
      urlCount: 0,
      attachmentCount: 0,
      subIssueIds: input.subIssueIds ?? [],
      blockedBy: input.blockedBy ?? [],
      createdAt: now(),
      updatedAt: now(),
    } as Issue;
    set((s) => ({ issues: [issue, ...s.issues] }));
    return id;
  },

  moveToStatus: (id, status, toIndex) =>
    set((s) => {
      const prev = s.issues.find((i) => i.id === id);
      if (!prev) return s;
      pushHistory(id, { status: prev.status });

      // Remove from current position
      const without = s.issues.filter((i) => i.id !== id);
      // Compute insertion index within target group
      const targetGroup = without.filter((i) => i.status === status);
      const insertAt =
        toIndex == null || toIndex < 0 || toIndex > targetGroup.length
          ? targetGroup.length
          : toIndex;

      // Re-insert into target group at insertAt, preserving overall order
      let inserted = false;
      const reordered: Issue[] = [];
      let targetSeen = 0;
      for (const i of without) {
        if (i.status === status && targetSeen === insertAt) {
          reordered.push({ ...prev, status, updatedAt: now() });
          inserted = true;
        }
        reordered.push(i);
        if (i.status === status) targetSeen++;
      }
      if (!inserted) reordered.push({ ...prev, status, updatedAt: now() });

      return { issues: reordered };
    }),

  reorderInGroup: (status, fromIndex, toIndex) =>
    set((s) => {
      const group = s.issues.filter((i) => i.status === status);
      if (
        fromIndex < 0 ||
        fromIndex >= group.length ||
        toIndex < 0 ||
        toIndex > group.length ||
        fromIndex === toIndex
      ) {
        return s;
      }
      const moved = group[fromIndex]!;
      const newGroup = [...group];
      newGroup.splice(fromIndex, 1);
      newGroup.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);

      // Re-stitch into the full list
      let gi = 0;
      const issues = s.issues.map((i) => {
        if (i.status !== status) return i;
        return newGroup[gi++]!;
      });
      return { issues };
    }),

  archiveIssue: (id) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, archived: true, updatedAt: now() } : i,
      ),
    })),

  unarchiveIssue: (id) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, archived: false, updatedAt: now() } : i,
      ),
    })),

  bulkSetStatus: (ids, status) =>
    set((s) => {
      const set = new Set(ids);
      const issues = s.issues.map((i) => {
        if (!set.has(i.id)) return i;
        pushHistory(i.id, { status: i.status });
        return { ...i, status, updatedAt: now() };
      });
      return { issues };
    }),

  bulkArchive: (ids) =>
    set((s) => {
      const set = new Set(ids);
      const issues = s.issues.map((i) =>
        set.has(i.id) ? { ...i, archived: true, updatedAt: now() } : i,
      );
      return { issues };
    }),

  bulkAssign: (ids, userId) =>
    set((s) => {
      const set = new Set(ids);
      const issues = s.issues.map((i) => {
        if (!set.has(i.id) || i.assigneeIds.includes(userId)) return i;
        return { ...i, assigneeIds: [...i.assigneeIds, userId], updatedAt: now() };
      });
      return { issues };
    }),

  bulkAddLabel: (ids, labelId) =>
    set((s) => {
      const set = new Set(ids);
      const issues = s.issues.map((i) => {
        if (!set.has(i.id) || i.labelIds.includes(labelId)) return i;
        return { ...i, labelIds: [...i.labelIds, labelId], updatedAt: now() };
      });
      return { issues };
    }),

  undo: (id) =>
    set((s) => {
      const list = HISTORY.get(id);
      if (!list || list.length === 0) return s;
      const last = list.pop()!;
      const issues = s.issues.map((i) =>
        i.id === id ? { ...i, ...last, updatedAt: now() } : i,
      );
      return { issues };
    }),

  reset: () => set({ issues: INITIAL_ISSUES }),
}));
