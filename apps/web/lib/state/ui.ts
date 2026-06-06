"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Density = "compact" | "default" | "roomy";

type UIState = {
  density: Density;
  setDensity: (d: Density) => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  toggleCommand: () => void;

  drawerIssueId: string | null;
  drawerPrevFocusEl: HTMLElement | null;
  openDrawer: (issueId: string, fromEl?: HTMLElement | null) => void;
  closeDrawer: () => void;

  selectedIssueIds: Set<string>;
  selectionAnchorId: string | null;
  toggleSelected: (id: string, opts?: { anchor?: boolean }) => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  setSelected: (ids: string[]) => void;
  clearSelected: () => void;

  /** Active drag operation (set by 1D/1E, cleared on drop or Esc). */
  dragging: { ids: string[]; label: string } | null;
  startDrag: (ids: string[], label: string) => void;
  cancelDrag: () => void;
  endDrag: () => void;

  groupBy: "status" | "priority" | "assignee" | "none";
  setGroupBy: (g: UIState["groupBy"]) => void;

  sortKey: "updated" | "created" | "priority" | "due";
  sortDir: "asc" | "desc";
  setSort: (key: UIState["sortKey"], dir?: UIState["sortDir"]) => void;

  showCompletedCycles: boolean;
  toggleCompletedCycles: () => void;

  createIssueOpen: boolean;
  openCreateIssue: () => void;
  closeCreateIssue: () => void;

  cheatsheetOpen: boolean;
  openCheatsheet: () => void;
  closeCheatsheet: () => void;
};

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      density: "default",
      setDensity: (d) => {
        set({ density: d });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.density = d;
        }
      },

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

      drawerIssueId: null,
      drawerPrevFocusEl: null,
      openDrawer: (issueId, fromEl) =>
        set({ drawerIssueId: issueId, drawerPrevFocusEl: fromEl ?? null }),
      closeDrawer: () => {
        const prev = get().drawerPrevFocusEl;
        set({ drawerIssueId: null });
        // Restore focus after the drawer animates out
        setTimeout(() => prev?.focus?.(), 240);
      },

      selectedIssueIds: new Set(),
      selectionAnchorId: null,
      toggleSelected: (id, opts) =>
        set((s) => {
          const next = new Set(s.selectedIssueIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return {
            selectedIssueIds: next,
            selectionAnchorId: opts?.anchor || !s.selectedIssueIds.has(id) ? id : s.selectionAnchorId,
          };
        }),
      selectRange: (fromId, toId, allIds) =>
        set((s) => {
          const fromIdx = allIds.indexOf(fromId);
          const toIdx = allIds.indexOf(toId);
          if (fromIdx === -1 || toIdx === -1) return s;
          const [lo, hi] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
          const next = new Set(s.selectedIssueIds);
          for (let i = lo; i <= hi; i++) next.add(allIds[i]!);
          return { selectedIssueIds: next, selectionAnchorId: toId };
        }),
      setSelected: (ids) => set({ selectedIssueIds: new Set(ids) }),
      clearSelected: () => set({ selectedIssueIds: new Set(), selectionAnchorId: null }),

      dragging: null,
      startDrag: (ids, label) => set({ dragging: { ids, label } }),
      cancelDrag: () => set({ dragging: null }),
      endDrag: () => set({ dragging: null }),

      groupBy: "none",
      setGroupBy: (g) => set({ groupBy: g }),

      sortKey: "updated",
      sortDir: "desc",
      setSort: (key, dir) =>
        set((s) => ({
          sortKey: key,
          sortDir: dir ?? (s.sortKey === key ? (s.sortDir === "asc" ? "desc" : "asc") : "desc"),
        })),

      showCompletedCycles: false,
      toggleCompletedCycles: () =>
        set((s) => ({ showCompletedCycles: !s.showCompletedCycles })),

      createIssueOpen: false,
      openCreateIssue: () => set({ createIssueOpen: true }),
      closeCreateIssue: () => set({ createIssueOpen: false }),

      cheatsheetOpen: false,
      openCheatsheet: () => set({ cheatsheetOpen: true }),
      closeCheatsheet: () => set({ cheatsheetOpen: false }),
    }),
    {
      name: "jira-redesign-ui",
      partialize: (s) => ({
        density: s.density,
        groupBy: s.groupBy,
        sortKey: s.sortKey,
        sortDir: s.sortDir,
        showCompletedCycles: s.showCompletedCycles,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.density && typeof document !== "undefined") {
          document.documentElement.dataset.density = state.density;
        }
      },
    },
  ),
);
