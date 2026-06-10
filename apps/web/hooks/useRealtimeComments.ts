'use client';

import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToComments } from '@/lib/realtime/subscriptions';
import { useComments } from '@/lib/state/comments';
import type { Comment } from '@/lib/db/types';

export function useRealtimeComments(issueId: string) {
  useEffect(() => {
    if (!issueId) return;
    const sub = subscribeToComments(issueId, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === 'INSERT') {
        useComments.getState().append(issueId, payload.new as unknown as Comment);
      } else if (payload.eventType === 'UPDATE') {
        useComments.getState().replace(issueId, payload.new as unknown as Comment);
      } else if (payload.eventType === 'DELETE') {
        const oldId = (payload.old as Record<string, unknown>)?.externalId as string
          ?? (payload.old as Record<string, unknown>)?.id as string;
        useComments.getState().remove(issueId, oldId);
      }
    });
    return () => sub.unsubscribe();
  }, [issueId]);
}
