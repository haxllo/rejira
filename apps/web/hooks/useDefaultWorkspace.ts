'use client';

import { useWorkspaceList } from '@/hooks/useWorkspaceList';
import type { WorkspaceInfo } from '@/hooks/useWorkspaceList';

export function useDefaultWorkspace(): WorkspaceInfo | null {
  const { activeWorkspace, workspaces, isLoading } = useWorkspaceList();

  if (isLoading) return null;

  if (activeWorkspace) return activeWorkspace;

  if (workspaces.length > 0) return workspaces[0];

  return null;
}
