// Phase 4E — Dual-source issues hook.
// Uses Convex when authenticated, falls back to mock data.
"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useSession } from "@/lib/auth/client";
import { ISSUES, type Issue } from "@/lib/mock";

export function useIssuesSource(workspaceId?: string, projectId?: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const convexIssues = useQuery(
    api.issues.list,
    isAuthenticated && workspaceId
      ? { workspaceId: workspaceId as any, projectId: projectId as any }
      : "skip",
  );

  if (isAuthenticated && convexIssues) {
    return convexIssues as any as Issue[];
  }

  // Fallback to mock data
  let filtered = ISSUES as Issue[];
  if (projectId) {
    filtered = filtered.filter((i) => i.projectId === projectId);
  }
  return filtered;
}
