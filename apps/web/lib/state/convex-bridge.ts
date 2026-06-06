// Phase 4 — Convex mutation bridge.
"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";

export function useIssueMutations() {
  const setStatus = useMutation(api.issues.setStatus);
  const setPriority = useMutation(api.issues.setPriority);
  const setTitle = useMutation(api.issues.setTitle);
  const setAssignee = useMutation(api.issues.setAssignee);
  const archive = useMutation(api.issues.archive);
  const create = useMutation(api.issues.create);
  const bulkArchive = useMutation(api.issues.bulkArchive);

  return {
    setStatus: async (issueId: any, status: any) => setStatus({ issueId, status }),
    setPriority: async (issueId: any, priority: any) => setPriority({ issueId, priority }),
    setTitle: async (issueId: any, title: any) => setTitle({ issueId, title }),
    setAssignee: async (issueId: any, assigneeIds: any) => setAssignee({ issueId, assigneeIds }),
    archive: async (issueId: any) => archive({ issueId }),
    create: async (args: any) => create(args),
    bulkArchive: async (issueIds: any) => bulkArchive({ issueIds }),
  };
}
