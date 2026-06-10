'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUser } from '@/hooks/useUser';

interface WorkspaceRealtimeContextValue {
  channel: RealtimeChannel | null;
}

const WorkspaceRealtimeContext = createContext<WorkspaceRealtimeContextValue>({ channel: null });

export function useWorkspaceChannel(): WorkspaceRealtimeContextValue {
  return useContext(WorkspaceRealtimeContext);
}

export function WorkspaceRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { id: workspaceId } = useWorkspace();
  const { user } = useUser();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    if (channelRef.current) {
      getSupabaseBrowserClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`workspace:${workspaceId}`);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `workspaceId=eq.${workspaceId}` },
        () => {},
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cycles', filter: `workspaceId=eq.${workspaceId}` },
        () => {},
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `workspaceId=eq.${workspaceId}` },
        () => {},
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships', filter: `workspaceId=eq.${workspaceId}` },
        () => {},
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_views', filter: `workspaceId=eq.${workspaceId}` },
        () => {},
      );

    if (user?.id) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {},
      );
    }

    try {
      channel.subscribe();
      channelRef.current = channel;
    } catch (error) {
      console.warn('[realtime] workspace channel subscribe failed:', error);
      channelRef.current = null;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, user?.id]);

  return (
    <WorkspaceRealtimeContext.Provider value={{ channel: channelRef.current }}>
      {children}
    </WorkspaceRealtimeContext.Provider>
  );
}
