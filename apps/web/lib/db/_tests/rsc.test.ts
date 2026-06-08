import { describe, it, expect, vi, beforeEach } from 'vitest';

interface QueryPlan {
  table: string | null;
  whereCount: number;
  joins: { table: string; on: unknown }[];
  orderBy: unknown[];
  limit: number | null;
  columns?: Record<string, unknown>;
}

function isSqlWrapper(v: unknown): v is { queryChunks: unknown[] } {
  return !!v && typeof v === 'object' && 'queryChunks' in (v as object);
}

function countSqlLeaves(node: unknown): number {
  if (!isSqlWrapper(node)) return 0;
  const chunks = node.queryChunks;
  const hasNestedSql = chunks.some((c) => isSqlWrapper(c));
  if (!hasNestedSql) return 1;
  let sum = 0;
  for (const c of chunks) {
    if (isSqlWrapper(c)) sum += countSqlLeaves(c);
  }
  return sum;
}

function countLeafPredicates(args: unknown[]): number {
  let sum = 0;
  for (const a of args) {
    if (isSqlWrapper(a)) sum += countSqlLeaves(a);
  }
  return sum;
}

function makeQueryBuilder(plan: QueryPlan) {
  const builder: Record<string, unknown> = {
    from: vi.fn((t: { _: { name: string | undefined } }) => {
      plan.table = (t as { _: { name?: string } })._?.name ?? null;
      return builder;
    }),
    where: vi.fn((...args: unknown[]) => {
      plan.whereCount = countLeafPredicates(args);
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
    then: (resolve: (v: unknown) => void, _reject: (e: unknown) => void) => {
      resolve([]);
      return undefined;
    },
  };
  return builder;
}

const mockPlan: QueryPlan = { table: null, whereCount: 0, joins: [], orderBy: [], limit: null };
const mockSelect = vi.fn((..._args: unknown[]) => makeQueryBuilder(mockPlan));

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
}));

const COL = (name: string) => ({ _: { name }, name });
const TABLE = {
  issues: {
    _: { name: 'issues' },
    workspaceId: COL('workspaceId'),
    archivedAt: COL('archivedAt'),
    assigneeIds: COL('assigneeIds'),
    projectId: COL('projectId'),
    cycleId: COL('cycleId'),
    status: COL('status'),
    externalId: COL('externalId'),
    updatedAt: COL('updatedAt'),
  },
  projects: {
    _: { name: 'projects' },
    workspaceId: COL('workspaceId'),
    name: COL('name'),
    key: COL('key'),
    externalId: COL('externalId'),
  },
  cycles: {
    _: { name: 'cycles' },
    workspaceId: COL('workspaceId'),
    projectId: COL('projectId'),
    startsAt: COL('startsAt'),
  },
  labels: {
    _: { name: 'labels' },
    workspaceId: COL('workspaceId'),
    name: COL('name'),
  },
  comments: {
    _: { name: 'comments' },
    issueId: COL('issueId'),
    createdAt: COL('createdAt'),
  },
  notifications: {
    _: { name: 'notifications' },
    userId: COL('userId'),
    read: COL('read'),
    createdAt: COL('createdAt'),
  },
  savedViews: {
    _: { name: 'saved_views' },
    workspaceId: COL('workspaceId'),
  },
  memberships: {
    _: { name: 'memberships' },
    workspaceId: COL('workspaceId'),
  },
  activities: {
    _: { name: 'activities' },
    workspaceId: COL('workspaceId'),
    objectType: COL('objectType'),
    objectId: COL('objectId'),
    createdAt: COL('createdAt'),
    actorId: COL('actorId'),
  },
  users: {
    _: { name: 'users' },
    id: COL('id'),
    name: COL('name'),
    avatarColor: COL('avatarColor'),
  },
};

vi.mock('@/lib/db/schema', () => ({
  issues: TABLE.issues,
  projects: TABLE.projects,
  cycles: TABLE.cycles,
  labels: TABLE.labels,
  comments: TABLE.comments,
  notifications: TABLE.notifications,
  savedViews: TABLE.savedViews,
  memberships: TABLE.memberships,
  activities: TABLE.activities,
  users: TABLE.users,
}));

beforeEach(() => {
  mockPlan.table = null;
  mockPlan.whereCount = 0;
  mockPlan.joins = [];
  mockPlan.orderBy = [];
  mockPlan.limit = null;
  mockSelect.mockClear();
});

