import 'server-only';

import { eq } from 'drizzle-orm';
import { comments } from '../schema';
import type { Comment } from '../types';
import type { Tx } from '../transaction';
import { trackCommentCreated } from '@/lib/observability/events';
import { requireAuth } from '@/lib/auth/require-auth';
import { createId } from '@/lib/utils/id';

export interface CreateCommentInput {
  workspaceId: string;
  issueId: number;
  body: string;
  mentions?: string[];
}

export async function createComment(tx: Tx, input: CreateCommentInput): Promise<Comment> {
  const user = await requireAuth();
  const [row] = await tx
    .insert(comments)
    .values({
      externalId: createId('cmt'),
      workspaceId: input.workspaceId,
      issueId: BigInt(input.issueId),
      authorId: BigInt(user.id),
      body: input.body,
    })
    .returning();

  trackCommentCreated({
    userId: user.id,
    workspaceId: input.workspaceId,
    issueId: String(input.issueId),
  });

  return row;
}

export interface UpdateCommentInput {
  workspaceId: string;
  commentId: string;
  body: string;
}

export async function updateComment(tx: Tx, input: UpdateCommentInput): Promise<Comment> {
  const [row] = await tx
    .update(comments)
    .set({ body: input.body, updatedAt: new Date() })
    .where(eq(comments.externalId, input.commentId))
    .returning();
  return row;
}

export interface DeleteCommentInput {
  workspaceId: string;
  commentId: string;
}

export async function deleteComment(tx: Tx, input: DeleteCommentInput): Promise<true> {
  await tx.delete(comments).where(eq(comments.externalId, input.commentId));
  return true;
}
