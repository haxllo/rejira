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
  issueId: z.number().int().positive(),
  body: z.string().min(1),
  mentions: z.array(z.string()).optional(),
});

const UpdateSchema = z.object({
  op: z.literal('update'),
  workspaceId: z.string(),
  commentId: z.string().min(1),
  body: z.string().min(1),
});

const DeleteSchema = z.object({
  op: z.literal('delete'),
  workspaceId: z.string(),
  commentId: z.string().min(1),
});

const Schema = z.discriminatedUnion('op', [
  CreateSchema,
  UpdateSchema,
  DeleteSchema,
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
          return actions.createComment(tx, {
            workspaceId: parsed.data.workspaceId,
            issueId: parsed.data.issueId,
            body: parsed.data.body,
            mentions: parsed.data.mentions,
          });
        case 'update':
          return actions.updateComment(tx, {
            workspaceId: parsed.data.workspaceId,
            commentId: parsed.data.commentId,
            body: parsed.data.body,
          });
        case 'delete':
          return actions.deleteComment(tx, {
            workspaceId: parsed.data.workspaceId,
            commentId: parsed.data.commentId,
          });
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
