import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';

const mockOrgApi = {
  createOrganization: vi.fn(),
  createInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  setActiveOrganization: vi.fn(),
};

vi.mock('pg', () => ({
  Pool: vi.fn(function () {
    return { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn() };
  }),
}));

vi.mock('better-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth')>();
  return {
    ...actual,
    betterAuth: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
      options: config,
      api: {
        getSession: vi.fn().mockResolvedValue(null),
        ...mockOrgApi,
      },
      $Infer: {
        Session: { user: {} as unknown, session: {} as unknown },
      },
      handler: vi.fn(),
    })),
  };
});

vi.mock('better-auth/plugins', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth/plugins')>();
  return {
    ...actual,
    organization: vi.fn().mockReturnValue({ id: 'organization' }),
    admin: vi.fn().mockReturnValue({ id: 'admin' }),
    jwt: vi.fn().mockReturnValue({ id: 'jwt' }),
    passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
  };
});

vi.mock('better-auth/social-providers', () => ({
  google: vi.fn().mockReturnValue({ id: 'google' }),
  github: vi.fn().mockReturnValue({ id: 'github' }),
}));

vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn().mockReturnValue({ id: 'nextCookies' }),
  toNextJsHandler: vi.fn().mockReturnValue({ GET: vi.fn(), POST: vi.fn() }),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((_url: string) => {
    const error = new Error('NEXT_REDIRECT');
    (error as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    throw error;
  }),
}));

vi.mock('@/lib/auth/account-linking', () => ({
  accountLinkingConfig: { enabled: true, trustedProviders: ['google', 'github'], allowUnlinking: true },
}));

vi.mock('@/lib/auth/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('@/lib/email/transport', () => ({ transport: { send: vi.fn().mockResolvedValue({ ok: true }) } }));

function drizzleThenableArray(result: unknown[] = []) {
  return Object.assign(
    {
      then(resolve: (v: unknown) => unknown) { return Promise.resolve(resolve(result)); },
    },
    {
      from: () => drizzleThenableArray(result),
      where: () => drizzleThenableArray(result),
      leftJoin: () => drizzleThenableArray(result),
      orderBy: () => drizzleThenableArray(result),
      limit: () => drizzleThenableArray(result),
    },
  );
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => drizzleThenableArray([]),
    insert: () => ({ values: () => Promise.resolve([{ id: '1' }]) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
    delete: () => ({ where: () => Promise.resolve(undefined) }),
    query: {
      memberships: { findMany: vi.fn().mockResolvedValue([]) },
      invitations: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
  process.env.GOOGLE_CLIENT_ID = 'test';
  process.env.GOOGLE_CLIENT_SECRET = 'test';
  process.env.GITHUB_CLIENT_ID = 'test';
  process.env.GITHUB_CLIENT_SECRET = 'test';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('invite helpers', () => {
  it('inviteMember calls auth.api.createInvitation', async () => {
    mockOrgApi.createInvitation.mockResolvedValue({
      id: 'inv-1',
      email: 'colleague@test.com',
      role: 'member',
      status: 'pending',
    });

    const { inviteMember } = await import('@/lib/auth/invites');
    const result = await inviteMember('ws-1', 'user-owner', { email: 'colleague@test.com', role: 'member' });

    expect(mockOrgApi.createInvitation).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('revokeInvite calls auth.api.cancelInvitation', async () => {
    mockOrgApi.cancelInvitation.mockResolvedValue({ success: true });

    const { revokeInvite } = await import('@/lib/auth/invites');
    await revokeInvite('inv-1');

    expect(mockOrgApi.cancelInvitation).toHaveBeenCalled();
  });

  it('acceptInvite calls auth.api.acceptInvitation', async () => {
    mockOrgApi.acceptInvitation.mockResolvedValue({
      status: 'accepted',
      organizationId: 'ws-1',
      role: 'member',
    });

    const { acceptInvite } = await import('@/lib/auth/invites');
    const result = await acceptInvite('valid-token-123');

    expect(mockOrgApi.acceptInvitation).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('acceptInvite rejects expired tokens', async () => {
    mockOrgApi.acceptInvitation.mockRejectedValue(new Error('Invitation expired'));

    const { acceptInvite } = await import('@/lib/auth/invites');
    await expect(acceptInvite('expired-token')).rejects.toThrow();
  });

  it('changeMemberRole calls auth.api.updateMemberRole', async () => {
    mockOrgApi.updateMemberRole.mockResolvedValue({ success: true });

    const { changeMemberRole } = await import('@/lib/auth/invites');
    await changeMemberRole('membership-1', 'admin', 'owner-user');

    expect(mockOrgApi.updateMemberRole).toHaveBeenCalled();
  });

  it('removeMember calls auth.api.removeMember', async () => {
    mockOrgApi.removeMember.mockResolvedValue({ success: true });

    const { removeMember } = await import('@/lib/auth/invites');
    await removeMember('membership-1', 'owner-user');

    expect(mockOrgApi.removeMember).toHaveBeenCalled();
  });

  it('getMembers returns array of memberships with users', async () => {
    const { getMembers } = await import('@/lib/auth/invites');
    const result = await getMembers('ws-1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('getPendingInvites returns array of pending invitations', async () => {
    const { getPendingInvites } = await import('@/lib/auth/invites');
    const result = await getPendingInvites('ws-1');
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('invite email templates', () => {
  it('workspace-invite template contains workspace name', async () => {
    await import('@/lib/auth/server');
    const { workspaceInviteTemplate } = await import('@/lib/email/templates/index');
    const result = workspaceInviteTemplate({
      email: 'test@test.com',
      workspaceName: 'Acme Corp',
      inviteUrl: 'https://rejira.app/invite/token123',
      role: 'member',
    });
    expect(result.html).toContain('Acme Corp');
    expect(result.html).toContain('member');
    expect(result.text).toContain('Acme Corp');
  });

  it('role-changed template contains new role', async () => {
    const { roleChangedTemplate } = await import('@/lib/email/templates/index');
    const result = roleChangedTemplate({
      name: 'Alice',
      workspaceName: 'Acme Corp',
      newRole: 'admin',
      changedBy: 'Bob',
    });
    expect(result.html).toContain('admin');
    expect(result.html).toContain('Bob');
  });
});

describe('role management constraints', () => {
  it('owner cannot demote themselves', async () => {
    mockOrgApi.updateMemberRole.mockRejectedValue(new Error('Cannot demote the last owner'));

    const { changeMemberRole } = await import('@/lib/auth/invites');
    await expect(changeMemberRole('membership-owner', 'member', 'same-owner')).rejects.toThrow();
  });

  it('owner cannot remove themselves', async () => {
    mockOrgApi.removeMember.mockRejectedValue(new Error('Cannot remove the last owner'));

    const { removeMember } = await import('@/lib/auth/invites');
    await expect(removeMember('membership-owner', 'same-owner')).rejects.toThrow();
  });
});
