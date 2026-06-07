import 'server-only';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { emitAuditEvent } from './audit';
import { sendEmail } from './email';

export async function deleteAccount(userId: string): Promise<void> {
  const deletedEmail = `deleted-${crypto.randomUUID()}@deleted.rejira`;

  try {
    await db.update(users)
      .set({
        name: 'Deleted User',
        email: deletedEmail,
        avatarUrl: null,
        avatarColor: null,
        status: 'deleted',
      })
      .where(eq(users.externalId, userId));

    await emitAuditEvent({
      actorId: userId,
      event: 'auth_account_deleted',
      metadata: { deletedEmail },
    });

    if (process.env.RESEND_API_KEY) {
      const user = await db.query.users.findFirst({
        where: eq(users.externalId, userId),
        columns: { email: true, name: true },
      });

      await sendEmail({
        to: deletedEmail,
        subject: 'Your rejira account has been deleted',
        template: 'account-deleted',
        data: {
          name: user?.name || 'User',
          email: deletedEmail,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[account-deletion] Failed to delete account:', err);
    throw new Error('Failed to delete account');
  }
}

export async function restoreAccount(userId: string): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.externalId, userId),
      columns: { status: true },
    });

    if (!user || user.status !== 'deleted') {
      throw new Error('Account is not in deleted state');
    }

    await db.update(users)
      .set({
        status: 'active',
      })
      .where(eq(users.externalId, userId));

    await emitAuditEvent({
      actorId: userId,
      event: 'auth_account_restored',
    });
  } catch (err) {
    console.error('[account-deletion] Failed to restore account:', err);
    throw new Error('Failed to restore account');
  }
}

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const user = await db.query.users.findFirst({
    where: eq(users.externalId, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    user: {
      id: user.externalId,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    exportedAt: new Date().toISOString(),
  };
}
