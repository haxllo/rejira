"use client";

import { useUI } from "./ui";
import { useIssues } from "./issues";

/**
 * Global optimistic mutation pipeline.
 *
 * Every state-changing action in the app funnels through `apply(ctx)`. The
 * pipeline:
 *   1. Pushes the context onto a global STACK (so the most recent action can
 *      be undone with `Z` or by clicking the toast)
 *   2. Calls the mutation, which writes to the store and sets `pending = true`
 *      on the affected issues
 *   3. Dispatches a `jira:toast` CustomEvent with a 5s expiry
 *   4. In a real backend integration, would await fetch + either clear
 *      `pending` on success or restore the previous state on failure
 *
 * In the mock, `set` is synchronous and `pending` is cleared on the next tick
 * via `requestAnimationFrame`. The pipeline shape works for a real backend
 * later without changes to the call sites.
 */

export type IssueId = string;

export type ToastVariant = "success" | "info" | "error";

export type MutationContext = {
  /** Short, human-readable label: "Moved to In Progress" */
  message: string;
  /** Optional secondary line shown under the message */
  detail?: string;
  /** Issue IDs affected by this mutation (for the pending pulse + group undo) */
  affectedIds: IssueId[];
  /** Reverts the mutation. Closes over the pre-mutation snapshot. */
  undo: () => void;
  /** Re-runs the mutation (used when the previous attempt errored) */
  retry: () => void;
  /** Optional secondary action: "View", "Open", etc. */
  viewAction?: { label: string; run: () => void };
  /** Variant for the toast icon (default: success) */
  variant?: ToastVariant;
};

export type LastError = {
  /** The mutation's message, shown in the toast */
  message: string;
  /** ISO timestamp the error was recorded */
  at: number;
  /** IDs the failed mutation affected (for the persistent error badge) */
  affectedIds: IssueId[];
};

const STACK: MutationContext[] = [];
const MAX_DEPTH = 50;

let hostBridge: ((ctx: MutationContext) => void) | null = null;
let lastError: LastError | null = null;
const errorListeners = new Set<(err: LastError | null) => void>();

/** Called by ToastHost on mount so apply() can fire toasts without React. */
export function bindToastHost(fn: (ctx: MutationContext) => void): () => void {
  hostBridge = fn;
  return () => {
    if (hostBridge === fn) hostBridge = null;
  };
}

/** Subscribe to lastError changes (used by the toast host to swap to error UI). */
export function subscribeLastError(fn: (err: LastError | null) => void): () => void {
  errorListeners.add(fn);
  fn(lastError);
  return () => {
    errorListeners.delete(fn);
  };
}

function setLastError(err: LastError | null) {
  lastError = err;
  for (const l of errorListeners) l(err);
}

/**
 * Apply a mutation. Pushes the context onto the undo stack, marks affected
 * issues as pending, runs the underlying mutation, and fires the toast.
 *
 * The mutation itself is executed synchronously by the caller, BEFORE apply()
 * is invoked. apply() is only responsible for bookkeeping + UX.
 */
export function apply(ctx: MutationContext): void {
  if (STACK.length >= MAX_DEPTH) STACK.shift();
  STACK.push(ctx);
  setPending(ctx.affectedIds, true);
  hostBridge?.(ctx);
}

/**
 * Undo the most recent mutation. Returns true if there was something to undo.
 * Called by the `Z` keyboard shortcut and the toast click.
 */
export function undoLast(): boolean {
  const ctx = STACK.pop();
  if (!ctx) return false;
  try {
    ctx.undo();
  } finally {
    setPending(ctx.affectedIds, false);
  }
  return true;
}

/**
 * Retry the most recent errored mutation. No-op if the most recent wasn't an
 * error. Returns true if a retry was attempted.
 */
export function retryLast(): boolean {
  const ctx = STACK[STACK.length - 1];
  if (!ctx) return false;
  try {
    ctx.retry();
    setPending(ctx.affectedIds, false);
    setLastError(null);
  } catch (e) {
    setPending(ctx.affectedIds, true);
    setLastError({
      message: ctx.message,
      at: Date.now(),
      affectedIds: ctx.affectedIds,
    });
  }
  return true;
}

/**
 * Mark the most recent mutation as errored. Sets `lastError` so the toast
 * host can render the error variant with a real Retry button. In a real
 * backend integration, the fetch promise's `.catch()` would call this.
 */
export function recordError(message?: string): void {
  const ctx = STACK[STACK.length - 1];
  if (!ctx) return;
  setLastError({
    message: message ?? ctx.message,
    at: Date.now(),
    affectedIds: ctx.affectedIds,
  });
}

/** Current `lastError` snapshot (used by the toast host to decide variant). */
export function getLastError(): LastError | null {
  return lastError;
}

/** Mark a set of issues as pending (or clear). */
function setPending(ids: IssueId[], pending: boolean): void {
  if (ids.length === 0) return;
  if (typeof window === "undefined") return;
  useIssues.setState((s) => {
    const set = new Set(ids);
    return {
      issues: s.issues.map((i) => (set.has(i.id) ? { ...i, pending } : i)),
    };
  });
  // Auto-clear the pending flag on the next frame so the UI gets a brief
  // "saving" pulse even though the mock is synchronous.
  if (pending) {
    requestAnimationFrame(() => {
      useIssues.setState((s) => {
        const set = new Set(ids);
        return {
          issues: s.issues.map((i) => (set.has(i.id) ? { ...i, pending: false } : i)),
        };
      });
    });
  }
}

/** Read the current undo stack (for debugging / tests). */
export function undoStack(): readonly MutationContext[] {
  return STACK;
}

/** Convenience: dispatch a non-undoable toast (info / success without undo). */
export function toast(message: string, viewAction?: MutationContext["viewAction"]): void {
  hostBridge?.({
    message,
    affectedIds: [],
    undo: () => {},
    retry: () => {},
    viewAction,
    variant: "info",
  });
}

/** Bridge: dispatch a `jira:toast` CustomEvent with a structured payload. */
export function dispatchToastEvent(detail: {
  message: string;
  actionLabel?: string;
  action?: () => void;
  detail?: string;
  variant?: ToastVariant;
  viewAction?: MutationContext["viewAction"];
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jira:toast", { detail }));
}

/** Selectors that consumers can use without importing zustand directly. */
export function isPending(id: IssueId): boolean {
  return useIssues.getState().issues.find((i) => i.id === id)?.pending === true;
}

/** Used by the global keyboard handler to wire `Z` → undo. */
export { useUI };
