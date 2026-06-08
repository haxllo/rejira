import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd());

interface QueryPlan {
  table: string | null;
  whereCount: number;
  joins: { table: string; on: unknown }[];
  orderBy: unknown[];
  limit: number | null;
  columns?: Record<string, unknown>;
}

const COL = (name: string) => ({ _: { name }, name });
const TABLE = {
  notifications: { _: { name: 'notifications' }, workspaceId: COL('workspaceId'), userId: COL('userId'), read: COL('read'), createdAt: COL('createdAt'), type: COL('type') },
  users: { _: { name: 'users' }, externalId: COL('externalId'), name: COL('name'), email: COL('email'), avatarColor: COL('avatarColor'), id: COL('id') },
  issues: { _: { name: 'issues' }, externalId: COL('externalId'), key: COL('key'), title: COL('title'), id: COL('id'), workspaceId: COL('workspaceId'), projectId: COL('projectId'), status: COL('status'), archivedAt: COL('archivedAt'), assigneeIds: COL('assigneeIds'), cycleId: COL('cycleId'), updatedAt: COL('updatedAt') },
  savedViews: { _: { name: 'saved_views' }, workspaceId: COL('workspaceId'), createdAt: COL('createdAt'), externalId: COL('externalId') },
  memberships: { _: { name: 'memberships' }, workspaceId: COL('workspaceId'), userId: COL('userId'), createdAt: COL('createdAt'), id: COL('id'), externalId: COL('externalId'), role: COL('role'), updatedAt: COL('updatedAt') },
  projects: { _: { name: 'projects' }, id: COL('id'), workspaceId: COL('workspaceId'), key: COL('key'), name: COL('name') },
  activities: { _: { name: 'activities' }, id: COL('id'), workspaceId: COL('workspaceId'), objectType: COL('objectType'), objectId: COL('objectId'), createdAt: COL('createdAt'), actorId: COL('actorId'), verb: COL('verb'), before: COL('before'), after: COL('after'), externalId: COL('externalId') },
  cycles: { _: { name: 'cycles' }, workspaceId: COL('workspaceId'), projectId: COL('projectId'), startsAt: COL('startsAt') },
  comments: { _: { name: 'comments' }, issueId: COL('issueId'), createdAt: COL('createdAt') },
  labels: { _: { name: 'labels' }, workspaceId: COL('workspaceId'), name: COL('name') },
};

const mockPlans: QueryPlan[] = [];
let nextPlanIdx = 0;

function makeQueryBuilder(plan: QueryPlan): Record<string, unknown> {
  const builder: Record<string, unknown> = {
    from: vi.fn((t: { _: { name: string | undefined } }) => {
      plan.table = (t as { _: { name?: string } })._?.name ?? null;
      return builder;
    }),
    where: vi.fn((...args: unknown[]) => {
      plan.whereCount += args.length === 0 ? 1 : Math.max(1, args.length);
      return builder;
    }),
    leftJoin: vi.fn((t: { _: { name: string | undefined } }, on: unknown) => {
      plan.joins.push({ table: (t as { _: { name?: string } })._?.name ?? 'unknown', on });
      return builder;
    }),
    innerJoin: vi.fn((t: { _: { name: string | undefined } }, on: unknown) => {
      plan.joins.push({ table: (t as { _: { name?: string } })._?.name ?? 'unknown', on });
      return builder;
    }),
    orderBy: vi.fn((...args: unknown[]) => {
      plan.orderBy.push(...args);
      return builder;
    }),
    limit: vi.fn((n: number) => {
      plan.limit = n;
      return builder;
    }),
    offset: vi.fn(),
    groupBy: vi.fn(),
    then: (resolve: (v: unknown) => void) => {
      resolve([]);
      return undefined;
    },
  };
  return builder;
}

function nextPlan(): QueryPlan {
  const p: QueryPlan = { table: null, whereCount: 0, joins: [], orderBy: [], limit: null };
  mockPlans.push(p);
  return p;
}

