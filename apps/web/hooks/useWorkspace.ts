'use client';

import { useSearchParams } from 'next/navigation';
import { useWorkspaceList } from '@/hooks/useWorkspaceList';
import type { WorkspaceInfo } from '@/hooks/useWorkspaceList';

export function useWorkspace(): WorkspaceInfo & { isLoading: boolean; error: string | null } {
  const searchParams = useSearchParams();
  const urlWorkspace = searchParams.get('w');
  const { workspaces, activeWorkspace, isLoading } = useWorkspaceList();

  if (isLoading) {
    return {
      id: '',
      name: '',
      slug: '',
      isLoading: true,
      error: null,
    };
  }

  if (urlWorkspace) {
    const match = workspaces.find((w: WorkspaceInfo) => w.slug === urlWorkspace);
    if (match) return { ...match, isLoading: false, error: null };
  }

  if (activeWorkspace) {
    return { ...activeWorkspace, isLoading: false, error: null };
  }

  if (workspaces.length > 0) {
    return { ...workspaces[0], isLoading: false, error: null };
  }

  return {
    id: '',
    name: '',
    slug: '',
    isLoading: false,
    error: 'No workspaces found',
  };
}

export { useWorkspaceList };
