import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('../transaction', () => ({
  withWorkspaceTransaction: (_wsId: string, fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n, status: 'backlog' }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n, status: 'in_progress' }]),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ status: 'backlog' }]),
      }),
    };
    return fn(tx);
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 1, externalId: 'u_aria' }),
}));

vi.mock('@/lib/observability/events', () => ({
  trackIssueCreated: vi.fn(),
  trackStatusChanged: vi.fn(),
  trackProjectCreated: vi.fn(),
  trackCycleCreated: vi.fn(),
  trackCommentCreated: vi.fn(),
  trackViewSaved: vi.fn(),
  trackNotificationRead: vi.fn(),
}));

import { createIssue, setStatus, archiveIssue, bulkArchive } from '../actions/issues';
import { createProject, archiveProject } from '../actions/projects';
import { createCycle, completeCycle } from '../actions/cycles';
import { logActivity } from '../actions/activities';
import {
  trackIssueCreated,
  trackStatusChanged,
  trackProjectCreated,
  trackCycleCreated,
} from '@/lib/observability/events';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('actions-core', () => {
  it('1: createIssue returns a row and fires trackIssueCreated', async () => {
    const row = await createIssue({
      workspaceId: 'ws_1',
      projectId: 1,
      title: 'A new issue',
    });
    expect(row).toBeDefined();
    expect(row.id).toBe(1n);
    expect(trackIssueCreated).toHaveBeenCalledTimes(1);
    expect(trackIssueCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws_1',
        projectId: 1,
        hasAssignee: false,
        hasLabel: false,
        hasDueDate: false,
      }),
    );
  });

  it('2: setStatus returns the updated row and fires trackStatusChanged with from/to', async () => {
    const row = await setStatus({
      workspaceId: 'ws_1',
      issueId: 'iss_1',
      status: 'in_progress',
    });
    expect(row).toBeDefined();
    expect(trackStatusChanged).toHaveBeenCalledTimes(1);
    expect(trackStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'backlog',
        to: 'in_progress',
        workspaceId: 'ws_1',
        issueId: 'iss_1',
      }),
    );
  });

  it('3: archiveIssue invokes the transaction and returns a row', async () => {
    const row = await archiveIssue({ workspaceId: 'ws_1', issueId: 'iss_1' });
    expect(row).toBeDefined();
  });

  it('4: bulkArchive returns true and accepts an empty array', async () => {
    const result = await bulkArchive({ workspaceId: 'ws_1', issueIds: [] });
    expect(result).toBe(true);
    const result2 = await bulkArchive({ workspaceId: 'ws_1', issueIds: ['iss_1', 'iss_2'] });
    expect(result2).toBe(true);
  });

  it('5: createProject returns a row and fires trackProjectCreated', async () => {
    const row = await createProject({
      workspaceId: 'ws_1',
      name: 'Demo',
      key: 'DEMO',
    });
    expect(row).toBeDefined();
    expect(trackProjectCreated).toHaveBeenCalledTimes(1);
    expect(trackProjectCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws_1',
        projectId: 1,
      }),
    );
  });

  it('6: archiveProject returns a row', async () => {
    const row = await archiveProject({ workspaceId: 'ws_1', projectId: 'proj_1' });
    expect(row).toBeDefined();
  });

  it('7: createCycle returns a row and fires trackCycleCreated', async () => {
    const row = await createCycle({
      workspaceId: 'ws_1',
      projectId: 1,
      name: 'Sprint 1',
    });
    expect(row).toBeDefined();
    expect(trackCycleCreated).toHaveBeenCalledTimes(1);
    expect(trackCycleCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws_1',
        cycleId: 1,
        projectId: 1,
      }),
    );
  });

  it('8: completeCycle returns a row with completed status', async () => {
    const row = await completeCycle({ workspaceId: 'ws_1', cycleId: 'cyc_1' });
    expect(row).toBeDefined();
  });

  it('9: logActivity returns true', async () => {
    const result = await logActivity({
      workspaceId: 'ws_1',
      objectType: 'issue',
      objectId: '1',
      verb: 'created',
    });
    expect(result).toBe(true);
  });
});
