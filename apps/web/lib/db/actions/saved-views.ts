import 'server-only';

import { eq } from 'drizzle-orm';
import { savedViews } from '../schema';
import type { SavedView } from '../types';
import type { Tx } from '../transaction';
import { trackViewSaved } from '@/lib/observability/events';
import { createId } from '@/lib/utils/id';

export interface CreateSavedViewInput {
  workspaceId: string;
  ownerId: string;
  name: string;
  filter: Record<string, unknown>;
  sort?: { key: string; dir: 'asc' | 'desc' };
  groupBy?: string;
  starred?: boolean;
}

export async function createSavedView(tx: Tx, input: CreateSavedViewInput): Promise<SavedView> {
  const [row] = await tx
    .insert(savedViews)
    .values({
      externalId: createId('view'),
      workspaceId: input.workspaceId,
      ownerId: BigInt(input.ownerId),
      name: input.name,
      filter: input.filter as unknown as Record<string, unknown>,
      sortKey: input.sort?.key ?? null,
      sortDir: input.sort?.dir ?? 'asc',
      groupBy: input.groupBy ?? null,
      starred: input.starred ?? false,
    })
    .returning();

  trackViewSaved({
    userId: input.ownerId,
    workspaceId: input.workspaceId,
    viewId: Number(row.id),
    isShared: false,
  });

  return row;
}

export interface UpdateSavedViewInput {
  workspaceId: string;
  viewId: string;
  patch: Partial<{
    name: string;
    filter: Record<string, unknown>;
    sortKey: string | null;
    sortDir: 'asc' | 'desc' | null;
    groupBy: string | null;
    starred: boolean;
  }>;
}

export async function updateSavedView(tx: Tx, input: UpdateSavedViewInput): Promise<SavedView> {
  const [row] = await tx
    .update(savedViews)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(eq(savedViews.externalId, input.viewId))
    .returning();
  return row;
}

export interface DeleteSavedViewInput {
  workspaceId: string;
  viewId: string;
}

export async function deleteSavedView(tx: Tx, input: DeleteSavedViewInput): Promise<true> {
  await tx.delete(savedViews).where(eq(savedViews.externalId, input.viewId));
  return true;
}

export interface ToggleStarredInput {
  workspaceId: string;
  viewId: string;
  starred: boolean;
}

export async function toggleStarred(tx: Tx, input: ToggleStarredInput): Promise<SavedView> {
  const [row] = await tx
    .update(savedViews)
    .set({ starred: input.starred, updatedAt: new Date() })
    .where(eq(savedViews.externalId, input.viewId))
    .returning();
  return row;
}

export interface ReorderSavedViewsInput {
  workspaceId: string;
  viewIds: string[];
}

export async function reorderSavedViews(_tx: Tx, _input: ReorderSavedViewsInput): Promise<true> {
  return true;
}
