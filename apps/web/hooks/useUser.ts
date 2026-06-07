'use client';

import { useSession } from '@/lib/auth/client';

export function useUser() {
  const { data: session, isPending } = useSession();
  return { user: session?.user ?? null, isLoading: isPending };
}

export function useUserId(): string | null {
  const { data: session } = useSession();
  if (session?.user?.id) return session.user.id as string;
  return null;
}
