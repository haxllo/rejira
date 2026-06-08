import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('server-only', () => ({}));

function makeBuilder(payload: unknown[]) {
  const builder: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve(payload)),
  };
  return builder;
}

const issuePayload = [
  { externalId: 'i_test1', title: 'Test 1', status: 'backlog', priority: 'medium', workspaceId: 'ws_test', projectId: 1, key: 'TEST-1', number: 1, description: '', createdAt: new Date(), updatedAt: new Date() },
];

const activityPayload = [
  { id: 1n, externalId: 'a_1', workspaceId: 'ws_test', actorId: 1n, verb: 'created', objectType: 'issue', objectId: 1n, before: null, after: null, createdAt: new Date(), actorName: 'Aria', actorAvatarColor: 'oklch(0.72 0.18 25)' },
];

let activePayload: unknown[] = issuePayload;

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(() => {
      const builder: Record<string, unknown> = {
        from: vi.fn((t: { _: { name: string | undefined } }) => {
          const name = t?._?.name;
          activePayload = name === 'activities' ? activityPayload : issuePayload;
          return builder;
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve(activePayload)),
      };
      return builder;
    }),
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'u_test', name: 'Test User' }),
}));

vi.mock('@/lib/auth/workspace-helpers', () => ({
  getActiveWorkspaceId: vi.fn().mockResolvedValue('ws_test'),
  getActiveWorkspace: vi.fn(),
}));

const COL = (name: string) => ({ _: { name }, name });
vi.mock('../schema', () => ({
  issues: { _: { name: 'issues' }, workspaceId: COL('workspaceId') },
  activities: { _: { name: 'activities' }, workspaceId: COL('workspaceId') },
  users: { _: { name: 'users' }, id: COL('id') },
  issueAssignees: { issueId: COL('issueId'), userId: COL('userId') },
}));

const repoRoot = path.resolve(__dirname, '../../../../..');
const mockDir = path.join(repoRoot, 'apps/web/lib/mock');

function readMock(name: string): string {
  return fs.readFileSync(path.join(mockDir, name), 'utf-8');
}

describe('mock cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1: lib/mock/issues.ts no longer exports ISSUES; it only re-exports the Issue type from @/lib/db/types', () => {
    const src = readMock('issues.ts');
    expect(src).not.toMatch(/export\s+const\s+ISSUES\b/);
    expect(src).not.toMatch(/export\s+const\s+COMMENTS\b/);
    expect(src).not.toMatch(/export\s+const\s+ACTIVITY\b/);
    expect(src).toMatch(/from\s+['"]\@\/lib\/db\/types['"]/);
  });

  it('2: lib/mock/projects.ts no longer exports PROJECTS; it only re-exports the Project type', () => {
    const src = readMock('projects.ts');
    expect(src).not.toMatch(/export\s+const\s+PROJECTS\b/);
    expect(src).not.toMatch(/export\s+const\s+CYCLES\b/);
    expect(src).not.toMatch(/export\s+const\s+LABELS\b/);
    expect(src).toMatch(/from\s+['"]\@\/lib\/db\/types['"]/);
  });

  it('3: lib/mock/cycles.ts no longer exports CYCLES; it only re-exports the Cycle type', () => {
    const src = readMock('cycles.ts');
    expect(src).not.toMatch(/export\s+const\s+CYCLES\b/);
    expect(src).not.toMatch(/export\s+function\s+cycleById\b/);
    expect(src).toMatch(/from\s+['"]\@\/lib\/db\/types['"]/);
  });

  it('4: lib/mock/labels.ts no longer exports LABELS; it only re-exports the Label type', () => {
    const src = readMock('labels.ts');
    expect(src).not.toMatch(/export\s+const\s+LABELS\b/);
    expect(src).not.toMatch(/export\s+function\s+labels?ById\b/);
    expect(src).toMatch(/from\s+['"]\@\/lib\/db\/types['"]/);
  });

  it('5: pages under (workspace)/home, my-issues, projects do not import data arrays from @/lib/mock', () => {
    const dirs = [
      'apps/web/app/(workspace)/home',
      'apps/web/app/(workspace)/my-issues',
      'apps/web/app/(workspace)/projects',
    ];
    const collected: string[] = [];
    for (const d of dirs) {
      const abs = path.join(repoRoot, d);
      if (!fs.existsSync(abs)) continue;
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (entry.isFile() && p.endsWith('.tsx')) files.push(p);
        }
      };
      walk(abs);
      for (const f of files) {
        const src = fs.readFileSync(f, 'utf-8');
        for (const line of src.split('\n')) {
          if (/from\s+['"]@\/lib\/mock['"]/.test(line)) {
            collected.push(`${f}: ${line.trim()}`);
          }
        }
      }
    }
    expect(collected.join('\n')).not.toMatch(/ISSUES|PROJECTS|CYCLES|LABELS|INBOX|issueById|projectById|cycleById|labelById|issuesByProject|issuesByCycle|issuesAssignedTo|commentsFor|activityFor|labelsForProject/);
  });

  it('6: getRecentActivities(limit: 10) returns activities with the ActivityWithActor shape', async () => {
    const { getRecentActivities } = await import('@/lib/db/rsc');
    const items = await getRecentActivities({ limit: 10 });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    const first = items[0] as Record<string, unknown>;
    expect(first).toHaveProperty('actorName');
    expect(first).toHaveProperty('actorAvatarColor');
    expect(first).toHaveProperty('verb');
    expect(first).toHaveProperty('objectType');
  });

  it('7: getIssuesForActiveWorkspace({ assigneeId }) returns an array of Issues (the My Issues filter)', async () => {
    const { getIssuesForActiveWorkspace } = await import('@/lib/db/rsc');
    const items = await getIssuesForActiveWorkspace({ assigneeId: 'u_aria', limit: 500 });
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(item).toHaveProperty('externalId');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('title');
    }
  });
});
