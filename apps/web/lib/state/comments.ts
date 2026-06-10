'use client';

import { create } from 'zustand';
import type { Comment } from '@/lib/db/types';

interface CommentsState {
  byIssueId: Record<string, Comment[]>;
  setComments: (issueId: string, comments: Comment[]) => void;
  append: (issueId: string, comment: Comment) => void;
  replace: (issueId: string, comment: Comment) => void;
  remove: (issueId: string, commentId: string) => void;
}

export const useComments = create<CommentsState>((set) => ({
  byIssueId: {},

  setComments: (issueId, comments) =>
    set((s) => ({
      byIssueId: { ...s.byIssueId, [issueId]: comments },
    })),

  append: (issueId, comment) =>
    set((s) => ({
      byIssueId: {
        ...s.byIssueId,
        [issueId]: [...(s.byIssueId[issueId] ?? []), comment],
      },
    })),

  replace: (issueId, comment) =>
    set((s) => {
      const existing = s.byIssueId[issueId] ?? [];
      const commentKey = (comment as Record<string, unknown>).externalId ?? (comment as Record<string, unknown>).id;
      return {
        byIssueId: {
          ...s.byIssueId,
          [issueId]: existing.map((c) => {
            const cKey = (c as Record<string, unknown>).externalId ?? (c as Record<string, unknown>).id;
            return cKey === commentKey ? comment : c;
          }),
        },
      };
    }),

  remove: (issueId, commentId) =>
    set((s) => {
      const existing = s.byIssueId[issueId] ?? [];
      return {
        byIssueId: {
          ...s.byIssueId,
          [issueId]: existing.filter((c) => {
            const cKey = (c as Record<string, unknown>).externalId ?? (c as Record<string, unknown>).id;
            return cKey !== commentId;
          }),
        },
      };
    }),
}));
