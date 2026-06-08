import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('../transaction', () => ({
  withWorkspaceTransaction: (_wsId: string, fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n }]),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n }]),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1n }]),
      }),
    };
    return fn(tx);
  },
  withTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1n }]),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1n, expiresAt: new Date(Date.now() + 86400000) }]),
      }),
    };
    return fn(tx);
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 1, externalId: 'u_aria' }),
}));

vi.mock('@/lib/observability/events', () => ({
  trackCommentCreated: vi.fn(),
  trackViewSaved: vi.fn(),
  trackNotificationRead: vi.fn(),
}));

import { createComment, updateComment, deleteComment } from '../actions/comments';
import {
  markNotificationRead,
  markAllNotificationsRead,
  snoozeNotification,
} from '../actions/notifications';
import {
  createSavedView,
  updateSavedView,
  deleteSavedView,
  toggleStarred,
} from '../actions/saved-views';
import { changeRole, removeMember } from '../actions/memberships';
import * as ActionBarrel from '../actions';
import { trackCommentCreated, trackViewSaved } from '@/lib/observability/events';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('actions-aux', () => {
  it('1: createComment inserts a row and fires trackCommentCreated', async () => {
    const row = await createComment({
      workspaceId: 'ws_1',
      issueId: 1,
      body: 'Hello',
    });
    expect(row).toBeDefined();
    expect(trackCommentCreated).toHaveBeenCalledTimes(1);
  });

  it('2: updateComment returns a row', async () => {
    const row = await updateComment({ workspaceId: 'ws_1', commentId: 'cmt_1', body: 'Edited' });
    expect(row).toBeDefined();
  });

  it('3: deleteComment returns true', async () => {
    const result = await deleteComment({ workspaceId: 'ws_1', commentId: 'cmt_1' });
    expect(result).toBe(true);
  });

  it('4: markNotificationRead returns a row', async () => {
    const row = await markNotificationRead({ workspaceId: 'ws_1', notificationId: 'notif_1' });
    expect(row).toBeDefined();
  });

  it('5: markAllNotificationsRead returns a count', async () => {
    const result = await markAllNotificationsRead({ workspaceId: 'ws_1' });
    expect(result).toEqual({ count: expect.any(Number) });
  });

  it('6: snoozeNotification returns a row', async () => {
    const row = await snoozeNotification({
      workspaceId: 'ws_1',
      notificationId: 'notif_1',
      until: new Date(),
    });
    expect(row).toBeDefined();
  });

  it('7: createSavedView inserts a row and fires trackViewSaved', async () => {
    const row = await createSavedView({
      workspaceId: 'ws_1',
      ownerId: '1',
      name: 'My view',
      filter: { status: 'open' },
    });
    expect(row).toBeDefined();
    expect(trackViewSaved).toHaveBeenCalledTimes(1);
  });

  it('8: toggleStarred returns a row', async () => {
    const row = await toggleStarred({ workspaceId: 'ws_1', viewId: 'view_1', starred: true });
    expect(row).toBeDefined();
  });

  it('9: changeRole returns a row', async () => {
    const row = await changeRole({ workspaceId: 'ws_1', membershipId: 'mem_1', newRole: 'admin' });
    expect(row).toBeDefined();
  });

  it('10: removeMember returns true', async () => {
    const result = await removeMember({ workspaceId: 'ws_1', membershipId: 'mem_1' });
    expect(result).toBe(true);
  });

  it('11: actions barrel re-exports every action function', () => {
    expect(typeof ActionBarrel.createIssue).toBe('function');
    expect(typeof ActionBarrel.createProject).toBe('function');
    expect(typeof ActionBarrel.createCycle).toBe('function');
    expect(typeof ActionBarrel.createComment).toBe('function');
    expect(typeof ActionBarrel.markNotificationRead).toBe('function');
    expect(typeof ActionBarrel.createSavedView).toBe('function');
    expect(typeof ActionBarrel.changeRole).toBe('function');
    expect(typeof ActionBarrel.logActivity).toBe('function');
  });
});
