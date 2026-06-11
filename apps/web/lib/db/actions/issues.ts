import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { issues } from '../schema/issues';
import type { Issue, NewIssue, StatusKey, PriorityKey } from '../types';
import type { Tx } from '../transaction';
import {
  trackIssueCreated,
  trackStatusChanged,
} from '@/lib/observability/events';
import { notifyIssueAssigned } from '@/lib/integrations/notify';
import { requireAuth } from '@/lib/auth/require-auth';
import { createId } from '@/lib/utils/id';

async function generateAndStoreEmbedding(
  issueId: string,
  workspaceId: string,
  title: string,
  description: string
): Promise<void> {
  try {
    const { createWorkspaceAIClient } = await import('@/lib/ai/client');
    const { generateEmbedding } = await import('@/lib/ai/embed');
    const { db } = await import('@/lib/db/client');

    const client = await createWorkspaceAIClient(workspaceId);
    if (!client) return;

    const text = `${title} ${description}`.trim();
    if (!text) return;

    const embedding = await generateEmbedding(text, client);
    await db
      .update(issues)
      .set({ embedding } as any)
      .where(eq(issues.externalId, issueId));
  } catch {
    // Fire-and-forget: failure should not break the mutation
  }
}

export interface CreateIssueInput {
  workspaceId: string;
  projectId: number;
  title: string;
  description?: string;
  status?: StatusKey;
  priority?: PriorityKey;
  assigneeIds?: number[];
  labelIds?: number[];
  cycleId?: number;
  dueDate?: Date;
  estimatePoints?: number;
  parentId?: number;
}

export async function createIssue(tx: Tx, input: CreateIssueInput): Promise<Issue> {
  const user = await requireAuth();
  const [row] = await tx
    .insert(issues)
    .values({
      externalId: createId('iss'),
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'backlog',
      priority: input.priority ?? 'none',
      assigneeIds: input.assigneeIds ?? null,
      labelIds: input.labelIds ?? null,
      cycleId: input.cycleId ?? null,
      dueDate: input.dueDate ?? null,
      estimatePoints: input.estimatePoints ?? null,
      parentId: input.parentId ?? null,
    })
    .returning();

  trackIssueCreated({
    userId: user.id,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    hasAssignee: !!row.assigneeIds?.length,
    hasLabel: !!row.labelIds?.length,
    hasDueDate: !!row.dueDate,
  });

  generateAndStoreEmbedding(String(row.id), input.workspaceId, input.title, input.description ?? '').catch(() => {});

  return row;
}

export interface UpdateIssueInput {
  workspaceId: string;
  issueId: string;
  patch: Partial<NewIssue>;
}

export async function updateIssue(tx: Tx, input: UpdateIssueInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface SetStatusInput {
  workspaceId: string;
  issueId: string;
  status: StatusKey;
}

export async function setStatus(tx: Tx, input: SetStatusInput): Promise<Issue> {
  const user = await requireAuth();
  const [prior] = await tx
    .select({ status: issues.status })
    .from(issues)
    .where(eq(issues.externalId, input.issueId))
    .limit(1);

  const [row] = await tx
    .update(issues)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();

  if (prior) {
    trackStatusChanged({
      userId: user.id,
      workspaceId: input.workspaceId,
      issueId: input.issueId,
      from: prior.status,
      to: input.status,
    });
  }

  return row;
}

export interface SetPriorityInput {
  workspaceId: string;
  issueId: string;
  priority: PriorityKey;
}

export async function setPriority(tx: Tx, input: SetPriorityInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ priority: input.priority, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface SetAssigneesInput {
  workspaceId: string;
  issueId: string;
  assigneeIds: number[];
}

export async function setAssignees(tx: Tx, input: SetAssigneesInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ assigneeIds: input.assigneeIds, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();

  notifyIssueAssigned(input.workspaceId, input.issueId, input.assigneeIds).catch(() => {});

  return row;
}

export interface SetLabelsInput {
  workspaceId: string;
  issueId: string;
  labelIds: number[];
}

export async function setLabels(tx: Tx, input: SetLabelsInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ labelIds: input.labelIds, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface SetDueDateInput {
  workspaceId: string;
  issueId: string;
  dueDate: Date | null;
}

export async function setDueDate(tx: Tx, input: SetDueDateInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ dueDate: input.dueDate, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface SetEstimateInput {
  workspaceId: string;
  issueId: string;
  points: number | null;
}

export async function setEstimate(tx: Tx, input: SetEstimateInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ estimatePoints: input.points, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface SetDescriptionInput {
  workspaceId: string;
  issueId: string;
  description: string;
}

export async function setDescription(tx: Tx, input: SetDescriptionInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ description: input.description, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();

  generateAndStoreEmbedding(input.issueId, input.workspaceId, row.title, input.description).catch(() => {});

  return row;
}

export interface SetTitleInput {
  workspaceId: string;
  issueId: string;
  title: string;
}

export async function setTitle(tx: Tx, input: SetTitleInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ title: input.title, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();

  generateAndStoreEmbedding(input.issueId, input.workspaceId, input.title, row.description).catch(() => {});

  return row;
}

export interface SetProjectInput {
  workspaceId: string;
  issueId: string;
  projectId: number;
}

export async function setProject(tx: Tx, input: SetProjectInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ projectId: input.projectId, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface ArchiveIssueInput {
  workspaceId: string;
  issueId: string;
}

export async function archiveIssue(tx: Tx, input: ArchiveIssueInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export async function unarchiveIssue(tx: Tx, input: ArchiveIssueInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface BulkArchiveInput {
  workspaceId: string;
  issueIds: string[];
}

export async function bulkArchive(tx: Tx, input: BulkArchiveInput): Promise<true> {
  if (input.issueIds.length === 0) return true;
  await tx
    .update(issues)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(inArray(issues.externalId, input.issueIds));
  return true;
}

export interface BulkSetStatusInput {
  workspaceId: string;
  issueIds: string[];
  status: StatusKey;
}

export async function bulkSetStatus(tx: Tx, input: BulkSetStatusInput): Promise<true> {
  if (input.issueIds.length === 0) return true;
  await tx
    .update(issues)
    .set({ status: input.status, updatedAt: new Date() })
    .where(inArray(issues.externalId, input.issueIds));
  return true;
}

export interface ReorderIssuesInput {
  workspaceId: string;
  issueId: string;
  toStatus: StatusKey;
  toIndex: number;
}

export async function reorderIssues(_tx: Tx, _input: ReorderIssuesInput): Promise<true> {
  return true;
}

export interface AddSubIssueInput {
  workspaceId: string;
  parentId: string;
  childId: string;
}

export async function addSubIssue(tx: Tx, input: AddSubIssueInput): Promise<Issue> {
  const [parentRow] = await tx
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.externalId, input.parentId))
    .limit(1);
  if (!parentRow) {
    throw new Error('Parent issue not found');
  }
  const [row] = await tx
    .update(issues)
    .set({ parentId: parentRow.id, updatedAt: new Date() })
    .where(eq(issues.externalId, input.childId))
    .returning();
  return row;
}

export type IssueLinkType = 'blocks' | 'relates_to' | 'duplicates';

export interface LinkIssuesInput {
  workspaceId: string;
  fromId: string;
  toId: string;
  linkType: IssueLinkType;
}

export async function linkIssues(_tx: Tx, _input: LinkIssuesInput): Promise<true> {
  console.warn('[db/actions/issues] linkIssues is a no-op: issue_links table is Phase 5');
  return true;
}
