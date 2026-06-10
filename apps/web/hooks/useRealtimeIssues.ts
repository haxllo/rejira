'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { subscribeToIssues } from '@/lib/realtime/subscriptions';

export function useRealtimeIssues(workspaceId: string) {
  const router = useRouter();
  const revalidate = useDebouncedCallback(() => {
    router.refresh();
  }, 200);

  useEffect(() => {
    if (!workspaceId) return;
    const sub = subscribeToIssues(workspaceId, () => revalidate());
    return () => sub.unsubscribe();
  }, [workspaceId, revalidate]);
}
