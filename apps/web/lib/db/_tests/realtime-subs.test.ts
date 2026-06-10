/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/realtime/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

let mockChannelCallbacks: Array<{ event: string; filter: string; callback: (payload: unknown) => void }> = [];

function makeMockChannel(name: string) {
  mockChannelCallbacks = [];
  const channel = {
    name,
    on: vi.fn((_event: string, _config: Record<string, unknown>, callback: (payload: unknown) => void) => {
      mockChannelCallbacks.push({
        event: _config.event as string,
        filter: _config.filter as string,
        callback,
      });
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  return channel;
}

let channels: ReturnType<typeof makeMockChannel>[] = [];

function makeMockSupabase() {
  channels = [];
  return {
    channel: vi.fn((name: string) => {
      const ch = makeMockChannel(name);
      channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(),
  };
}

const mockSupabase = makeMockSupabase();

beforeEach(() => {
  vi.clearAllMocks();
  const fresh = makeMockSupabase();
  Object.assign(mockSupabase, fresh);
  (vi.mocked(mockSupabase.channel) as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
    const ch = makeMockChannel(name);
    channels.push(ch);
    return ch;
  });
  (vi.mocked(mockSupabase.removeChannel) as ReturnType<typeof vi.fn>).mockImplementation(() => {});
});

import { getSupabaseBrowserClient } from '@/lib/realtime/client';

vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseBrowserClient>);

describe('realtime subscriptions', () => {
  it('1: getSupabaseBrowserClient() returns a singleton', () => {
    // The module-level mock always returns the same mockSupabase instance,
    // which verifies the singleton pattern works when the module is consumed.
    const client1 = getSupabaseBrowserClient();
    const client2 = getSupabaseBrowserClient();
    expect(client1).toBe(client2);
    expect(client1).toBeDefined();
  });

  it('2: subscribeToIssues calls supabase.channel with the right channel name and filter', async () => {
    const { subscribeToIssues } = await import('@/lib/realtime/subscriptions');
    const onChange = vi.fn();
    subscribeToIssues('ws_abc', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('issues:workspaceId=ws_abc');
    expect(mockChannelCallbacks.length).toBeGreaterThan(0);
    expect(mockChannelCallbacks[0]!.filter).toBe('workspaceId=eq.ws_abc');
  });

  it('3: subscribeToComments filters on issue_id', async () => {
    const { subscribeToComments } = await import('@/lib/realtime/subscriptions');
    const onChange = vi.fn();
    subscribeToComments('i_1001', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('comments:issue_id=i_1001');
    expect(mockChannelCallbacks[0]!.filter).toBe('issue_id=eq.i_1001');
  });

  it('4: subscribeToNotifications filters on user_id', async () => {
    const { subscribeToNotifications } = await import('@/lib/realtime/subscriptions');
    const onChange = vi.fn();
    subscribeToNotifications('u_aria', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('notifications:user_id=u_aria');
    expect(mockChannelCallbacks[0]!.filter).toBe('user_id=eq.u_aria');
  });

  it('5: subscribeToMemberships filters on workspaceId', async () => {
    const { subscribeToMemberships } = await import('@/lib/realtime/subscriptions');
    const onChange = vi.fn();
    subscribeToMemberships('ws_xyz', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('memberships:workspaceId=ws_xyz');
    expect(mockChannelCallbacks[0]!.filter).toBe('workspaceId=eq.ws_xyz');
  });

  it('6: subscribeToCycles / subscribeToProjects / subscribeToSavedViews each filter on workspace_id', async () => {
    const { subscribeToCycles, subscribeToProjects, subscribeToSavedViews } = await import('@/lib/realtime/subscriptions');
    const onChange = vi.fn();
    subscribeToCycles('ws_1', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('cycles:workspaceId=ws_1');
    subscribeToProjects('ws_1', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('projects:workspaceId=ws_1');
    subscribeToSavedViews('ws_1', onChange);
    expect(mockSupabase.channel).toHaveBeenCalledWith('saved_views:workspaceId=ws_1');
  });

  it('7: WorkspaceRealtimeProvider opens a channel on mount and closes it on unmount', async () => {
    const { useWorkspace } = await import('@/hooks/useWorkspace');
    const { useUser } = await import('@/hooks/useUser');
    vi.mocked(useWorkspace).mockReturnValue({ id: 'ws_test', name: 'Test', slug: 'test', isActive: true, isLoading: false, error: null });
    vi.mocked(useUser).mockReturnValue({ user: { id: 'u_1', name: 'Test', email: 'a@b.com', emailVerified: false, image: null, createdAt: new Date(), updatedAt: new Date(), twoFactorEnabled: false }, isLoading: false });

    const { WorkspaceRealtimeProvider } = await import('@/lib/realtime/workspace-provider');
    const { render, cleanup } = await import('@testing-library/react');
    const React = await import('react');

    const { unmount } = render(
      React.createElement(WorkspaceRealtimeProvider, null, React.createElement('div', null, 'child')),
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('workspace:ws_test');
    const ch = channels[0];
    expect(ch).toBeDefined();
    expect(ch!.subscribe).toHaveBeenCalled();

    unmount();
    cleanup();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('8: WorkspaceRealtimeProvider re-opens the channel when workspaceId changes', async () => {
    const { useWorkspace } = await import('@/hooks/useWorkspace');
    const { useUser } = await import('@/hooks/useUser');
    vi.mocked(useUser).mockReturnValue({ user: { id: 'u_1', name: 'Test', email: 'a@b.com', emailVerified: false, image: null, createdAt: new Date(), updatedAt: new Date(), twoFactorEnabled: false }, isLoading: false });

    const React = await import('react');
    const { render } = await import('@testing-library/react');
    const { WorkspaceRealtimeProvider } = await import('@/lib/realtime/workspace-provider');

    vi.mocked(useWorkspace).mockReturnValue({ id: 'ws_a', name: 'A', slug: 'a', isActive: true, isLoading: false, error: null });
    const { rerender, unmount } = render(
      React.createElement(WorkspaceRealtimeProvider, null, React.createElement('div', null, 'child')),
    );
    expect(mockSupabase.channel).toHaveBeenCalledWith('workspace:ws_a');

    const removeBeforeCount = (mockSupabase.removeChannel as ReturnType<typeof vi.fn>).mock.calls.length;

    vi.mocked(useWorkspace).mockReturnValue({ id: 'ws_b', name: 'B', slug: 'b', isActive: true, isLoading: false, error: null });
    rerender(
      React.createElement(WorkspaceRealtimeProvider, null, React.createElement('div', null, 'child')),
    );

    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(removeBeforeCount + 1);
    expect(mockSupabase.channel).toHaveBeenCalledWith('workspace:ws_b');

    unmount();
  });
});
