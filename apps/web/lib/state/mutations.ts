'use client';

import { useUI } from './ui';
import { useIssues } from './issues';

export type IssueId = string;

export type ToastVariant = 'success' | 'info' | 'error';

export type MutationContext = {
  message: string;
  detail?: string;
  affectedIds: IssueId[];
  undo: () => void;
  retry: () => void;
  viewAction?: { label: string; run: () => void };
  variant?: ToastVariant;
  run: () => Promise<unknown>;
};

export type LastError = {
  message: string;
  at: number;
  affectedIds: IssueId[];
};

const STACK: MutationContext[] = [];
const MAX_DEPTH = 50;

let hostBridge: ((ctx: MutationContext) => void) | null = null;
let lastError: LastError | null = null;
const errorListeners = new Set<(err: LastError | null) => void>();

export function bindToastHost(fn: (ctx: MutationContext) => void): () => void {
  hostBridge = fn;
  return () => {
    if (hostBridge === fn) hostBridge = null;
  };
}

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

export function apply(ctx: MutationContext): void {
  if (STACK.length >= MAX_DEPTH) STACK.shift();
  STACK.push(ctx);
  setPending(ctx.affectedIds, true);
  hostBridge?.(ctx);

  ctx.run()
    .then(() => {
      setPending(ctx.affectedIds, false);
    })
    .catch((err) => {
      setPending(ctx.affectedIds, false);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      recordError(message);
    });
}

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

export function retryLast(): boolean {
  const ctx = STACK[STACK.length - 1];
  if (!ctx) return false;
  ctx.run()
    .then(() => {
      setPending(ctx.affectedIds, false);
      setLastError(null);
    })
    .catch((err) => {
      setPending(ctx.affectedIds, false);
      setLastError({
        message: ctx.message,
        at: Date.now(),
        affectedIds: ctx.affectedIds,
      });
    });
  return true;
}

export function recordError(message?: string): void {
  const ctx = STACK[STACK.length - 1];
  if (!ctx) return;
  setLastError({
    message: message ?? ctx.message,
    at: Date.now(),
    affectedIds: ctx.affectedIds,
  });
}

export function getLastError(): LastError | null {
  return lastError;
}

function setPending(ids: IssueId[], pending: boolean): void {
  if (ids.length === 0) return;
  if (typeof window === 'undefined') return;
  const store = useIssues.getState();
  const sn = store.issues.map((i) => {
    if (ids.includes(i.id ?? i.externalId ?? '')) {
      return { ...i, pending } as typeof i;
    }
    return i;
  });
  useIssues.setState({ issues: sn as Issue[] });
  if (pending) {
    requestAnimationFrame(() => {
      const current = useIssues.getState().issues;
      const cleared = current.map((i) => {
        if (ids.includes(i.id ?? i.externalId ?? '')) {
          return { ...i, pending: false } as typeof i;
        }
        return i;
      });
      useIssues.setState({ issues: cleared as Issue[] });
    });
  }
}

export function undoStack(): readonly MutationContext[] {
  return STACK;
}

export function toast(message: string, viewAction?: MutationContext['viewAction']): void {
  hostBridge?.({
    message,
    affectedIds: [],
    undo: () => {},
    retry: () => {},
    viewAction,
    variant: 'info',
    run: () => Promise.resolve(),
  });
}

export function dispatchToastEvent(detail: {
  message: string;
  actionLabel?: string;
  action?: () => void;
  detail?: string;
  variant?: ToastVariant;
  viewAction?: MutationContext['viewAction'];
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('jira:toast', { detail }));
}

export function isPending(id: IssueId): boolean {
  return useIssues.getState().issues.find((i) => (i.id ?? i.externalId ?? '') === id)?.pending === true;
}

export { useUI };

import type { Issue } from '@/lib/db/types';
