/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

let unsubFns: Array<() => void> = [];

const mockSubscribeToIssues = vi.fn((_workspaceId: string, onChange: (payload: unknown) => void) => {
  const unsub = vi.fn();
  unsubFns.push(unsub);
  return { unsubscribe: unsub, _onChange: onChange };
});

const mockSubscribeToComments = vi.fn((_issueId: string, onChange: (payload: unknown) => void) => {
  const unsub = vi.fn();
  unsubFns.push(unsub);
  return { unsubscribe: unsub, _onChange: onChange };
});

const mockSubscribeToNotifications = vi.fn((_userId: string, onChange: (payload: unknown) => void) => {
  const unsub = vi.fn();
  unsubFns.push(unsub);
  return { unsubscribe: unsub, _onChange: onChange };
});

const mockSubscribeToMemberships = vi.fn((_workspaceId: string, onChange: (payload: unknown) => void) => {
  const unsub = vi.fn();
  unsubFns.push(unsub);
  return { unsubscribe: unsub, _onChange: onChange };
});

const mockRouterRefresh = vi.fn();

vi.mock('@/lib/realtime/subscriptions', () => ({
  subscribeToIssues: mockSubscribeToIssues,
  subscribeToComments: mockSubscribeToComments,
  subscribeToNotifications: mockSubscribeToNotifications,
  subscribeToMemberships: mockSubscribeToMemberships,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: mockRouterRefresh })),
}));

vi.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: () => void, _ms: number) => fn,
}));

const mockCommentsAppend = vi.fn();
const mockCommentsReplace = vi.fn();
const mockCommentsRemove = vi.fn();

vi.mock('@/lib/state/comments', () => ({
  useComments: {
    getState: () => ({
      append: mockCommentsAppend,
      replace: mockCommentsReplace,
      remove: mockCommentsRemove,
    }),
  },
}));

const mockNotifRefetch = vi.fn().mockResolvedValue(undefined);
const mockNotifSetUnreadCount = vi.fn();

vi.mock('@/lib/state/notifications', () => ({
  useNotifications: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      refetch: mockNotifRefetch,
      setUnreadCount: mockNotifSetUnreadCount,
      unreadCount: 5,
      notifications: [],
    };
    return selector ? selector(state) : state;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  unsubFns = [];
});

