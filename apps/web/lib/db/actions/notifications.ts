import 'server-only';

import { and, eq } from 'drizzle-orm';
import { notifications } from '../schema';
import type { Notification } from '../types';
import type { Tx } from '../transaction';
import { requireAuth } from '@/lib/auth/require-auth';

export interface MarkNotificationReadInput {
  workspaceId: string;
  notificationId: string;
}

export async function markNotificationRead(tx: Tx, input: MarkNotificationReadInput): Promise<Notification> {
  const user = await requireAuth();
  const [row] = await tx
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.externalId, input.notificationId),
        eq(notifications.userId, BigInt(user.id)),
      ),
    )
    .returning();
  return row;
}

export interface MarkAllNotificationsReadInput {
  workspaceId: string;
}

export interface MarkAllResult {
  count: number;
}

export async function markAllNotificationsRead(
  tx: Tx,
  input: MarkAllNotificationsReadInput,
): Promise<MarkAllResult> {
  const user = await requireAuth();
  const updated = await tx
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, BigInt(user.id)),
        eq(notifications.read, false),
      ),
    )
    .returning({ id: notifications.id });
  return { count: updated.length };
}

export interface SnoozeNotificationInput {
  workspaceId: string;
  notificationId: string;
  until: Date;
}

export async function snoozeNotification(tx: Tx, input: SnoozeNotificationInput): Promise<Notification> {
  const user = await requireAuth();
  const [row] = await tx
    .update(notifications)
    .set({ snoozedUntil: input.until })
    .where(
      and(
        eq(notifications.externalId, input.notificationId),
        eq(notifications.userId, BigInt(user.id)),
      ),
    )
    .returning();
  return row;
}

export interface ArchiveNotificationInput {
  workspaceId: string;
  notificationId: string;
}

export async function archiveNotification(tx: Tx, input: ArchiveNotificationInput): Promise<true> {
  const user = await requireAuth();
  await tx
    .delete(notifications)
    .where(
      and(
        eq(notifications.externalId, input.notificationId),
        eq(notifications.userId, BigInt(user.id)),
      ),
    );
  return true;
}
