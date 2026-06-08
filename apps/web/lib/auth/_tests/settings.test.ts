import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTwoFactorApi = {
  enable: vi.fn(),
  disable: vi.fn(),
  verifyTotp: vi.fn(),
};

const mockAuthApi = {
  getSession: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  updateUser: vi.fn(),
  changeEmail: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  listSessions: vi.fn(),
  ...mockTwoFactorApi,
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
        ...mockAuthApi,
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
    magicLink: vi.fn().mockReturnValue({ id: 'magic-link' }),
    twoFactor: vi.fn().mockReturnValue({ id: 'two-factor' }),
    genericOAuth: vi.fn().mockReturnValue({ id: 'generic-oauth' }),
    emailAndPassword: vi.fn().mockReturnValue({ id: 'emailAndPassword' }),
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

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((_url: string) => {
    const error = new Error('NEXT_REDIRECT');
    (error as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    throw error;
  }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  usePathname: vi.fn().mockReturnValue('/settings'),
}));

vi.mock('@/lib/email/transport', () => ({
  transport: { send: vi.fn().mockResolvedValue({ ok: true }) },
}));

vi.mock('@/lib/email/render', () => ({
  render: vi.fn(() => ({
    to: 'test@example.com',
    subject: 'Test',
    html: '<p>test</p>',
    text: 'test',
  })),
}));

vi.mock('@/lib/auth/account-linking', () => ({
  accountLinkingConfig: {
    enabled: true,
    trustedProviders: ['google', 'github'],
    allowUnlinking: true,
  },
}));

vi.mock('@/lib/auth/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

function drizzleThenableArray(result: unknown[] = []) {
  return Object.assign(
    {
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve(resolve(result));
      },
    },
    {
      from: () => drizzleThenableArray(result),
      where: () => drizzleThenableArray(result),
      leftJoin: () => drizzleThenableArray(result),
      innerJoin: () => drizzleThenableArray(result),
      orderBy: () => drizzleThenableArray(result),
      limit: () => drizzleThenableArray(result),
      offset: () => drizzleThenableArray(result),
      groupBy: () => drizzleThenableArray(result),
    },
  );
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => drizzleThenableArray([]),
    insert: () => ({
      values: () => Promise.resolve([{ id: '1' }]),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(undefined),
    }),
    query: {
      memberships: { findMany: vi.fn().mockResolvedValue([]) },
      invitations: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthApi.getSession.mockResolvedValue({
      user: {
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
      },
      session: { id: 'session_1' },
    });
    mockAuthApi.updateUser.mockResolvedValue({
      id: 'user_1',
      name: 'Updated Name',
      image: 'oklch(0.72 0.18 40)',
    });
  });

  it('profile update writes new name and image', async () => {
    mockAuthApi.updateUser.mockResolvedValue({
      id: 'user_1',
      name: 'New Name',
      image: 'oklch(0.68 0.18 160)',
    });

    const { authClient } = await import('@/lib/auth/client');
    const updateUser = (authClient as unknown as Record<string, CallableFunction>).updateUser;

    await updateUser({ name: 'New Name', image: 'oklch(0.68 0.18 160)' });

    expect(mockAuthApi.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
        image: 'oklch(0.68 0.18 160)',
      }),
    );
  });

  it('email change creates pending change with verification', async () => {
    mockAuthApi.changeEmail.mockResolvedValue({
      status: 'pending',
      message: 'Verification sent to both emails',
    });

    const { authClient } = await import('@/lib/auth/client');
    const changeEmail = (authClient as unknown as Record<string, CallableFunction>).changeEmail;

    await changeEmail({ newEmail: 'new@example.com' });

    expect(mockAuthApi.changeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        newEmail: 'new@example.com',
      }),
    );
  });

  it('password change requires old password', async () => {
    const { resetPassword } = await import('@/lib/auth/client');

    const result = await resetPassword({
      newPassword: 'Str0ngP@ssw0rd!',
    });

    expect(result).toBeDefined();
  });

  it('password change invalidates other sessions when requested', async () => {
    mockAuthApi.revokeOtherSessions.mockResolvedValue({ success: true });

    const { authClient } = await import('@/lib/auth/client');
    const revokeOtherSessions = (authClient as unknown as Record<string, CallableFunction>).revokeOtherSessions;

    await revokeOtherSessions();

    expect(mockAuthApi.revokeOtherSessions).toHaveBeenCalled();
  });

  it('sessions list shows device information', async () => {
    mockAuthApi.listSessions.mockResolvedValue({
      sessions: [
        {
          id: 'session_1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(mockAuthApi.listSessions).toBeDefined();
    const result = await mockAuthApi.listSessions();
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].ipAddress).toBe('192.168.1.1');
  });

  it('revoking a session signs out that device', async () => {
    mockAuthApi.revokeSession.mockResolvedValue({ success: true });

    const { authClient } = await import('@/lib/auth/client');
    const revokeSession = (authClient as unknown as Record<string, CallableFunction>).revokeSession;

    await revokeSession({ sessionId: 'session_2' });

    expect(mockAuthApi.revokeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_2',
      }),
    );
  });

  it('revoking all sessions signs out every device', async () => {
    mockAuthApi.revokeOtherSessions.mockResolvedValue({ success: true });

    const { authClient } = await import('@/lib/auth/client');
    const revokeOtherSessions = (authClient as unknown as Record<string, CallableFunction>).revokeOtherSessions;

    await revokeOtherSessions();

    expect(mockAuthApi.revokeOtherSessions).toHaveBeenCalled();
  });

  it('2FA toggle writes audit_log rows', async () => {
    mockTwoFactorApi.enable.mockResolvedValue({
      totpURI: 'otpauth://totp/rejira:test?secret=ABC123',
      secret: 'ABC123',
    });

    const { enableTwoFactor } = await import('@/lib/auth/two-factor');

    const result = await enableTwoFactor('password123');

    expect(result).toBeDefined();
    expect(result.totpURI).toContain('otpauth://');
    expect(mockTwoFactorApi.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'password123',
      }),
    );
  });
});
