'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToMemberships } from '@/lib/realtime/subscriptions';

export function useRealtimeMemberships(workspaceId: string) {
  const router = useRouter();

  useEffect(() => {
    if (!workspaceId) return;
    const sub = subscribeToMemberships(workspaceId, () => router.refresh());
    return () => sub.unsubscribe();
  }, [workspaceId, router]);
}
