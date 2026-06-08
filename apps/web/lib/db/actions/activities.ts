import 'server-only';

import { activities } from '../schema';
import { withWorkspaceTransaction } from '../transaction';
import { requireAuth } from '@/lib/auth/require-auth';
import { createId } from '@/lib/utils/id';
import { activityVerbEnum } from '../schema/enums';

export type ActivityVerb =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'status_changed'
  | 'priority_changed';

export interface LogActivityInput {
  workspaceId: string;
  objectType: 'issue' | 'project' | 'cycle' | 'comment';
  objectId: string;
  verb: ActivityVerb;
  metadata?: Record<string, unknown>;
}

function isActivityVerb(v: string): v is ActivityVerb {
  return (activityVerbEnum.enumValues as readonly string[]).includes(v);
}

export async function logActivity(input: LogActivityInput): Promise<true> {
  const user = await requireAuth();
  if (!isActivityVerb(input.verb)) {
    throw new Error(`Invalid activity verb: ${input.verb}`);
  }
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const before = input.metadata ? JSON.stringify(input.metadata) : null;
    await tx.insert(activities).values({
      externalId: createId('act'),
      workspaceId: input.workspaceId,
      actorId: BigInt(user.id),
      verb: input.verb,
      objectType: input.objectType,
      objectId: BigInt(input.objectId),
      before: before as unknown as Record<string, unknown>,
      after: null,
    });
    return true as const;
  });
}
