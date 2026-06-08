'use client';

import { create } from 'zustand';
import type { Label } from '@/lib/db/types';

export interface LabelView {
  id: string;
  name: string;
  color: string | null;
  projectId: number | null;
}

interface LabelsState {
  byId: Record<string, LabelView>;
  hydrate: (labels: Label[]) => void;
  get: (id: number | string) => LabelView | undefined;
}

function toKey(id: number | bigint | string): string {
  return String(id);
}

function toView(label: Label): LabelView {
  return {
    id: String(label.id),
    name: label.name,
    color: label.color ?? null,
    projectId: label.projectId ?? null,
  };
}

export const useLabelsStore = create<LabelsState>((set, get) => ({
  byId: {},
  hydrate: (labels) => {
    const next: Record<string, LabelView> = {};
    for (const l of labels) {
      const view = toView(l);
      next[view.id] = view;
    }
    set({ byId: next });
  },
  get: (id) => get().byId[toKey(id)],
}));

export function lookupLabel(id: number | bigint | string | undefined | null): LabelView | undefined {
  if (id === null || id === undefined) return undefined;
  return useLabelsStore.getState().byId[String(id)];
}
