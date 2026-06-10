import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'u_test', externalId: 'u_test' }),
}));

vi.mock('@/lib/auth/workspace-helpers', () => ({
  getActiveWorkspaceId: vi.fn().mockResolvedValue('ws_test'),
}));

const mockTx = {
  execute: vi.fn().mockResolvedValue(undefined),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  withWorkspaceTransaction: vi.fn().mockImplementation(
    async (_workspaceId: string, fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
  ),
  withTransaction: vi.fn().mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
  ),
  mapDrizzleError: vi.fn().mockImplementation((err: unknown) => ({
    message: err instanceof Error ? err.message : 'Something went wrong',
    code: 'INTERNAL',
    status: 500,
    cause: err,
  })),
  DbError: class extends Error {
    code: string;
    status: number;
    constructor(message: string, options: { code: string; status: number }) {
      super(message);
      this.code = options.code;
      this.status = options.status;
    }
  },
}));

vi.mock('@/lib/observability/events', () => ({
  trackIssueCreated: vi.fn(),
  trackStatusChanged: vi.fn(),
  trackProjectCreated: vi.fn(),
  trackCycleCreated: vi.fn(),
  trackCommentCreated: vi.fn(),
  trackViewSaved: vi.fn(),
}));

vi.mock('@/lib/utils/id', () => ({
  createId: vi.fn().mockReturnValue('mock_id_123'),
}));

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockFrom = vi.fn(() => ({ where: mockFromWhere, orderBy: mockOrderBy, limit: mockLimit }));
const mockFromWhere = vi.fn(() => ({ limit: mockLimit }));
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
const mockLimit = vi.fn();
const mockDeleteWhere = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockTx.insert.mockReturnValue({ values: mockValues });
  mockTx.update.mockReturnValue({ set: mockSet });
  mockTx.delete.mockReturnValue({ where: mockDeleteWhere });
  mockTx.select.mockReturnValue({ from: mockFrom });
  mockDeleteWhere.mockResolvedValue(undefined);
  mockReturning.mockResolvedValue([{ id: 1n, externalId: 'iss_1', title: 'Test', status: 'todo', workspaceId: 'ws_test' }]);
  mockLimit.mockResolvedValue([{ id: 1n, externalId: 'iss_1', title: 'Test', status: 'todo', workspaceId: 'ws_test' }]);
});

async function post(url: string, body: unknown) {
  const req = new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return import(`@/app/api/db/issues/route`).then((m) => m.POST(req));
}

async function get(url: string) {
  const req = new Request(`http://localhost${url}`);
  return import(`@/app/api/db/issues/route`).then((m) => m.GET(req));
}

describe('cutover-actions', () => {
  describe('POST /api/db/issues', () => {
    it('Test 1: setStatus returns updated issue row as JSON', async () => {
      mockReturning.mockResolvedValue([{ id: 5n, externalId: 'iss_5', title: 'Fix Bug', status: 'done', workspaceId: 'ws_test' }]);
      mockLimit.mockResolvedValue([{ status: 'todo' }]);

      const res = await post('/api/db/issues', {
        op: 'setStatus',
        workspaceId: 'ws_test',
        issueId: 'iss_5',
        status: 'done',
      });

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe('done');
      expect(data.externalId).toBe('iss_5');
    });

    it('Test 2: unknown op returns 400', async () => {
      const res = await post('/api/db/issues', {
        op: 'someUnknownOp',
        workspaceId: 'ws_test',
        issueId: 'iss_5',
        status: 'done',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('Test 3: missing required field returns 400 with zod error', async () => {
      const res = await post('/api/db/issues', {
        op: 'setStatus',
        workspaceId: 'ws_test',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    it('Test 4: workspaceId mismatch returns 403', async () => {
      const { getActiveWorkspaceId } = await import('@/lib/auth/workspace-helpers');
      (getActiveWorkspaceId as ReturnType<typeof vi.fn>).mockResolvedValueOnce('ws_other');

      const res = await post('/api/db/issues', {
        op: 'setStatus',
        workspaceId: 'ws_test',
        issueId: 'iss_5',
        status: 'done',
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Workspace mismatch');
    });

    it('Test 5: POST /api/db/notifications markAllRead returns { count: N }', async () => {
      vi.mock('@/lib/db/schema/notifications', () => ({
        notifications: { id: vi.fn(), externalId: vi.fn(), read: vi.fn(), userId: vi.fn() },
      }));
      mockReturning.mockResolvedValue([{ id: 1n }, { id: 2n }, { id: 3n }]);

      const { POST } = await import('@/app/api/db/notifications/route');
      const req = new Request('http://localhost/api/db/notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'markAllRead', workspaceId: 'ws_test' }),
      });
      const res = await POST(req);

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.count).toBe(3);
    });

    it('Test 6: POST /api/db/saved-views create returns new view row', async () => {
      mockReturning.mockResolvedValue([{ id: 10n, externalId: 'view_10', name: 'My View', workspaceId: 'ws_test' }]);

      const { POST } = await import('@/app/api/db/saved-views/route');
      const req = new Request('http://localhost/api/db/saved-views', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          op: 'create',
          workspaceId: 'ws_test',
          ownerId: 'u_test',
          name: 'My View',
          filter: { status: 'todo' },
          sort: { key: 'updated', dir: 'desc' },
          groupBy: 'status',
          starred: false,
        }),
      });
      const res = await POST(req);

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.externalId).toBe('view_10');
    });

    it('Test 7: route handlers catch DbError and return mapped status', async () => {
      const { DbError: MockDbError } = await import('@/lib/db');
      const { withWorkspaceTransaction } = await import('@/lib/db');

      (withWorkspaceTransaction as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new (MockDbError as typeof Error)('Forbidden', { code: 'FORBIDDEN', status: 403 }),
      );

      const res = await post('/api/db/issues', {
        op: 'setStatus',
        workspaceId: 'ws_test',
        issueId: 'iss_5',
        status: 'done',
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('action signatures', () => {
    it('Test 8: each action takes (tx, input) not just (input)', async () => {
      const actionsModule = await import('@/lib/db/actions');
      expect(typeof actionsModule.setStatus).toBe('function');
      expect(actionsModule.setStatus.length).toBeGreaterThanOrEqual(2);

      const result = await actionsModule.setStatus(mockTx, {
        workspaceId: 'ws_test',
        issueId: 'iss_1',
        status: 'in_progress',
      });

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
