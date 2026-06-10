export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { withWorkspaceTransaction, mapDrizzleError, DbError } from '@/lib/db';
import { issues as issuesTable } from '@/lib/db/schema/issues';
import * as actions from '@/lib/db/actions';

const statusEnum = z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
const priorityEnum = z.enum(['urgent', 'high', 'medium', 'low', 'none']);

const CreateSchema = z.object({
  op: z.literal('create'),
  workspaceId: z.string(),
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeIds: z.array(z.number()).optional(),
  labelIds: z.array(z.number()).optional(),
  cycleId: z.number().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatePoints: z.number().int().min(0).optional().nullable(),
  parentId: z.number().optional().nullable(),
});

const SetStatusSchema = z.object({
  op: z.literal('setStatus'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  status: statusEnum,
});

const SetPrioritySchema = z.object({
  op: z.literal('setPriority'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  priority: priorityEnum,
});

const SetAssigneesSchema = z.object({
  op: z.literal('setAssignees'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  assigneeIds: z.array(z.number()),
});

const SetLabelsSchema = z.object({
  op: z.literal('setLabels'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  labelIds: z.array(z.number()),
});

const SetDueDateSchema = z.object({
  op: z.literal('setDueDate'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  dueDate: z.string().datetime().nullable(),
});

const SetEstimateSchema = z.object({
  op: z.literal('setEstimate'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  points: z.number().int().min(0).nullable(),
});

const SetDescriptionSchema = z.object({
  op: z.literal('setDescription'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  description: z.string(),
});

const SetTitleSchema = z.object({
  op: z.literal('setTitle'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  title: z.string().min(1).max(500),
});

const SetProjectSchema = z.object({
  op: z.literal('setProject'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
  projectId: z.number().int().positive(),
});

const ArchiveSchema = z.object({
  op: z.literal('archive'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
});

const UnarchiveSchema = z.object({
  op: z.literal('unarchive'),
  workspaceId: z.string(),
  issueId: z.string().min(1),
});

const BulkArchiveSchema = z.object({
  op: z.literal('bulkArchive'),
  workspaceId: z.string(),
  issueIds: z.array(z.string()).min(1).max(500),
});

const BulkSetStatusSchema = z.object({
  op: z.literal('bulkSetStatus'),
  workspaceId: z.string(),
  issueIds: z.array(z.string()).min(1).max(500),
  status: statusEnum,
});

const Schema = z.discriminatedUnion('op', [
  CreateSchema,
  SetStatusSchema,
  SetPrioritySchema,
  SetAssigneesSchema,
  SetLabelsSchema,
  SetDueDateSchema,
  SetEstimateSchema,
  SetDescriptionSchema,
  SetTitleSchema,
  SetProjectSchema,
  ArchiveSchema,
  UnarchiveSchema,
  BulkArchiveSchema,
  BulkSetStatusSchema,
]);

export async function POST(req: Request) {
  await requireAuth();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const workspaceId = parsed.data.workspaceId;

  const sessionWorkspaceId = await getActiveWorkspaceId();
  if (workspaceId !== sessionWorkspaceId) {
    return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
  }

  try {
    const result = await withWorkspaceTransaction(workspaceId, async (tx) => {
      switch (parsed.data.op) {
        case 'create': {
          const dueDateVal = parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;
          return actions.createIssue(tx, {
            workspaceId: parsed.data.workspaceId,
            projectId: parsed.data.projectId,
            title: parsed.data.title,
            description: parsed.data.description,
            status: parsed.data.status,
            priority: parsed.data.priority,
            assigneeIds: parsed.data.assigneeIds,
            labelIds: parsed.data.labelIds,
            cycleId: parsed.data.cycleId,
            dueDate: dueDateVal,
            estimatePoints: parsed.data.estimatePoints ?? undefined,
            parentId: parsed.data.parentId ?? undefined,
          });
        }
        case 'setStatus':
          return actions.setStatus(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, status: parsed.data.status });
        case 'setPriority':
          return actions.setPriority(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, priority: parsed.data.priority });
        case 'setAssignees':
          return actions.setAssignees(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, assigneeIds: parsed.data.assigneeIds });
        case 'setLabels':
          return actions.setLabels(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, labelIds: parsed.data.labelIds });
        case 'setDueDate':
          return actions.setDueDate(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null });
        case 'setEstimate':
          return actions.setEstimate(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, points: parsed.data.points });
        case 'setDescription':
          return actions.setDescription(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, description: parsed.data.description });
        case 'setTitle':
          return actions.setTitle(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, title: parsed.data.title });
        case 'setProject':
          return actions.setProject(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId, projectId: parsed.data.projectId });
        case 'archive':
          return actions.archiveIssue(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId });
        case 'unarchive':
          return actions.unarchiveIssue(tx, { workspaceId: parsed.data.workspaceId, issueId: parsed.data.issueId });
        case 'bulkArchive':
          return actions.bulkArchive(tx, { workspaceId: parsed.data.workspaceId, issueIds: parsed.data.issueIds });
        case 'bulkSetStatus':
          return actions.bulkSetStatus(tx, { workspaceId: parsed.data.workspaceId, issueIds: parsed.data.issueIds, status: parsed.data.status });
        default:
          return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
      }
    });
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DbError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    const mapped = mapDrizzleError(err);
    return NextResponse.json(
      { error: mapped.message, code: mapped.code },
      { status: mapped.status },
    );
  }
}

const GetSchema = z.object({
  workspaceId: z.string(),
  issueId: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const issueId = searchParams.get('issueId');

  const parsed = GetSchema.safeParse({ workspaceId, issueId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await requireAuth();
  const sessionWorkspaceId = await getActiveWorkspaceId();
  if (workspaceId !== sessionWorkspaceId) {
    return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
  }

  try {
    const result = await withWorkspaceTransaction(parsed.data.workspaceId, async (tx) => {
      const [row] = await tx
        .select()
        .from(issuesTable)
        .where(eq(issuesTable.externalId, parsed.data.issueId))
        .limit(1);
      return row ?? null;
    });
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DbError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const mapped = mapDrizzleError(err);
    return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
  }
}
