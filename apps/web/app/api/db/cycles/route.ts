export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { withWorkspaceTransaction, mapDrizzleError, DbError } from '@/lib/db';
import * as actions from '@/lib/db/actions';

const CreateSchema = z.object({
  op: z.literal('create'),
  workspaceId: z.string(),
  projectId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  goal: z.string().optional().nullable(),
  number: z.number().int().optional(),
});

const UpdateSchema = z.object({
  op: z.literal('update'),
  workspaceId: z.string(),
  cycleId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).max(100).optional(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    goal: z.string().optional().nullable(),
    status: z.enum(['planned', 'active', 'completed']).optional(),
  }),
});

const CompleteSchema = z.object({
  op: z.literal('complete'),
  workspaceId: z.string(),
  cycleId: z.string().min(1),
});

const AddIssueSchema = z.object({
  op: z.literal('addIssue'),
  workspaceId: z.string(),
  cycleId: z.string().min(1),
  issueId: z.string().min(1),
});

const RemoveIssueSchema = z.object({
  op: z.literal('removeIssue'),
  workspaceId: z.string(),
  cycleId: z.string().min(1),
  issueId: z.string().min(1),
});

const Schema = z.discriminatedUnion('op', [
  CreateSchema,
  UpdateSchema,
  CompleteSchema,
  AddIssueSchema,
  RemoveIssueSchema,
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
        case 'create':
          return actions.createCycle(tx, {
            workspaceId: parsed.data.workspaceId,
            projectId: parsed.data.projectId,
            name: parsed.data.name,
            startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
            endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
            goal: parsed.data.goal ?? undefined,
            number: parsed.data.number,
          });
        case 'update':
          return actions.updateCycle(tx, {
            workspaceId: parsed.data.workspaceId,
            cycleId: parsed.data.cycleId,
            patch: parsed.data.patch as Record<string, unknown> as Parameters<typeof actions.updateCycle>[1]['patch'],
          });
        case 'complete':
          return actions.completeCycle(tx, { workspaceId: parsed.data.workspaceId, cycleId: parsed.data.cycleId });
        case 'addIssue':
          return actions.addIssueToCycle(tx, { workspaceId: parsed.data.workspaceId, cycleId: parsed.data.cycleId, issueId: parsed.data.issueId });
        case 'removeIssue':
          return actions.removeIssueFromCycle(tx, { workspaceId: parsed.data.workspaceId, cycleId: parsed.data.cycleId, issueId: parsed.data.issueId });
      }
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DbError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const mapped = mapDrizzleError(err);
    return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
  }
}
