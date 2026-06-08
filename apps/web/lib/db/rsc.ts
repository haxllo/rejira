import 'server-only';

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from './client';
import * as s from './schema';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId, type ActiveWorkspace } from '@/lib/auth/workspace-helpers';
import type { AuthUser } from '@/lib/auth/types';
import type { Issue, Project, Cycle, Label, Comment, Notification, SavedView, Membership, Activity, StatusKey } from './types';

interface ActiveContext {
  user: AuthUser;
  workspaceId: string;
}

async function getActiveContext(workspaceSlug?: string): Promise<ActiveContext> {
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(workspaceSlug);
  return { user, workspaceId };
}

export interface IssueFilters {
  assigneeId?: string;
  projectId?: number;
  cycleId?: number;
  status?: StatusKey;
  includeArchived?: boolean;
  limit?: number;
}

export async function getIssuesForActiveWorkspace(filters?: IssueFilters): Promise<Issue[]> {
  const { workspaceId } = await getActiveContext();
  const whereClause = and(
    eq(s.issues.workspaceId, workspaceId),
    filters?.includeArchived ? undefined : isNull(s.issues.archivedAt),
    filters?.assigneeId
      ? sql`EXISTS (
          SELECT 1 FROM ${s.issueAssignees} ia
          JOIN ${s.users} u ON u.id = ia.userId
          WHERE ia.issue_id = ${s.issues.id}
            AND ia.workspace_id = ${workspaceId}
            AND u.external_id = ${filters.assigneeId}
        )`
      : undefined,
    filters?.projectId ? eq(s.issues.projectId, filters.projectId) : undefined,
    filters?.cycleId ? eq(s.issues.cycleId, filters.cycleId) : undefined,
    filters?.status ? eq(s.issues.status, filters.status) : undefined,
  );
  return db
    .select()
    .from(s.issues)
    .where(whereClause)
    .orderBy(asc(s.issues.status), desc(s.issues.updatedAt))
    .limit(filters?.limit ?? 500);
}

export async function getProjects(): Promise<Project[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select()
    .from(s.projects)
    .where(eq(s.projects.workspaceId, workspaceId))
    .orderBy(asc(s.projects.name));
}

export async function getProjectByKey(key: string): Promise<Project | null> {
  const { workspaceId } = await getActiveContext();
  const rows = await db
    .select()
    .from(s.projects)
    .where(and(eq(s.projects.workspaceId, workspaceId), eq(s.projects.key, key)))
    .limit(1);
  return (rows[0] as Project | undefined) ?? null;
}

export interface CycleFilters {
  projectId?: number;
}

export async function getCycles(filters?: CycleFilters): Promise<Cycle[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select()
    .from(s.cycles)
    .where(
      and(
        eq(s.cycles.workspaceId, workspaceId),
        filters?.projectId ? eq(s.cycles.projectId, filters.projectId) : undefined,
      ),
    )
    .orderBy(desc(s.cycles.startsAt));
}

export async function getLabels(): Promise<Label[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select()
    .from(s.labels)
    .where(eq(s.labels.workspaceId, workspaceId))
    .orderBy(asc(s.labels.name));
}

export async function getUsers(): Promise<User[]> {
  const { workspaceId } = await getActiveContext();
  const rows = await db
    .select({
      id: s.users.id,
      externalId: s.users.externalId,
      email: s.users.email,
      name: s.users.name,
      avatarColor: s.users.avatarColor,
      avatarUrl: s.users.avatarUrl,
      status: s.users.status,
      createdAt: s.users.createdAt,
      updatedAt: s.users.updatedAt,
    })
    .from(s.users)
    .innerJoin(s.memberships, eq(s.memberships.userId, s.users.externalId))
    .where(eq(s.memberships.workspaceId, workspaceId))
    .orderBy(asc(s.users.name));
  return rows as unknown as User[];
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  const rows = await db
    .select()
    .from(s.issues)
    .where(eq(s.issues.externalId, issueId))
    .limit(1);
  return (rows[0] as Issue | undefined) ?? null;
}

export async function getComments(issueId: string): Promise<Comment[]> {
  await getActiveContext();
  return db
    .select()
    .from(s.comments)
    .where(eq(s.comments.issueId, BigInt(issueId)))
    .orderBy(asc(s.comments.createdAt));
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
}

