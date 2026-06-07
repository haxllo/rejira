'use client';

import { useActiveMember } from '@/lib/auth/client';
import type { WorkspaceRole } from '@/lib/auth/workspace-types';

interface MembershipInfo {
  membershipId: string | null;
  role: WorkspaceRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useMembership(): MembershipInfo {
  const { data: member, isPending } = useActiveMember();

  const role = (member?.role as WorkspaceRole) ?? null;

  return {
    membershipId: (member?.id as string) ?? null,
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isLoading: isPending,
  };
}
