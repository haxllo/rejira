// Phase 4 — Hook that integrates Convex mutations with the apply() pipeline.
// Callers use useApply() instead of directly calling Zustand store methods.
// Optimistic: Zustand updates immediately, Convex syncs in background.

"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useIssues } from "@/lib/state/issues";
import { apply, type IssueId } from "@/lib/state/mutations";

export function useConvexApply(workspaceId: any) {
  const setStatus = useMutation(api.issues.setStatus);
  const setPriority = useMutation(api.issues.setPriority);
  const setTitle = useMutation(api.issues.setTitle);
  const updateAssignee = useMutation(api.issues.setAssignee);
  const archiveIssue = useMutation(api.issues.archive);
  const createIssue = useMutation(api.issues.create);

  const changeStatus = useCallback((id: IssueId, status: string) => {
    const prev = useIssues.getState().issues.find((i) => i.id === id)?.status;
    useIssues.getState().setStatus(id, status as any);

    apply({
      message: `Status → ${status}`,
      affectedIds: [id],
      undo: () => useIssues.getState().setStatus(id, prev as any),
      retry: () => changeStatus(id, status),
    });

    setStatus({ issueId: id as any, status } as any).catch(() => {
      useIssues.getState().setStatus(id, prev as any);
    });
  }, [setStatus]);

  const changePriority = useCallback((id: IssueId, priority: string) => {
    const prev = useIssues.getState().issues.find((i) => i.id === id)?.priority;
    useIssues.getState().setPriority(id, priority as any);

    apply({
      message: `Priority → ${priority}`,
      affectedIds: [id],
      undo: () => useIssues.getState().setPriority(id, prev as any),
      retry: () => changePriority(id, priority),
    });

    setPriority({ issueId: id as any, priority } as any).catch(() => {
      useIssues.getState().setPriority(id, prev as any);
    });
  }, [setPriority]);

  return { changeStatus, changePriority };
}
