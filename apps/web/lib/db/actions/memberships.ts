import 'server-only';

import { and, eq } from 'drizzle-orm';
import { memberships, invitations } from '../schema';
import type { Membership } from '../types';
import { withWorkspaceTransaction, withTransaction } from '../transaction';
import { requireAuth } from '@/lib/auth/require-auth';

export type RoleKey = 'owner' | 'admin' | 'member' | 'guest';

export interface ChangeRoleInput {
  workspaceId: string;
  membershipId: string;
  newRole: RoleKey;
}

export async function changeRole(input: ChangeRoleInput): Promise<Membership> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(memberships)
      .set({ role: input.newRole, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.externalId, input.membershipId),
          eq(memberships.workspaceId, input.workspaceId),
        ),
      )
      .returning();
    return row;
  });
}

export interface RemoveMemberInput {
  workspaceId: string;
  membershipId: string;
}

export async function removeMember(input: RemoveMemberInput): Promise<true> {
  return withWorkspaceTransaction(input.workspaceId, async (tx): Promise<true> => {
    await tx
      .delete(memberships)
      .where(
        and(
          eq(memberships.externalId, input.membershipId),
          eq(memberships.workspaceId, input.workspaceId),
        ),
      );
    return true;
  });
}

export interface AcceptInvitationInput {
  invitationToken: string;
}

export async function acceptInvitation(input: AcceptInvitationInput): Promise<Membership> {
  const user = await requireAuth();
  return withTransaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.tokenHash, input.invitationToken))
      .limit(1);

    if (!invite) {
      throw new Error('Invitation not found');
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error('Invitation expired');
    }
    if (invite.acceptedAt) {
      throw new Error('Invitation already accepted');
    }

    const [row] = await tx
      .insert(memberships)
      .values({
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      })
      .returning();

    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invite.id));

    return row;
  });
}

export interface LeaveWorkspaceInput {
  workspaceId: string;
}

export async function leaveWorkspace(input: LeaveWorkspaceInput): Promise<true> {
  const user = await requireAuth();
  return withWorkspaceTransaction(input.workspaceId, async (tx): Promise<true> => {
    const [member] = await tx
      .select({ id: memberships.id, role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);

    if (!member) {
      throw new Error('Membership not found');
    }
    if (member.role === 'owner') {
      throw new Error('Owners cannot leave their workspace');
    }

    await tx
      .delete(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.workspaceId, input.workspaceId),
        ),
      );

    return true;
  });
}
