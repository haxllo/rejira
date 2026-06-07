'use client';

import { useSession } from '@/lib/auth/client';

export function useCurrentUserId(): string | null {
  const { data: session } = useSession();
  if (session?.user?.id) return session.user.id as string;
  return null;
}

export function useCurrentUser() {
  const { data: session, isPending } = useSession();
  return session?.user ?? null;
}
