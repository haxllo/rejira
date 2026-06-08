import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('server-only', () => ({}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockLeftJoin = vi.fn();

function makeBuilder(plan: { table: string | null; joins: string[] }) {
  const builder: Record<string, unknown> = {
    from: vi.fn((t: { _: { name: string | undefined } }) => {
      plan.table = t?._?.name ?? null;
      return builder;
    }),
    where: vi.fn(() => builder),
    leftJoin: vi.fn((t: { _: { name: string | undefined } }) => {
      plan.joins.push(t?._?.name ?? 'unknown');
      return builder;
    }),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (v: unknown) => void) => {
      resolve([]);
      return undefined;
    },
  };
  return builder;
}

const mockPlan = { table: null, joins: [] as string[] };

vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return makeBuilder(mockPlan);
    },
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'u_aria', name: 'Aria' }),
}));

vi.mock('@/lib/auth/workspace-helpers', () => ({
  getActiveWorkspaceId: vi.fn().mockResolvedValue('ws_test'),
  getActiveWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(),
}));

const COL = (name: string) => ({ _: { name } });
vi.mock('@/lib/db/schema', () => ({
  issues: { _: { name: 'issues' }, workspaceId: COL('workspaceId'), projectId: COL('projectId'), cycleId: COL('cycleId'), status: COL('status'), externalId: COL('externalId') },
  projects: { _: { name: 'projects' }, workspaceId: COL('workspaceId'), key: COL('key') },
  cycles: { _: { name: 'cycles' }, workspaceId: COL('workspaceId'), projectId: COL('projectId') },
  labels: { _: { name: 'labels' }, workspaceId: COL('workspaceId') },
  users: { _: { name: 'users' }, id: COL('id'), externalId: COL('externalId') },
  memberships: { _: { name: 'memberships' }, workspaceId: COL('workspaceId') },
  activities: { _: { name: 'activities' }, workspaceId: COL('workspaceId') },
  issueAssignees: { issueId: COL('issueId'), userId: COL('userId'), workspaceId: COL('workspaceId') },
}));

const repoRoot = path.resolve(__dirname, '../../../../..');
const componentsDir = path.join(repoRoot, 'apps/web/components');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf-8');
}

beforeEach(() => {
  mockPlan.table = null;
  mockPlan.joins = [];
  mockSelect.mockClear();
  mockFrom.mockClear();
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockLimit.mockClear();
  mockLeftJoin.mockClear();
});

describe('pages-integration', () => {
  it('1: getIssuesForActiveWorkspace({ projectId }) reads from the issues table', async () => {
    const { getIssuesForActiveWorkspace } = await import('@/lib/db/rsc');
    await getIssuesForActiveWorkspace({ projectId: 1 });
    expect(mockPlan.table).toBe('issues');
  });

  it('2: getCycles({ projectId }) reads from the cycles table', async () => {
    const { getCycles } = await import('@/lib/db/rsc');
    await getCycles({ projectId: 1 });
    expect(mockPlan.table).toBe('cycles');
  });

  it('3: getProjectByKey reads from the projects table', async () => {
    const { getProjectByKey } = await import('@/lib/db/rsc');
    await getProjectByKey('ENG');
    expect(mockPlan.table).toBe('projects');
  });

  it('4: components/views/grouped-list.tsx contains no import from @/lib/mock', () => {
    const src = readFile('apps/web/components/views/grouped-list.tsx');
    expect(src).not.toMatch(/from\s+['"]\@\/lib\/mock['"]/);
  });

  it('5: components/issue/issue-row.tsx contains no import from @/lib/mock', () => {
    const src = readFile('apps/web/components/issue/issue-row.tsx');
    expect(src).not.toMatch(/from\s+['"]\@\/lib\/mock['"]/);
  });

  it('6: components/views/cycle-board.tsx contains no import from @/lib/mock', () => {
    const src = readFile('apps/web/components/views/cycle-board.tsx');
    expect(src).not.toMatch(/from\s+['"]\@\/lib\/mock['"]/);
  });

  it('7: components/issue/issue-drawer.tsx contains no import from @/lib/mock', () => {
    const src = readFile('apps/web/components/issue/issue-drawer.tsx');
    expect(src).not.toMatch(/from\s+['"]\@\/lib\/mock['"]/);
  });
});
