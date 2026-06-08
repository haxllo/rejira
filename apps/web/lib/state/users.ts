'use client';

import { create } from 'zustand';
import type { User } from '@/lib/db/types';

export interface UserView {
  id: string;
  name: string;
  email: string;
  avatarColor: string | null;
  status: string | null;
}

interface UsersState {
  byId: Record<string, UserView>;
  hydrate: (users: User[]) => void;
  get: (id: bigint | string | number) => UserView | undefined;
  list: () => UserView[];
}

function toKey(id: bigint | string | number): string {
  return String(id);
}

function toView(user: User): UserView {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
    status: user.status,
  };
}

export const useUsersStore = create<UsersState>((set, get) => ({
  byId: {},
  hydrate: (users) => {
    const next: Record<string, UserView> = {};
    for (const u of users) {
      const view = toView(u);
      next[view.id] = view;
      next[u.externalId] = view;
    }
    set({ byId: next });
  },
  get: (id) => get().byId[toKey(id)],
  list: () => Object.values(get().byId),
}));

export function lookupUser(id: bigint | string | number | undefined | null): UserView | undefined {
  if (id === null || id === undefined) return undefined;
  return useUsersStore.getState().byId[String(id)];
}
