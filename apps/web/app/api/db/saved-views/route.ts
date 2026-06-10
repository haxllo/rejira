export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { withWorkspaceTransaction, mapDrizzleError, DbError } from '@/lib/db';
import * as actions from '@/lib/db/actions';

const CreateSchema = z.object({
  op: z.literal('create'),
  workspaceId: z.string(),
  ownerId: z.string().min(1),
  name: z.string().min(1).max(100),
  filter: z.record(z.string(), z.unknown()),
  sort: z.object({ key: z.string(), dir: z.enum(['asc', 'desc']) }).optional(),
  groupBy: z.string().optional(),
  starred: z.boolean().optional(),
});

const UpdateSchema = z.object({
  op: z.literal('update'),
  workspaceId: z.string(),
  viewId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).max(100).optional(),
    filter: z.record(z.string(), z.unknown()).optional(),
    sortKey: z.string().optional().nullable(),
    sortDir: z.enum(['asc', 'desc']).optional().nullable(),
    groupBy: z.string().optional().nullable(),
    starred: z.boolean().optional(),
  }),
});

const DeleteSchema = z.object({
  op: z.literal('delete'),
  workspaceId: z.string(),
  viewId: z.string().min(1),
});

const ToggleStarredSchema = z.object({
  op: z.literal('toggleStarred'),
  workspaceId: z.string(),
  viewId: z.string().min(1),
  starred: z.boolean(),
});

const Schema = z.discriminatedUnion('op', [
  CreateSchema,
  UpdateSchema,
  DeleteSchema,
  ToggleStarredSchema,
]);

export async function POST(req: Request) {
  await requireAuth();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const workspaceId = parsed.data.workspaceId;

  const sessionWorkspaceId = await getActiveWorkspaceId();
  if (workspaceId !== sessionWorkspaceId) {
    return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
  }

  try {
    const result = await withWorkspaceTransaction(workspaceId, async (tx) => {
      switch (parsed.data.op) {
        case 'create':
          return actions.createSavedView(tx, {
            workspaceId: parsed.data.workspaceId,
            ownerId: parsed.data.ownerId,
            name: parsed.data.name,
            filter: parsed.data.filter as Record<string, unknown>,
            sort: parsed.data.sort,
            groupBy: parsed.data.groupBy,
            starred: parsed.data.starred,
          });
        case 'update':
          return actions.updateSavedView(tx, {
            workspaceId: parsed.data.workspaceId,
            viewId: parsed.data.viewId,
            patch: parsed.data.patch as Record<string, unknown> as Parameters<typeof actions.updateSavedView>[1]['patch'],
          });
        case 'delete':
          return actions.deleteSavedView(tx, { workspaceId: parsed.data.workspaceId, viewId: parsed.data.viewId });
        case 'toggleStarred':
          return actions.toggleStarred(tx, { workspaceId: parsed.data.workspaceId, viewId: parsed.data.viewId, starred: parsed.data.starred });
      }
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DbError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const mapped = mapDrizzleError(err);
    return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
  }
}
