'use client';

import { create } from 'zustand';
import type { Notification } from '@/lib/db/types';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
  markReadLocally: (id: string) => void;
  refetch: () => Promise<void>;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },

  setUnreadCount: (count) =>
    set((s) => ({
      unreadCount: typeof count === 'function' ? count(s.unreadCount) : count,
    })),

  markReadLocally: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        (n.externalId ?? String(n.id)) === id ? { ...n, read: true } : n,
      );
      const unread = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount: unread };
    }),

  refetch: () => {
    const s = get();
    const unread = s.notifications.filter((n) => !n.read).length;
    set({ unreadCount: unread });
    return Promise.resolve();
  },
}));
