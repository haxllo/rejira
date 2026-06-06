"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterState, GroupBy, SortKey, SortDir } from "./view-query";

export type SavedView = {
  id: string;
  name: string;
  filter: FilterState;
  group: GroupBy;
  sortKey: SortKey;
  sortDir: SortDir;
  starred: boolean;
  createdAt: string;
};

type SavedViewsState = {
  views: SavedView[];
  save: (v: Omit<SavedView, "id" | "createdAt">) => SavedView;
  remove: (id: string) => void;
  toggleStar: (id: string) => void;
  rename: (id: string, name: string) => void;
};

let counter = 0;
const newId = () => `v_${Date.now().toString(36)}_${(++counter).toString(36)}`;

export const useSavedViews = create<SavedViewsState>()(
  persist(
    (set) => ({
      views: [],
      save: (v) => {
        const view: SavedView = { ...v, id: newId(), createdAt: new Date().toISOString() };
        set((s) => ({ views: [view, ...s.views] }));
        return view;
      },
      remove: (id) => set((s) => ({ views: s.views.filter((v) => v.id !== id) })),
      toggleStar: (id) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, starred: !v.starred } : v)),
        })),
      rename: (id, name) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, name } : v)),
        })),
    }),
    {
      name: "jira-redesign-saved-views",
    },
  ),
);
