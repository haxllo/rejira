import type { workspaces } from '@/lib/db/schema/workspaces';
import type { memberships } from '@/lib/db/schema/memberships';
import type { invitations } from '@/lib/db/schema/invitations';
import type { users } from '@/lib/db/schema/users';

export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export type Membership = typeof memberships.$inferSelect & {
  user?: typeof users.$inferSelect;
};

export type MembershipWithUser = typeof memberships.$inferSelect & {
  user: typeof users.$inferSelect;
};

export type WorkspaceInvite = typeof invitations.$inferSelect & {
  invitedByUser?: typeof users.$inferSelect;
};

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export function getInviteStatus(invite: WorkspaceInvite): InviteStatus {
  if (invite.acceptedAt) return 'accepted';
  if (invite.expiresAt < new Date()) return 'expired';
  return 'pending';
}
