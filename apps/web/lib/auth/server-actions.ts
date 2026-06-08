'use server';

import { inviteMember, bulkInvite, getMembers, changeMemberRole, removeMember, revokeInvite, resendInvite, getPendingInvites, acceptInvite } from './invites';
import { createWorkspace } from './workspace-helpers';
import type { WorkspaceRole, MembershipWithUser, WorkspaceInvite } from './workspace-types';

export async function inviteMemberAction(workspaceId: string, inviterId: string, email: string, role: WorkspaceRole) {
  return inviteMember(workspaceId, inviterId, { email, role });
}

export async function bulkInviteAction(workspaceId: string, inviterId: string, emails: string[], role: WorkspaceRole) {
  return bulkInvite(workspaceId, inviterId, emails, role);
}

export async function getMembersAction(workspaceId: string): Promise<MembershipWithUser[]> {
  return getMembers(workspaceId);
}

export async function changeMemberRoleAction(membershipId: string, newRole: WorkspaceRole, actorId: string): Promise<void> {
  return changeMemberRole(membershipId, newRole, actorId);
}

export async function removeMemberAction(membershipId: string, actorId: string): Promise<void> {
  return removeMember(membershipId, actorId);
}

export async function revokeInviteAction(invitationId: string): Promise<void> {
  return revokeInvite(invitationId);
}

export async function resendInviteAction(invitationId: string): Promise<WorkspaceInvite> {
  return resendInvite(invitationId);
}

export async function getPendingInvitesAction(workspaceId: string): Promise<WorkspaceInvite[]> {
  return getPendingInvites(workspaceId);
}

export async function acceptInviteAction(token: string): Promise<{ workspaceId: string; role: WorkspaceRole }> {
  return acceptInvite(token);
}

export async function createWorkspaceAction(userId: string, name: string, slug: string) {
  return createWorkspace(userId, { name, slug });
}
