// Phase 4E — Data sync provider. Pushes issue data into Zustand store.
// Uses Convex when authenticated, falls back to mock.
"use client";

import { useEffect } from "react";
import { useIssues } from "@/lib/state/issues";
import { useIssuesSource } from "@/hooks/useIssuesSource";

export function DataSyncProvider({
  workspaceId,
  children,
}: {
  workspaceId?: string;
  children: React.ReactNode;
}) {
  const source = useIssuesSource(workspaceId);
  const syncData = useIssues((s) => s.syncData);

  useEffect(() => {
    if (source.length > 0) syncData(source);
  }, [source, syncData]);

  return <>{children}</>;
}
