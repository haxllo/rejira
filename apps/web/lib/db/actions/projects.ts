import 'server-only';

import { eq } from 'drizzle-orm';
import { projects, projectMembers } from '../schema';
import type { Project, NewProject } from '../types';
import { withWorkspaceTransaction } from '../transaction';
import { trackProjectCreated } from '@/lib/observability/events';
import { requireAuth } from '@/lib/auth/require-auth';
import { createId } from '@/lib/utils/id';

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  leadId?: number;
  iconLetter?: string;
  iconColor?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const user = await requireAuth();
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .insert(projects)
      .values({
        externalId: createId('proj'),
        workspaceId: input.workspaceId,
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        leadId: input.leadId ?? null,
        iconLetter: input.iconLetter ?? null,
        iconColor: input.iconColor ?? null,
      })
      .returning();

    trackProjectCreated({
      userId: user.id,
      workspaceId: input.workspaceId,
      projectId: Number(row.id),
    });

    return row;
  });
}

export interface UpdateProjectInput {
  workspaceId: string;
  projectId: string;
  patch: Partial<NewProject>;
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(projects)
      .set({ ...input.patch, updatedAt: new Date() })
      .where(eq(projects.externalId, input.projectId))
      .returning();
    return row;
  });
}

export interface ArchiveProjectInput {
  workspaceId: string;
  projectId: string;
}

export async function archiveProject(input: ArchiveProjectInput): Promise<Project> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(projects)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.externalId, input.projectId))
      .returning();
    return row;
  });
}

export async function unarchiveProject(input: ArchiveProjectInput): Promise<Project> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [row] = await tx
      .update(projects)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(projects.externalId, input.projectId))
      .returning();
    return row;
  });
}

export type ProjectRole = 'lead' | 'contributor' | 'viewer';

export interface AddProjectMemberInput {
  workspaceId: string;
  projectId: string;
  membershipId: number;
  role: ProjectRole;
}

export interface ProjectMember {
  projectId: bigint;
  userId: bigint;
}

export async function addProjectMember(input: AddProjectMemberInput): Promise<ProjectMember> {
  return withWorkspaceTransaction(input.workspaceId, async (tx) => {
    const [projectRow] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.externalId, input.projectId))
      .limit(1);
    if (!projectRow) {
      throw new Error('Project not found');
    }

    await tx
      .insert(projectMembers)
      .values({
        projectId: projectRow.id,
        userId: BigInt(input.membershipId),
      })
      .onConflictDoNothing();

    return {
      projectId: projectRow.id,
      userId: BigInt(input.membershipId),
    };
  });
}

export interface RemoveProjectMemberInput {
  workspaceId: string;
  projectId: string;
  membershipId: number;
}

export async function removeProjectMember(input: RemoveProjectMemberInput): Promise<true> {
  return withWorkspaceTransaction(input.workspaceId, async (tx): Promise<true> => {
    const [projectRow] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.externalId, input.projectId))
      .limit(1);
    if (!projectRow) {
      throw new Error('Project not found');
    }

    await tx
      .delete(projectMembers)
      .where(eq(projectMembers.projectId, projectRow.id));
    return true;
  });
}
