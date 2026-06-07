import 'server-only';

import { db } from '@/lib/db/client';
import { memberships } from '@/lib/db/schema/memberships';
import { invitations } from '@/lib/db/schema/invitations';
import { users } from '@/lib/db/schema/users';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { auth } from './server';
import type { WorkspaceRole, MembershipWithUser, WorkspaceInvite, InviteStatus } from './workspace-types';
import { getInviteStatus } from './workspace-types';

interface InviteMemberData {
  email: string;
  role: WorkspaceRole;
}

export async function inviteMember(
  workspaceId: string,
  inviterId: string,
  data: InviteMemberData,
): Promise<WorkspaceInvite> {
  const result = await auth.api.createInvitation({
    body: {
      email: data.email,
      role: data.role,
      organizationId: workspaceId,
    },
  });

  return result as unknown as WorkspaceInvite;
}

export async function bulkInvite(
  workspaceId: string,
  inviterId: string,
  emails: string[],
  role: WorkspaceRole,
): Promise<WorkspaceInvite[]> {
  const results: WorkspaceInvite[] = [];
  for (const email of emails) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    const result = await inviteMember(workspaceId, inviterId, { email: trimmed, role });
    results.push(result);
  }
  return results;
}

export async function revokeInvite(invitationId: string): Promise<void> {
  await auth.api.cancelInvitation({
    body: {
      invitationId,
    },
  });
}

export async function resendInvite(invitationId: string): Promise<WorkspaceInvite> {
  await revokeInvite(invitationId);

  const invite = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, Number(invitationId)))
    .limit(1);

  if (!invite[0]) throw new Error('Invitation not found');

  const result = await auth.api.createInvitation({
    body: {
      email: invite[0].email,
      role: invite[0].role,
      organizationId: String(invite[0].workspaceId),
    },
  });

  return result as unknown as WorkspaceInvite;
}

export async function acceptInvite(
  token: string,
): Promise<{ workspaceId: string; role: WorkspaceRole }> {
  const result = await auth.api.acceptInvitation({
    body: {
      invitationId: token,
    },
  });

  return {
    workspaceId: (result as Record<string, unknown>).organizationId as string,
    role: ((result as Record<string, unknown>).role ?? 'member') as WorkspaceRole,
  };
}

export async function changeMemberRole(
  membershipId: string,
  newRole: WorkspaceRole,
  _actorId: string,
): Promise<void> {
  await auth.api.updateMemberRole({
    body: {
      memberId: membershipId,
      role: newRole,
    },
  });
}

export async function removeMember(
  membershipId: string,
  _actorId: string,
): Promise<void> {
  await auth.api.removeMember({
    body: {
      memberId: membershipId,
    },
  });
}

export async function getMembers(
  workspaceId: string,
): Promise<MembershipWithUser[]> {
  const result = await db.query.memberships.findMany({
    where: eq(memberships.workspaceId, Number(workspaceId)),
    with: {
      user: true,
    },
  });

  return result as unknown as MembershipWithUser[];
}

export async function getPendingInvites(
  workspaceId: string,
): Promise<WorkspaceInvite[]> {
  const result = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, Number(workspaceId)),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(invitations.createdAt);

  return result as WorkspaceInvite[];
}
