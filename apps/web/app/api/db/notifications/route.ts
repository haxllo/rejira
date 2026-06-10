export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { withWorkspaceTransaction, mapDrizzleError, DbError } from '@/lib/db';
import * as actions from '@/lib/db/actions';

const MarkReadSchema = z.object({
  op: z.literal('markRead'),
  workspaceId: z.string(),
  notificationId: z.string().min(1),
});

const MarkAllReadSchema = z.object({
  op: z.literal('markAllRead'),
  workspaceId: z.string(),
});

const SnoozeSchema = z.object({
  op: z.literal('snooze'),
  workspaceId: z.string(),
  notificationId: z.string().min(1),
  until: z.string().datetime(),
});

const ArchiveSchema = z.object({
  op: z.literal('archive'),
  workspaceId: z.string(),
  notificationId: z.string().min(1),
});

const Schema = z.discriminatedUnion('op', [
  MarkReadSchema,
  MarkAllReadSchema,
  SnoozeSchema,
  ArchiveSchema,
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
        case 'markRead':
          return actions.markNotificationRead(tx, {
            workspaceId: parsed.data.workspaceId,
            notificationId: parsed.data.notificationId,
          });
        case 'markAllRead':
          return actions.markAllNotificationsRead(tx, {
            workspaceId: parsed.data.workspaceId,
          });
        case 'snooze':
          return actions.snoozeNotification(tx, {
            workspaceId: parsed.data.workspaceId,
            notificationId: parsed.data.notificationId,
            until: new Date(parsed.data.until),
          });
        case 'archive':
          return actions.archiveNotification(tx, {
            workspaceId: parsed.data.workspaceId,
            notificationId: parsed.data.notificationId,
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
