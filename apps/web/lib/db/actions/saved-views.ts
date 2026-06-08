import 'server-only';

import { eq } from 'drizzle-orm';
import { savedViews } from '../schema';
import type { SavedView } from '../types';
import { withWorkspaceTransaction } from '../transaction';
import { trackViewSaved } from '@/lib/observability/events';
import { requireAuth } from '@/lib/auth/require-auth';
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

export async function createSavedView(input: CreateSavedViewInput): Promise<SavedView> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
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
  });
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

export async function updateSavedView(input: UpdateSavedViewInput): Promise<SavedView> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(savedViews)
      .set({ ...input.patch, updatedAt: new Date() })
      .where(eq(savedViews.externalId, input.viewId))
      .returning();
    return row;
  });
}

export interface DeleteSavedViewInput {
  workspaceId: string;
  viewId: string;
}

export async function deleteSavedView(input: DeleteSavedViewInput): Promise<true> {
  return withWorkspaceTransaction(input.workspaceId, async (tx): Promise<true> => {
    await tx.delete(savedViews).where(eq(savedViews.externalId, input.viewId));
    return true;
  });
}

export interface ToggleStarredInput {
  workspaceId: string;
  viewId: string;
  starred: boolean;
}

export async function toggleStarred(input: ToggleStarredInput): Promise<SavedView> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(savedViews)
      .set({ starred: input.starred, updatedAt: new Date() })
      .where(eq(savedViews.externalId, input.viewId))
      .returning();
    return row;
  });
}

export interface ReorderSavedViewsInput {
  workspaceId: string;
  viewIds: string[];
}

export async function reorderSavedViews(_input: ReorderSavedViewsInput): Promise<true> {
  return withWorkspaceTransaction(_input.workspaceId, async (_tx): Promise<true> => {
    // Schema has no `position` column; saved views are ordered by createdAt.
    // Phase 5 may add a `position` column — this function is a no-op for now
    // and reserved for the future update path.
    return true;
  });
}