export async function getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
  const { user } = await getActiveContext();
  const userExternalId = (user as unknown as { id?: string }).id ?? '';
  return db
    .select()
    .from(s.notifications)
    .where(
      and(
        eq(s.notifications.userId, sql`(SELECT id FROM ${s.users} WHERE ${s.users.externalId} = ${userExternalId})`),
        filters?.unreadOnly ? eq(s.notifications.read, false) : undefined,
      ),
    )
    .orderBy(desc(s.notifications.createdAt))
    .limit(filters?.limit ?? 100);
}

export async function getSavedViews(): Promise<SavedView[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select()
    .from(s.savedViews)
    .where(eq(s.savedViews.workspaceId, workspaceId))
    .orderBy(asc(s.savedViews.createdAt));
}

export async function getMemberships(): Promise<Membership[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select()
    .from(s.memberships)
    .where(eq(s.memberships.workspaceId, workspaceId))
    .orderBy(asc(s.memberships.createdAt));
}

export type MembershipWithUser = Membership & {
  userName: string | null;
  userEmail: string | null;
  userAvatarColor: string | null;
};

export async function getMembershipsWithUsers(): Promise<MembershipWithUser[]> {
  const { workspaceId } = await getActiveContext();
  return db
    .select({
      id: s.memberships.id,
      externalId: s.memberships.externalId,
      userId: s.memberships.userId,
      workspaceId: s.memberships.workspaceId,
      role: s.memberships.role,
      createdAt: s.memberships.createdAt,
      updatedAt: s.memberships.updatedAt,
      userName: s.users.name,
      userEmail: s.users.email,
      userAvatarColor: s.users.avatarColor,
    })
    .from(s.memberships)
    .leftJoin(s.users, eq(s.memberships.userId, s.users.externalId))
    .where(eq(s.memberships.workspaceId, workspaceId))
    .orderBy(asc(s.memberships.createdAt)) as unknown as MembershipWithUser[];
}

export type ActivityWithActor = Activity & {
  actorName: string | null;
  actorAvatarColor: string | null;
};

export interface RecentActivitiesOptions {
  workspaceId?: string;
  limit?: number;
}

export async function getRecentActivities(
  options: RecentActivitiesOptions = {},
): Promise<ActivityWithActor[]> {
  const { workspaceId: activeWs } = await getActiveContext();
  const workspaceId = options.workspaceId ?? activeWs;
  return db
    .select({
      id: s.activities.id,
      externalId: s.activities.externalId,
      workspaceId: s.activities.workspaceId,
      actorId: s.activities.actorId,
      verb: s.activities.verb,
      objectType: s.activities.objectType,
      objectId: s.activities.objectId,
      before: s.activities.before,
      after: s.activities.after,
      createdAt: s.activities.createdAt,
      actorName: s.users.name,
      actorAvatarColor: s.users.avatarColor,
    })
    .from(s.activities)
    .leftJoin(s.users, eq(s.activities.actorId, s.users.id))
    .where(eq(s.activities.workspaceId, workspaceId))
    .orderBy(desc(s.activities.createdAt))
    .limit(options.limit ?? 10) as unknown as ActivityWithActor[];
}

export interface ActivitiesForObjectOptions {
  workspaceId?: string;
  objectType: 'issue' | 'project' | 'cycle' | 'comment';
  objectId: string;
  limit?: number;
}

export async function getActivitiesForObject(
  options: ActivitiesForObjectOptions,
): Promise<(Activity & { actorName: string | null })[]> {
  const { workspaceId: activeWs } = await getActiveContext();
  const workspaceId = options.workspaceId ?? activeWs;
  const objectTypeMap: Record<ActivitiesForObjectOptions['objectType'], string> = {
    issue: 'issues',
    project: 'projects',
    cycle: 'cycles',
    comment: 'comments',
  };
  return db
    .select({
      id: s.activities.id,
      externalId: s.activities.externalId,
      workspaceId: s.activities.workspaceId,
      actorId: s.activities.actorId,
      verb: s.activities.verb,
      objectType: s.activities.objectType,
      objectId: s.activities.objectId,
      before: s.activities.before,
      after: s.activities.after,
      createdAt: s.activities.createdAt,
      actorName: s.users.name,
    })
    .from(s.activities)
    .leftJoin(s.users, eq(s.activities.actorId, s.users.id))
    .where(
      and(
        eq(s.activities.workspaceId, workspaceId),
        eq(s.activities.objectType, objectTypeMap[options.objectType]),
        eq(s.activities.objectId, BigInt(options.objectId)),
      ),
    )
    .orderBy(desc(s.activities.createdAt))
    .limit(options.limit ?? 50) as unknown as (Activity & { actorName: string | null })[];
}

export type { ActiveWorkspace };
