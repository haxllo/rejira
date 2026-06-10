'use client';

import { useListOrganizations, useActiveOrganization, useSession } from '@/lib/auth/client';
import { useMemo } from 'react';

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role?: string;
  isActive: boolean;
}

export function useWorkspaceList(): {
  workspaces: WorkspaceInfo[];
  activeWorkspace: WorkspaceInfo | null;
  isLoading: boolean;
} {
  const { data: organizations, isPending: orgsLoading } = useListOrganizations();
  const { data: activeOrg, isPending: activeLoading } = useActiveOrganization();
  const { data: session } = useSession();

  const workspaces = useMemo(() => {
    if (!organizations) return [];
    const list = Array.isArray(organizations) ? organizations : [organizations];
    return list.filter(Boolean).map((org: Record<string, unknown>) => ({
      id: (org.id as string) ?? '',
      name: (org.name as string) ?? 'Unknown',
      slug: (org.slug as string) ?? (org.name as string)?.toLowerCase().replace(/\s+/g, '-') ?? '',
      role: (org.role as string) ?? 'member',
      isActive: activeOrg?.id === org.id,
    }));
  }, [organizations, activeOrg]);

  const activeWorkspace = useMemo(() => {
    if (!activeOrg) return workspaces[0] ?? null;
    return workspaces.find((w: WorkspaceInfo) => w.id === activeOrg.id) ?? workspaces[0] ?? null;
  }, [workspaces, activeOrg]);

  return {
    workspaces,
    activeWorkspace,
    isLoading: orgsLoading || activeLoading,
  };
}
