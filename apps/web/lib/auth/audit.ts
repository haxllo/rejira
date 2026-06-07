import 'server-only';

import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/db/schema/audit_log';

export const AuditEventType = [
  'auth_signup',
  'auth_signin',
  'auth_signout',
  'auth_failed',
  'password_reset',
  'email_verified',
  'auth_password_change',
  'auth_email_change',
  'auth_2fa_enabled',
  'auth_2fa_disabled',
  'auth_backup_code_used',
  'auth_account_deleted',
  'auth_account_restored',
  'auth_passkey_enrolled',
  'auth_passkey_removed',
  'workspace_created',
  'workspace_archived',
  'member_added',
  'member_removed',
  'role_changed',
  'data_export_requested',
] as const;

export type AuditEventTypeValue = (typeof AuditEventType)[number];

export interface AuditEventData {
  actorId: string;
  actorWorkspaceId?: string;
  event: AuditEventTypeValue;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function emitAuditEvent(data: AuditEventData): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: undefined,
      actorWorkspaceId: undefined,
      event: data.event,
      ip: data.ipAddress || undefined,
      userAgent: data.userAgent || undefined,
      metadata: {
        ...(data.metadata || {}),
        _actorExternalId: data.actorId || undefined,
        _actorWorkspaceExternalId: data.actorWorkspaceId || undefined,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit event:', err);
  }
}

const memoryHandlers: Array<(e: AuditEventData) => void> = [];

export function onAuditEvent(handler: (e: AuditEventData) => void): void {
  memoryHandlers.push(handler);
}

export function emitAudit(
  type: string,
  userId?: string,
  metadata?: Record<string, string>,
): void {
  const event: AuditEventData = {
    actorId: userId || '',
    event: type as AuditEventTypeValue,
    metadata: metadata as Record<string, unknown> | undefined,
  };
  memoryHandlers.forEach((h) => h(event));
  emitAuditEvent(event).catch(() => {});
}
