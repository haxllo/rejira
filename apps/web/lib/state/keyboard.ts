"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUI } from "./ui";
import { undoLast, isPending } from "./mutations";
import { useIssues } from "./issues";

/**
 * Global keyboard handler mounted in the workspace layout.
 * Handles: ⌘K, /, C, ?, Esc, G-then-X go-to combos, ⌘+A select all, Z undo.
 * Per-row shortcuts (1-5 status) live in IssueRow / IssueDrawer.
 */
export function useGlobalKeyboard() {
  const router = useRouter();
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const closeDrawer = useUI((s) => s.closeDrawer);
  const closeCreateIssue = useUI((s) => s.closeCreateIssue);
  const closeCheatsheet = useUI((s) => s.closeCheatsheet);
  const openCreateIssue = useUI((s) => s.openCreateIssue);
  const openCheatsheet = useUI((s) => s.openCheatsheet);
  const commandOpen = useUI((s) => s.commandOpen);
  const createOpen = useUI((s) => s.createIssueOpen);
  const cheatsheetOpen = useUI((s) => s.cheatsheetOpen);
  const drawerOpen = useUI((s) => s.drawerIssueId != null);
  const dragging = useUI((s) => s.dragging);
  const cancelDrag = useUI((s) => s.cancelDrag);
  const clearSelected = useUI((s) => s.clearSelected);
  const selectedSize = useUI((s) => s.selectedIssueIds.size);

  // g-then-x nav (Linear-style)
  const lastGRef = React.useRef<number>(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea/contenteditable
      const t = e.target as HTMLElement | null;
      const inField =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          (t as HTMLElement).isContentEditable);
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K — palette
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // ⌘A — select all visible issues
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (typeof document === "undefined") return;
        const nodes = document.querySelectorAll<HTMLElement>("[data-issue-id]");
        const ids: string[] = [];
        const seen = new Set<string>();
        for (const n of Array.from(nodes)) {
          const id = n.dataset.issueId;
          if (id && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
        }
        useUI.getState().setSelected(ids);
        return;
      }

      // Esc — close whatever is open (drag / drawer / dialog / cheatsheet / command / selection)
      if (e.key === "Escape") {
        if (dragging) {
          cancelDrag();
          return;
        }
        if (commandOpen) {
          setCommandOpen(false);
          return;
        }
        if (createOpen) {
          closeCreateIssue();
          return;
        }
        if (cheatsheetOpen) {
          closeCheatsheet();
          return;
        }
        if (drawerOpen) {
          closeDrawer();
          return;
        }
        if (selectedSize > 0) {
          clearSelected();
          return;
        }
        return;
      }

      // Skip rest if in field
      if (inField) return;
      if (mod) return;

      // Z (no shift) — undo last mutation
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (undoLast()) {
          e.preventDefault();
        }
        return;
      }

      // ? — cheatsheet
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        openCheatsheet();
        return;
      }

      // C — create issue
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        openCreateIssue();
        return;
      }

      // / — focus search
      if (e.key === "/") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Search"]');
        el?.focus();
        return;
      }

      // g — go-to (within 1.5s)
      if (e.key === "g") {
        lastGRef.current = Date.now();
        return;
      }

      // go-to combos (only within 1.5s of g)
      const sinceG = Date.now() - lastGRef.current;
      if (sinceG < 1500) {
        const map: Record<string, string> = {
          i: "/inbox",
          m: "/my-issues",
          h: "/home",
          p: "/projects/eng/issues",
          c: "/projects/eng/cycles/23",
          s: "/search",
          v: "/views/all",
        };
        const k = e.key.toLowerCase();
        if (map[k]) {
          e.preventDefault();
          lastGRef.current = 0;
          router.push(map[k]);
          return;
        }
      }

      // Shift+D — cycle density is handled by the StatusBar component
      // (it owns the URL persistence + first-paint flash UX).
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    router,
    commandOpen,
    createOpen,
    cheatsheetOpen,
    drawerOpen,
    dragging,
    cancelDrag,
    selectedSize,
    clearSelected,
    setCommandOpen,
    openCreateIssue,
    closeCreateIssue,
    openCheatsheet,
    closeCheatsheet,
  ]);
}