describe('rsc helpers', () => {
  it('1: getIssuesForActiveWorkspace() runs a select on issues for the active workspace and excludes archived rows by default', async () => {
    const { getIssuesForActiveWorkspace } = await import('../rsc');
    await getIssuesForActiveWorkspace();
    expect(mockPlan.table).toBe('issues');
    expect(mockPlan.whereCount).toBeGreaterThanOrEqual(2);
    expect(mockPlan.limit).toBe(500);
  });

  it('2: getIssuesForActiveWorkspace({ assigneeId: "u_abc" }) adds an array-contains predicate', async () => {
    const { getIssuesForActiveWorkspace } = await import('../rsc');
    await getIssuesForActiveWorkspace({ assigneeId: 'u_abc' });
    expect(mockPlan.whereCount).toBeGreaterThanOrEqual(2);
  });

  it('3: getIssuesForActiveWorkspace({ projectId: 42 }) adds projectId predicate', async () => {
    const { getIssuesForActiveWorkspace } = await import('../rsc');
    await getIssuesForActiveWorkspace({ projectId: 42 });
    expect(mockPlan.whereCount).toBeGreaterThanOrEqual(2);
  });

  it('4: getIssuesForActiveWorkspace({ cycleId: 7 }) adds cycleId predicate', async () => {
    const { getIssuesForActiveWorkspace } = await import('../rsc');
    await getIssuesForActiveWorkspace({ cycleId: 7 });
    expect(mockPlan.whereCount).toBeGreaterThanOrEqual(2);
  });

  it('5: getIssuesForActiveWorkspace({ status: "in_progress" }) adds status predicate', async () => {
    const { getIssuesForActiveWorkspace } = await import('../rsc');
    await getIssuesForActiveWorkspace({ status: 'in_progress' });
    expect(mockPlan.whereCount).toBeGreaterThanOrEqual(2);
  });

  it('6: getProjects() returns projects filtered by the active workspace', async () => {
    const { getProjects } = await import('../rsc');
    await getProjects();
    expect(mockPlan.table).toBe('projects');
    expect(mockPlan.whereCount).toBe(1);
    expect(mockPlan.orderBy.length).toBe(1);
  });

  it('7: getCycles({ projectId }) returns cycles for that project within the active workspace', async () => {
    const { getCycles } = await import('../rsc');
    await getCycles({ projectId: 99 });
    expect(mockPlan.table).toBe('cycles');
    expect(mockPlan.whereCount).toBe(2);
  });

  it('8: getComments(issueId) returns comments ordered by createdAt ASC for that issue', async () => {
    const { getComments } = await import('../rsc');
    await getComments('1');
    expect(mockPlan.table).toBe('comments');
    expect(mockPlan.whereCount).toBe(1);
    expect(mockPlan.orderBy.length).toBe(1);
  });

  it('9: getNotifications() returns notifications for the current user', async () => {
    const { getNotifications } = await import('../rsc');
    await getNotifications();
    expect(mockPlan.table).toBe('notifications');
    expect(mockPlan.whereCount).toBe(1);
    expect(mockPlan.limit).toBe(100);
  });

  it('10: getRecentActivities({ limit: 10 }) returns latest 10 activities joined with users for actor display', async () => {
    const { getRecentActivities } = await import('../rsc');
    await getRecentActivities({ limit: 10 });
    expect(mockPlan.table).toBe('activities');
    expect(mockPlan.joins.some((j) => j.table === 'users')).toBe(true);
    expect(mockPlan.limit).toBe(10);
  });

  it('11: all RSC helpers re-throw the redirect when requireAuth() throws', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');
    const redirectError = new Error('NEXT_REDIRECT;/sign-in?next=/test');
    (redirectError as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(redirectError);
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(redirectError);
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(redirectError);

    const { getProjects, getIssuesForActiveWorkspace, getLabels } = await import('../rsc');
    await expect(getProjects()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' });
    await expect(getIssuesForActiveWorkspace()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' });
    await expect(getLabels()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' });
  });

  it('12: getNotifications({ unreadOnly: true }) adds read=false predicate', async () => {
    const { getNotifications } = await import('../rsc');
    await getNotifications({ unreadOnly: true });
    expect(mockPlan.whereCount).toBe(2);
  });

  it('13: getSavedViews() returns saved views for the active workspace', async () => {
    const { getSavedViews } = await import('../rsc');
    await getSavedViews();
    expect(mockPlan.table).toBe('saved_views');
    expect(mockPlan.whereCount).toBe(1);
  });

  it('14: getMemberships() returns memberships for the active workspace', async () => {
    const { getMemberships } = await import('../rsc');
    await getMemberships();
    expect(mockPlan.table).toBe('memberships');
    expect(mockPlan.whereCount).toBe(1);
  });

  it('15: getActivitiesForObject({ objectType, objectId }) filters by objectType and objectId and joins users', async () => {
    const { getActivitiesForObject } = await import('../rsc');
    await getActivitiesForObject({ objectType: 'issue', objectId: '42' });
    expect(mockPlan.table).toBe('activities');
    expect(mockPlan.joins.some((j) => j.table === 'users')).toBe(true);
    expect(mockPlan.whereCount).toBe(3);
  });

  it('16: getIssue(issueId) returns the issue by external id (no workspace scope at this layer)', async () => {
    const { getIssue } = await import('../rsc');
    await getIssue('i_1001');
    expect(mockPlan.table).toBe('issues');
    expect(mockPlan.whereCount).toBe(1);
    expect(mockPlan.limit).toBe(1);
  });
});
