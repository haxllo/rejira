'use client';

import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToNotifications } from '@/lib/realtime/subscriptions';
import { useNotifications } from '@/lib/state/notifications';

export function useRealtimeNotifications(userId: string) {
  const refetch = useNotifications((s) => s.refetch);
  const setUnreadCount = useNotifications((s) => s.setUnreadCount);

  useEffect(() => {
    if (!userId) return;
    const sub = subscribeToNotifications(userId, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      refetch();
      if (payload.eventType === 'INSERT') {
        setUnreadCount((c) => c + 1);
      } else if (payload.eventType === 'UPDATE') {
        const wasUnread = !(payload.old as Record<string, unknown>)?.read;
        const isNowRead = !!(payload.new as Record<string, unknown>)?.read;
        if (wasUnread && isNowRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      }
    });
    return () => sub.unsubscribe();
  }, [userId, refetch, setUnreadCount]);
}
