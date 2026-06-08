import 'server-only';

import { db } from '@/lib/db/client';
import { workspaces } from '@/lib/db/schema/workspaces';
import { memberships } from '@/lib/db/schema/memberships';
import { eq, and, isNull, count } from 'drizzle-orm';
import { auth } from './server';
import type { Workspace, MembershipWithUser } from './workspace-types';
import { headers } from 'next/headers';

export interface ActiveWorkspace {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
}

interface CreateWorkspaceData {
  name: string;
  slug: string;
}

export async function createWorkspace(
  _userId: string,
  data: CreateWorkspaceData,
): Promise<Workspace> {
  const result = await auth.api.createOrganization({
    body: {
      name: data.name,
      slug: data.slug,
    },
  });

  return result as unknown as Workspace;
}

export async function getWorkspace(slug: string): Promise<Workspace | null> {
  const result = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  return (result[0] ?? null) as Workspace | null;
}

export async function listUserWorkspaces(userId: string): Promise<Workspace[]> {
  const userMemberships = await db
    .select({
      workspaceId: memberships.workspaceId,
    })
    .from(memberships)
    .where(eq(memberships.userId, Number(userId)));

  if (userMemberships.length === 0) return [];

  const workspaceIds = userMemberships.map((m) => m.workspaceId);

  const result = await db
    .select()
    .from(workspaces)
    .where(
      and(
        isNull(workspaces.archivedAt),
        // Drizzle doesn't support `in` with bigint arrays easily
      ),
    )
    .orderBy(workspaces.name);

  return result.filter((w) => workspaceIds.includes(w.id)) as Workspace[];
}

export async function getDefaultWorkspace(_userId: string): Promise<Workspace | null> {
  const userMemberships = await db
    .select({
      workspaceId: memberships.workspaceId,
    })
    .from(memberships)
    .where(eq(memberships.userId, Number(_userId)))
    .limit(1);

  if (userMemberships.length === 0) return null;

  const result = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, userMemberships[0].workspaceId),
        isNull(workspaces.archivedAt),
      ),
    )
    .limit(1);

  return (result[0] ?? null) as Workspace | null;
}

export async function setDefaultWorkspace(
  _userId: string,
  _workspaceId: string,
): Promise<void> {
  await auth.api.setActiveOrganization({
    body: {
      organizationId: _workspaceId,
    },
  });
}

export async function archiveWorkspace(workspaceId: string): Promise<void> {
  await db
    .update(workspaces)
    .set({ archivedAt: new Date() })
    .where(eq(workspaces.id, Number(workspaceId)));
}

export async function getWorkspaceMemberCount(workspaceId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(memberships)
    .where(eq(memberships.workspaceId, Number(workspaceId)));

  return Number(result[0]?.value ?? 0);
}

export async function getMembersWithUsers(
  workspaceId: string,
): Promise<MembershipWithUser[]> {
  const result = await db.query.memberships.findMany({
    where: eq(memberships.workspaceId, Number(workspaceId)),
    with: {
      user: true,
    },
  });

  return result as unknown as MembershipWithUser[];
}

export async function getActiveWorkspaceId(workspaceSlug?: string): Promise<string> {
  const userMemberships = await db
    .select({ workspaceId: memberships.workspaceId })
    .from(memberships);

  if (userMemberships.length === 0) {
    throw new Error('No workspace membership found for current user');
  }

  if (workspaceSlug) {
    const match = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.slug, workspaceSlug), isNull(workspaces.archivedAt)))
      .limit(1);
    if (match[0]) return match[0].id;
  }

  return userMemberships[0].workspaceId;
}

export async function getActiveWorkspace(workspaceSlug?: string): Promise<ActiveWorkspace | null> {
  const userMemberships = await db
    .select({ workspaceId: memberships.workspaceId })
    .from(memberships);

  if (userMemberships.length === 0) return null;

  const allowedIds = new Set(userMemberships.map((m) => m.workspaceId));

  const headerList = workspaceSlug ? null : await headers();
  const urlSlug = workspaceSlug ?? (headerList?.get('x-workspace-slug') ?? null);

  let target: Workspace | null = null;
  if (urlSlug) {
    const result = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.slug, urlSlug), isNull(workspaces.archivedAt)))
      .limit(1);
    target = (result[0] as Workspace | undefined) ?? null;
  }

  if (!target) {
    const fallbackId = userMemberships[0].workspaceId;
    const result = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, fallbackId))
      .limit(1);
    target = (result[0] as Workspace | undefined) ?? null;
  }

  if (!target || !allowedIds.has(target.id)) return null;
  return {
    id: target.id,
    slug: target.slug,
    name: target.name,
    isActive: true,
  };
}
