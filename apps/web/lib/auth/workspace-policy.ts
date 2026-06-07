import 'server-only';

import { db } from '@/lib/db/client';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq } from 'drizzle-orm';

export interface WorkspaceSecurityPolicy {
  workspaceId: string;
  require2faForAdmins: boolean;
  require2faForMembers: boolean;
  allowedEmailDomains: string[];
  sessionMaxAgeDays: number;
  disablePasswordSignin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

function rowToPolicy(row: Record<string, unknown>): WorkspaceSecurityPolicy {
  return {
    workspaceId: String(row.workspace_id),
    require2faForAdmins: Boolean(row.require_2fa_for_admins),
    require2faForMembers: Boolean(row.require_2fa_for_members),
    allowedEmailDomains: Array.isArray(row.allowed_email_domains)
      ? row.allowed_email_domains as string[]
      : [],
    sessionMaxAgeDays: Number(row.session_max_age_days) || 7,
    disablePasswordSignin: Boolean(row.disable_password_signin),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function getWorkspacePolicy(
  workspaceId: string,
): Promise<WorkspaceSecurityPolicy | null> {
  const rows = await db
    .select()
    .from(workspaceSecurityPolicy)
    .where(eq(workspaceSecurityPolicy.workspace_id, BigInt(workspaceId)))
    .limit(1);

  if (!rows || rows.length === 0) return null;
  return rowToPolicy(rows[0] as unknown as Record<string, unknown>);
}

export async function updateWorkspacePolicy(
  workspaceId: string,
  policy: Partial<Omit<WorkspaceSecurityPolicy, 'workspaceId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (policy.require2faForAdmins !== undefined) {
    updateData.require_2fa_for_admins = policy.require2faForAdmins;
  }
  if (policy.require2faForMembers !== undefined) {
    updateData.require_2fa_for_members = policy.require2faForMembers;
  }
  if (policy.allowedEmailDomains !== undefined) {
    updateData.allowed_email_domains = policy.allowedEmailDomains;
  }
  if (policy.sessionMaxAgeDays !== undefined) {
    updateData.session_max_age_days = policy.sessionMaxAgeDays;
  }
  if (policy.disablePasswordSignin !== undefined) {
    updateData.disable_password_signin = policy.disablePasswordSignin;
  }

  await db
    .update(workspaceSecurityPolicy)
    .set(updateData)
    .where(eq(workspaceSecurityPolicy.workspace_id, BigInt(workspaceId)));
}

export async function enforcePolicy(
  userId: string,
  workspaceId: string,
): Promise<PolicyCheckResult> {
  const policy = await getWorkspacePolicy(workspaceId);

  if (!policy) {
    return { allowed: true };
  }

  if (
    policy.allowedEmailDomains.length > 0 &&
    process.env.NODE_ENV !== 'development'
  ) {
    return { allowed: false, reason: 'Email domain not allowed for this workspace' };
  }

  return { allowed: true };
}