const mockSelect = vi.fn((cols?: Record<string, unknown>) => {
  if (cols) {
    const p = mockPlans[nextPlanIdx++];
    if (p) p.columns = cols;
  }
  return makeQueryBuilder(mockPlans[nextPlanIdx++] ?? nextPlan());
});

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'u_aria', email: 'aria@acme.com' }),
}));

vi.mock('@/lib/auth/workspace-helpers', () => ({
  getActiveWorkspaceId: vi.fn().mockResolvedValue('ws_test'),
  getActiveWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error('NEXT_REDIRECT');
    (err as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    (err as Error & { __url: string }).message = `NEXT_REDIRECT;${url}`;
    throw err;
  }),
  notFound: vi.fn(() => {
    const err = new Error('NEXT_NOT_FOUND');
    (err as Error & { digest: string }).digest = 'NEXT_NOT_FOUND';
    throw err;
  }),
}));

vi.mock('@/lib/db/schema', () => ({
  ...TABLE,
  __esModule: true,
  default: TABLE,
}));

const { getNotifications, getSavedViews, getMembershipsWithUsers, getIssuesForActiveWorkspace, getActivitiesForObject } = await import('../rsc');

beforeEach(() => {
  vi.clearAllMocks();
  mockPlans.length = 0;
  nextPlanIdx = 0;
});

describe('pages-aux RSC read helpers', () => {
  it('1: getNotifications() returns rows from the notifications table', async () => {
    await getNotifications({ limit: 100 });
    expect(mockSelect).toHaveBeenCalled();
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('notifications');
    expect(lastPlan.limit).toBe(100);
  });

  it('2: getNotifications({ unreadOnly: true }) issues a where() clause', async () => {
    await getNotifications({ unreadOnly: true, limit: 50 });
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('notifications');
    expect(lastPlan.whereCount).toBeGreaterThanOrEqual(1);
  });

  it('3: getSavedViews() returns rows from the saved_views table', async () => {
    await getSavedViews();
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('saved_views');
  });

  it('4: getMembershipsWithUsers() joins memberships and users', async () => {
    await getMembershipsWithUsers();
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('memberships');
    expect(lastPlan.joins.some((j) => j.table === 'users')).toBe(true);
  });

  it('5: getIssuesForActiveWorkspace({ projectId }) issues a where() clause', async () => {
    await getIssuesForActiveWorkspace({ projectId: 42, limit: 200 });
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('issues');
    expect(lastPlan.whereCount).toBeGreaterThanOrEqual(1);
  });

  it('6: getActivitiesForObject({ objectType: "project", objectId }) targets the project', async () => {
    await getActivitiesForObject({ objectType: 'project', objectId: '7' });
    const lastPlan = mockPlans[mockPlans.length - 1];
    expect(lastPlan.table).toBe('activities');
    expect(lastPlan.joins.some((j) => j.table === 'users')).toBe(true);
  });
});

describe('pages-aux mock-data cleanup', () => {
  it('7: apps/web/lib/mock/inbox.ts does not export INBOX (only types)', () => {
    const text = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/web/lib/mock/inbox.ts'),
      'utf8',
    );
    expect(text).toContain("from '@/lib/db/types'");
    expect(/export\s+const\s+INBOX\b/.test(text)).toBe(false);
    expect(/export\s+function\s+inboxFor\b/.test(text)).toBe(false);
  });

  it('8: apps/web/lib/mock/users.ts does not export USERS (only types)', () => {
    const text = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/web/lib/mock/users.ts'),
      'utf8',
    );
    expect(text).toContain("from '@/lib/db/types'");
    expect(/export\s+const\s+USERS\b/.test(text)).toBe(false);
    expect(/export\s+function\s+userById\b/.test(text)).toBe(false);
  });

  it('9: apps/web/lib/mock/index.ts has no data constants (only type re-exports)', () => {
    const text = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/web/lib/mock/index.ts'),
      'utf8',
    );
    expect(/^export\s+const\s+/m.test(text)).toBe(false);
    expect(/^export\s+function\s+/m.test(text)).toBe(false);
  });
});
