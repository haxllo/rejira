import 'server-only';

import { eq } from 'drizzle-orm';
import { cycles, issues } from '../schema';
import type { Cycle, Issue } from '../types';
import type { Tx } from '../transaction';
import { trackCycleCreated } from '@/lib/observability/events';
import { requireAuth } from '@/lib/auth/require-auth';
import { createId } from '@/lib/utils/id';

export interface CreateCycleInput {
  workspaceId: string;
  projectId: number;
  name: string;
  startsAt?: Date;
  endsAt?: Date;
  goal?: string;
  number?: number;
}

export async function createCycle(tx: Tx, input: CreateCycleInput): Promise<Cycle> {
  const user = await requireAuth();
  const [{ max }] = await tx
    .select({ max: cycles.number })
    .from(cycles)
    .where(eq(cycles.projectId, input.projectId))
    .orderBy(cycles.number)
    .limit(1);
  const nextNumber = (typeof max === 'number' ? max : 0) + 1;

  const [row] = await tx
    .insert(cycles)
    .values({
      externalId: createId('cyc'),
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      number: input.number ?? nextNumber,
      name: input.name,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      goal: input.goal ?? null,
      status: 'planned',
    })
    .returning();

  trackCycleCreated({
    userId: user.id,
    workspaceId: input.workspaceId,
    cycleId: Number(row.id),
    projectId: input.projectId,
  });

  return row;
}

export interface UpdateCycleInput {
  workspaceId: string;
  cycleId: string;
  patch: Partial<{
    name: string;
    startsAt: Date | null;
    endsAt: Date | null;
    goal: string | null;
    status: 'planned' | 'active' | 'completed';
  }>;
}

export async function updateCycle(tx: Tx, input: UpdateCycleInput): Promise<Cycle> {
  const [row] = await tx
    .update(cycles)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(eq(cycles.externalId, input.cycleId))
    .returning();
  return row;
}

export interface CompleteCycleInput {
  workspaceId: string;
  cycleId: string;
}

export async function completeCycle(tx: Tx, input: CompleteCycleInput): Promise<Cycle> {
  const [row] = await tx
    .update(cycles)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(cycles.externalId, input.cycleId))
    .returning();
  return row;
}

export interface AddIssueToCycleInput {
  workspaceId: string;
  cycleId: string;
  issueId: string;
}

export async function addIssueToCycle(tx: Tx, input: AddIssueToCycleInput): Promise<Issue> {
  const [cycleRow] = await tx
    .select({ id: cycles.id })
    .from(cycles)
    .where(eq(cycles.externalId, input.cycleId))
    .limit(1);
  if (!cycleRow) {
    throw new Error('Cycle not found');
  }

  const [row] = await tx
    .update(issues)
    .set({ cycleId: cycleRow.id, updatedAt: new Date() })
    .where(eq(issues.externalId, input.issueId))
    .returning();
  return row;
}

export interface RemoveIssueFromCycleInput {
  workspaceId: string;
  cycleId: string;
  issueId: string;
}

export async function removeIssueFromCycle(tx: Tx, _input: RemoveIssueFromCycleInput): Promise<Issue> {
  const [row] = await tx
    .update(issues)
    .set({ cycleId: null, updatedAt: new Date() })
    .where(eq(issues.externalId, _input.issueId))
    .returning();
  return row;
}
