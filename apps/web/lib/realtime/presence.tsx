'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';

export interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  onlineAt: string;
}

interface PresenceContextValue {
  onlineUsers: PresenceUser[];
}

const PresenceContext = createContext<PresenceContextValue>({ onlineUsers: [] });

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext);
}

export function PresenceProvider({
  children,
  workspaceId,
  userId,
  userName,
  userAvatar,
}: {
  children: React.ReactNode;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!workspaceId || !userId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name: string; avatar?: string; onlineAt: string }>();
      const users: PresenceUser[] = Object.entries(state).map(([uid, states]) => ({
        userId: uid,
        name: states[0].name,
        avatar: states[0].avatar,
        onlineAt: states[0].onlineAt,
      }));
      users.sort((a, b) => new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime());
      setOnlineUsers(users);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      setOnlineUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== key);
        const joined: PresenceUser[] = (newPresences as unknown as Array<Record<string, unknown>>).map((p) => ({
          userId: key,
          name: p.name as string,
          avatar: p.avatar as string | undefined,
          onlineAt: p.onlineAt as string,
        }));
        return [...joined, ...filtered];
      });
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== key));
    });

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await channel.track({
        name: userName,
        avatar: userAvatar,
        onlineAt: new Date().toISOString(),
      });
    });

    channelRef.current = channel;

    heartbeatRef.current = setInterval(() => {
      channel.track({
        name: userName,
        avatar: userAvatar,
        onlineAt: new Date().toISOString(),
      });
    }, 30_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, userId, userName, userAvatar]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}
