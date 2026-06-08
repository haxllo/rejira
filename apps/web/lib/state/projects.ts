'use client';

import { create } from 'zustand';
import type { Project } from '@/lib/db/types';

export interface ProjectView {
  id: string;
  key: string;
  name: string;
  description: string | null;
  iconColor: string | null;
  iconLetter: string | null;
  status: string | null;
}

interface ProjectsState {
  byId: Record<string, ProjectView>;
  byKey: Record<string, ProjectView>;
  hydrate: (projects: Project[]) => void;
  get: (id: number | bigint | string) => ProjectView | undefined;
  getByKey: (key: string) => ProjectView | undefined;
  list: () => ProjectView[];
}

function toKey(id: number | bigint | string): string {
  return String(id);
}

function toView(project: Project): ProjectView {
  return {
    id: String(project.id),
    key: project.key,
    name: project.name,
    description: project.description,
    iconColor: project.iconColor,
    iconLetter: project.iconLetter,
    status: project.status,
  };
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  byId: {},
  byKey: {},
  hydrate: (projects) => {
    const byId: Record<string, ProjectView> = {};
    const byKey: Record<string, ProjectView> = {};
    for (const p of projects) {
      const view = toView(p);
      byId[view.id] = view;
      byKey[view.key.toLowerCase()] = view;
    }
    set({ byId, byKey });
  },
  get: (id) => get().byId[toKey(id)],
  getByKey: (key) => get().byKey[key.toLowerCase()],
  list: () => Object.values(get().byId),
}));

export function lookupProject(id: number | bigint | string | undefined | null): ProjectView | undefined {
  if (id === null || id === undefined) return undefined;
  return useProjectsStore.getState().byId[String(id)];
}

export function lookupProjectByKey(key: string | undefined | null): ProjectView | undefined {
  if (!key) return undefined;
  return useProjectsStore.getState().byKey[key.toLowerCase()];
}
