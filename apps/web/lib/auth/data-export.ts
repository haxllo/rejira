import 'server-only';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { emitAuditEvent } from './audit';
import { sendEmail } from './email';

export async function requestExport(userId: string): Promise<{ exportId: string }> {
  const exportId = crypto.randomUUID();

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.externalId, userId),
      columns: {
        externalId: true,
        name: true,
        email: true,
        avatarColor: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const exportData = {
      exportId,
      exportedAt: new Date().toISOString(),
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
      workspaces: [],
      sessions: [],
      comments: [],
    };

    const jsonContent = JSON.stringify(exportData, null, 2);

    await emitAuditEvent({
      actorId: userId,
      event: 'data_export_requested',
      metadata: { exportId, sizeBytes: jsonContent.length },
    });

    const userEmail = user.email;
    if (userEmail && !userEmail.startsWith('deleted-')) {
      await sendEmail({
        to: userEmail,
        subject: 'Your rejira data export is ready',
        template: 'data-export',
        data: {
          name: user.name || 'User',
          exportId,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[data-export] Failed to request export:', err);
    throw new Error('Failed to request data export');
  }

  return { exportId };
}