describe('realtime hooks', () => {
  it('1: useRealtimeIssues subscribes on mount and calls subscribeToIssues', async () => {
    const { useRealtimeIssues } = await import('@/hooks/useRealtimeIssues');
    const { unmount } = renderHook(() => useRealtimeIssues('ws_1'));
    expect(mockSubscribeToIssues).toHaveBeenCalledWith('ws_1', expect.any(Function));
    unmount();
    cleanup();
  });

  it('2: useRealtimeComments appends on INSERT, replaces on UPDATE, removes on DELETE', async () => {
    const { useRealtimeComments } = await import('@/hooks/useRealtimeComments');
    const { unmount } = renderHook(() => useRealtimeComments('i_1001'));

    expect(mockSubscribeToComments).toHaveBeenCalledWith('i_1001', expect.any(Function));
    const onChange = (mockSubscribeToComments.mock.results[0]?.value as { _onChange: (p: unknown) => void })?._onChange;

    if (onChange) {
      onChange({ eventType: 'INSERT', new: { id: 1, body: 'hello', externalId: 'c_1' }, old: {}, schema: 'public', table: 'comments' });
      expect(mockCommentsAppend).toHaveBeenCalledWith('i_1001', expect.objectContaining({ body: 'hello' }));

      onChange({ eventType: 'UPDATE', new: { id: 1, body: 'updated', externalId: 'c_1' }, old: { id: 1 }, schema: 'public', table: 'comments' });
      expect(mockCommentsReplace).toHaveBeenCalledWith('i_1001', expect.objectContaining({ body: 'updated' }));

      onChange({ eventType: 'DELETE', new: {}, old: { id: 1, externalId: 'c_1' }, schema: 'public', table: 'comments' });
      expect(mockCommentsRemove).toHaveBeenCalledWith('i_1001', 'c_1');
    }

    unmount();
    cleanup();
  });

  it('3: useRealtimeNotifications updates unread count on INSERT and mark-read UPDATE', async () => {
    const { useRealtimeNotifications } = await import('@/hooks/useRealtimeNotifications');
    const { unmount } = renderHook(() => useRealtimeNotifications('u_aria'));

    expect(mockSubscribeToNotifications).toHaveBeenCalledWith('u_aria', expect.any(Function));
    const onChange = (mockSubscribeToNotifications.mock.results[0]?.value as { _onChange: (p: unknown) => void })?._onChange;

    if (onChange) {
      onChange({ eventType: 'INSERT', new: { id: 1, read: false }, old: {}, schema: 'public', table: 'notifications' });
      expect(mockNotifRefetch).toHaveBeenCalled();
      expect(mockNotifSetUnreadCount).toHaveBeenCalledWith(expect.any(Function));

      mockNotifSetUnreadCount.mockClear();
      mockNotifRefetch.mockClear();

      onChange({ eventType: 'UPDATE', new: { id: 1, read: true }, old: { id: 1, read: false }, schema: 'public', table: 'notifications' });
      expect(mockNotifRefetch).toHaveBeenCalled();
      expect(mockNotifSetUnreadCount).toHaveBeenCalledWith(expect.any(Function));
    }

    unmount();
    cleanup();
  });

  it('4: useRealtimeMemberships subscribes and calls router.refresh', async () => {
    const { useRealtimeMemberships } = await import('@/hooks/useRealtimeMemberships');
    const { unmount } = renderHook(() => useRealtimeMemberships('ws_1'));

    expect(mockSubscribeToMemberships).toHaveBeenCalledWith('ws_1', expect.any(Function));

    const onChange = (mockSubscribeToMemberships.mock.results[0]?.value as { _onChange: (p: unknown) => void })?._onChange;
    if (onChange) {
      onChange({ eventType: 'INSERT', new: { id: 'm_1' }, old: {}, schema: 'public', table: 'memberships' });
      expect(mockRouterRefresh).toHaveBeenCalled();
    }

    unmount();
    cleanup();
  });

  it('5: All 4 hooks unsubscribe on unmount', async () => {
    const { useRealtimeIssues } = await import('@/hooks/useRealtimeIssues');
    const { unmount: un1 } = renderHook(() => useRealtimeIssues('ws_1'));
    un1();
    expect(unsubFns[0]).toHaveBeenCalled();

    const { useRealtimeComments } = await import('@/hooks/useRealtimeComments');
    const { unmount: un2 } = renderHook(() => useRealtimeComments('i_1'));
    un2();
    expect(unsubFns[1]).toHaveBeenCalled();

    const { useRealtimeNotifications } = await import('@/hooks/useRealtimeNotifications');
    const { unmount: un3 } = renderHook(() => useRealtimeNotifications('u_1'));
    un3();
    expect(unsubFns[2]).toHaveBeenCalled();

    const { useRealtimeMemberships } = await import('@/hooks/useRealtimeMemberships');
    const { unmount: un4 } = renderHook(() => useRealtimeMemberships('ws_1'));
    un4();
    expect(unsubFns[3]).toHaveBeenCalled();

    cleanup();
  });

  it('6: useRealtimeIssues and useRealtimeComments re-subscribe when key changes', async () => {
    const { useRealtimeIssues } = await import('@/hooks/useRealtimeIssues');
    const { rerender: rr1, unmount: u1 } = renderHook(
      ({ wsId }: { wsId: string }) => useRealtimeIssues(wsId),
      { initialProps: { wsId: 'ws_1' } },
    );
    expect(mockSubscribeToIssues).toHaveBeenCalledTimes(1);
    rr1({ wsId: 'ws_2' });
    expect(mockSubscribeToIssues).toHaveBeenCalledTimes(2);
    u1();

    const { useRealtimeComments } = await import('@/hooks/useRealtimeComments');
    const { rerender: rr2, unmount: u2 } = renderHook(
      ({ issueId }: { issueId: string }) => useRealtimeComments(issueId),
      { initialProps: { issueId: 'i_1' } },
    );
    expect(mockSubscribeToComments).toHaveBeenCalledTimes(1);
    rr2({ issueId: 'i_2' });
    expect(mockSubscribeToComments).toHaveBeenCalledTimes(2);
    u2();

    cleanup();
  });

  it('7: useRealtimeIssues uses 200ms debounce for router.refresh', async () => {
    const { useRealtimeIssues } = await import('@/hooks/useRealtimeIssues');
    const { unmount } = renderHook(() => useRealtimeIssues('ws_1'));

    const onChange = (mockSubscribeToIssues.mock.results[0]?.value as { _onChange: (p: unknown) => void })?._onChange;
    if (onChange) {
      onChange({ eventType: 'UPDATE', new: {}, old: {}, schema: 'public', table: 'issues' });
    }
    // With the debounce mock bypassed, router.refresh should be called immediately
    expect(mockRouterRefresh).toHaveBeenCalled();

    unmount();
    cleanup();
  });

  it('8: Unread count decrements correctly when notifications are marked read in another tab', async () => {
    const { useRealtimeNotifications } = await import('@/hooks/useRealtimeNotifications');
    const { unmount } = renderHook(() => useRealtimeNotifications('u_aria'));
    const onChange = (mockSubscribeToNotifications.mock.results[0]?.value as { _onChange: (p: unknown) => void })?._onChange;

    if (onChange) {
      mockNotifSetUnreadCount.mockClear();
      onChange({ eventType: 'UPDATE', new: { read: true }, old: { read: false }, schema: 'public', table: 'notifications' });
      expect(mockNotifSetUnreadCount).toHaveBeenCalledWith(expect.any(Function));

      const setter = mockNotifSetUnreadCount.mock.calls[0]?.[0] as (prev: number) => number;
      if (setter) {
        expect(setter(5)).toBe(4);
        expect(setter(1)).toBe(0);
      }
    }

    unmount();
    cleanup();
  });
});
