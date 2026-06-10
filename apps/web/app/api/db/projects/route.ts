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
  name: z.string().min(1).max(100),
  key: z.string().min(1).max(10),
  description: z.string().optional(),
  leadId: z.number().optional(),
  iconLetter: z.string().max(1).optional(),
  iconColor: z.string().max(20).optional(),
});

const UpdateSchema = z.object({
  op: z.literal('update'),
  workspaceId: z.string(),
  projectId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).max(100).optional(),
    key: z.string().min(1).max(10).optional(),
    description: z.string().optional().nullable(),
    leadId: z.number().optional().nullable(),
    iconLetter: z.string().max(1).optional().nullable(),
    iconColor: z.string().max(20).optional().nullable(),
  }),
});

const ArchiveSchema = z.object({
  op: z.literal('archive'),
  workspaceId: z.string(),
  projectId: z.string().min(1),
});

const UnarchiveSchema = z.object({
  op: z.literal('unarchive'),
  workspaceId: z.string(),
  projectId: z.string().min(1),
});

const AddMemberSchema = z.object({
  op: z.literal('addMember'),
  workspaceId: z.string(),
  projectId: z.string().min(1),
  membershipId: z.number().int().positive(),
  role: z.enum(['lead', 'contributor', 'viewer']),
});

const RemoveMemberSchema = z.object({
  op: z.literal('removeMember'),
  workspaceId: z.string(),
  projectId: z.string().min(1),
  membershipId: z.number().int().positive(),
});

const Schema = z.discriminatedUnion('op', [
  CreateSchema,
  UpdateSchema,
  ArchiveSchema,
  UnarchiveSchema,
  AddMemberSchema,
  RemoveMemberSchema,
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
          return actions.createProject(tx, {
            workspaceId: parsed.data.workspaceId,
            name: parsed.data.name,
            key: parsed.data.key,
            description: parsed.data.description,
            leadId: parsed.data.leadId,
            iconLetter: parsed.data.iconLetter,
            iconColor: parsed.data.iconColor,
          });
        case 'update':
          return actions.updateProject(tx, {
            workspaceId: parsed.data.workspaceId,
            projectId: parsed.data.projectId,
            patch: parsed.data.patch as Record<string, unknown> as Parameters<typeof actions.updateProject>[1]['patch'],
          });
        case 'archive':
          return actions.archiveProject(tx, { workspaceId: parsed.data.workspaceId, projectId: parsed.data.projectId });
        case 'unarchive':
          return actions.unarchiveProject(tx, { workspaceId: parsed.data.workspaceId, projectId: parsed.data.projectId });
        case 'addMember':
          return actions.addProjectMember(tx, {
            workspaceId: parsed.data.workspaceId,
            projectId: parsed.data.projectId,
            membershipId: parsed.data.membershipId,
            role: parsed.data.role,
          });
        case 'removeMember':
          return actions.removeProjectMember(tx, {
            workspaceId: parsed.data.workspaceId,
            projectId: parsed.data.projectId,
            membershipId: parsed.data.membershipId,
          });
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
