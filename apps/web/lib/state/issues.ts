'use client';

import { create } from 'zustand';
import type { Issue, StatusKey } from '@/lib/db/types';

type IssuesState = {
  issues: Issue[];
  setIssues: (issues: Issue[]) => void;
  setOne: (issue: Issue) => void;
  removeOne: (id: string) => void;
  hydrate: (incoming: Issue[]) => void;
  reset: () => void;
  reorderInGroup: (status: StatusKey, fromIndex: number, toIndex: number) => void;
  moveToStatus: (id: string, status: StatusKey, toIndex?: number) => void;
};

export const useIssues = create<IssuesState>((set, get) => ({
  issues: [],

  setIssues: (issues) => set({ issues }),

  setOne: (issue) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        (i.id ?? i.externalId) === (issue.id ?? issue.externalId) ? issue : i,
      ),
    })),

  removeOne: (id) =>
    set((s) => ({
      issues: s.issues.filter((i) => (i.id ?? i.externalId) !== id),
    })),

  hydrate: (incoming) => set({ issues: incoming }),

  reset: () => set({ issues: [] }),

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

      let gi = 0;
      const issues = s.issues.map((i) => {
        if (i.status !== status) return i;
        return newGroup[gi++]!;
      });
      return { issues };
    }),

  moveToStatus: (id, status, toIndex) =>
    set((s) => {
      const prev = s.issues.find((i) => (i.id ?? i.externalId) === id);
      if (!prev) return s;

      const without = s.issues.filter((i) => (i.id ?? i.externalId) !== id);
      const targetGroup = without.filter((i) => i.status === status);
      const insertAt =
        toIndex == null || toIndex < 0 || toIndex > targetGroup.length
          ? targetGroup.length
          : toIndex;

      let inserted = false;
      const reordered: Issue[] = [];
      let targetSeen = 0;
      for (const i of without) {
        if (i.status === status && targetSeen === insertAt) {
          reordered.push({ ...prev, status, updatedAt: new Date().toISOString() } as Issue);
          inserted = true;
        }
        reordered.push(i);
        if (i.status === status) targetSeen++;
      }
      if (!inserted) reordered.push({ ...prev, status, updatedAt: new Date().toISOString() } as Issue);

      return { issues: reordered };
    }),
}));
