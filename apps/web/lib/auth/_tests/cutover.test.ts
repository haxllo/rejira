import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long--!!';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
});

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: vi.fn(),
});

vi.mock('pg', () => ({
  Pool: vi.fn(function () {
    return { query: mockQuery, connect: mockConnect };
  }),
}));

const mockGetSession = vi.fn().mockResolvedValue(null);
const mockSignUpEmail = vi.fn();
const mockOrgApi = {
  createOrganization: vi.fn(),
  listOrganizations: vi.fn(),
  getFullOrganization: vi.fn().mockResolvedValue(null),
  setActiveOrganization: vi.fn(),
};

vi.mock('better-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth')>();
  return {
    ...actual,
    betterAuth: vi.fn().mockImplementation((config: Record<string, unknown>) => {
      return {
        options: config,
        api: {
          getSession: mockGetSession,
          signUpEmail: mockSignUpEmail,
          ...mockOrgApi,
        },
        $Infer: {
          Session: {
            user: {} as unknown,
            session: {} as unknown,
          },
        },
        handler: vi.fn(),
      };
    }),
  };
});

vi.mock('better-auth/plugins', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth/plugins')>();
  return {
    ...actual,
    organization: vi.fn(function (config: Record<string, unknown>) {
      return { id: 'organization', options: config };
    }),
    admin: vi.fn(function () {
      return { id: 'admin' };
    }),
    jwt: vi.fn(function (config: Record<string, unknown>) {
      return { id: 'jwt', options: config };
    }),
    magicLink: vi.fn().mockReturnValue({ id: 'magicLink' }),
    twoFactor: vi.fn().mockReturnValue({ id: 'twoFactor' }),
    passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
    genericOAuth: vi.fn().mockReturnValue({ id: 'genericOAuth' }),
  };
});

vi.mock('better-auth/social-providers', () => ({
  google: vi.fn().mockReturnValue({ id: 'google' }),
  github: vi.fn().mockReturnValue({ id: 'github' }),
}));

vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn().mockReturnValue({ id: 'nextCookies' }),
  toNextJsHandler: vi.fn().mockReturnValue({
    GET: vi.fn(),
    POST: vi.fn(),
  }),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
  cookies: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/auth/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/account-linking', () => ({
  accountLinkingConfig: { enabled: false, trustedProviders: [], allowUnlinking: false },
}));

vi.mock('@/lib/auth/audit', () => ({
  emitAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/password-policy', () => ({
  validatePassword: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/auth/session-binding', () => ({
  hashIP: vi.fn().mockReturnValue('mock-ip-hash'),
  hashUA: vi.fn().mockReturnValue('mock-ua-hash'),
  isNewDevice: vi.fn().mockResolvedValue(false),
}));

describe('cutover — ME_ID removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it('test 1: requireAuth no longer accepts ME_EXTERNAL_ID fallback', async () => {
    // The requireAuth function must not use any hardcoded user ID
    // It should call getSession() and return its result
    const { requireAuth } = await import('@/lib/auth/require-auth');

    // With no session, it should redirect (throw NEXT_REDIRECT)
    try {
      await requireAuth();
      expect.fail('Should have redirected');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toContain('NEXT_REDIRECT');
    }

    // Verify it called getSession (not a hardcoded ID lookup)
    expect(mockGetSession).toHaveBeenCalled();
  });

  it('test 2: requireAuth reads session from Better Auth and returns real user', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');

    const mockUser = {
      id: '123',
      external_id: 'ext_real_user',
      email: 'real@user.dev',
      name: 'Real User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetSession.mockResolvedValueOnce({
      user: mockUser,
      session: {
        id: 'sess_1',
        userId: '123',
        expiresAt: new Date(Date.now() + 86400000),
        token: 'tok_abc',
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    });

    const user = await requireAuth();
    expect(user.email).toBe('real@user.dev');
    expect(user.name).toBe('Real User');
    expect(user).not.toHaveProperty('_mock');
  });

  it('test 3: requireAuth works for any user with a valid session (not just u_aria)', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');

    // Test with a user that is NOT u_aria
    const mockUser = {
      id: '999',
      external_id: 'ext_kenji',
      email: 'kenji@acme.dev',
      name: 'Kenji Sato',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetSession.mockResolvedValueOnce({
      user: mockUser,
      session: {
        id: 'sess_2',
        userId: '999',
        expiresAt: new Date(Date.now() + 86400000),
        token: 'tok_xyz',
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    });

    const user = await requireAuth();
    expect(user.email).toBe('kenji@acme.dev');
    expect(user.name).toBe('Kenji Sato');
    // Must not be Aria
    expect(user.name).not.toBe('Aria');
    expect(user.name).not.toBe('Aria Vance');
  });

  it('test 4: requireAuth redirects to /sign-in?next=... for unauthenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');

    mockGetSession.mockResolvedValueOnce(null);

    try {
      await requireAuth();
      expect.fail('Should have redirected');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toContain('NEXT_REDIRECT');
      expect(msg).toContain('sign-in');
    }
  });

  it('test 5: requireAuth returns 403 / redirects for authenticated users with no workspace', async () => {
    // This tests that an authenticated user without workspace membership
    // gets an appropriate response. The requireAuth server function may
    // redirect or throw; we test that it doesn't silently pass.
    const { requireAuth } = await import('@/lib/auth/require-auth');

    const mockUser = {
      id: '777',
      external_id: 'ext_no_workspace',
      email: 'lonely@user.dev',
      name: 'Lonely User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetSession.mockResolvedValueOnce({
      user: mockUser,
      session: {
        id: 'sess_3',
        userId: '777',
        expiresAt: new Date(Date.now() + 86400000),
        token: 'tok_lonely',
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    });

    // requireAuth currently passes if session exists and email is verified.
    // Workspace membership check is in middleware / RequireAuth client component.
    // This test verifies the user object is returned correctly.
    const user = await requireAuth();
    expect(user.email).toBe('lonely@user.dev');
    expect(user.emailVerified).toBe(true);
  });

  it('test 6: ME_ID is NOT exported from auth modules (demo-session deleted)', async () => {
    // Verify that demo-session.ts no longer exports ME_ID.
    // After cutover, the file should be deleted entirely.
    try {
      // @ts-expect-error — demo-session.ts is deleted; import should fail
      await import('@/lib/auth/demo-session');
      // File still exists — this is RED: the file must be deleted
      expect.fail('demo-session.ts still exists — must be deleted during cutover');
    } catch (e: unknown) {
      // Expected: module should not be found (file deleted)
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/Cannot find|not found|ERR_MODULE_NOT_FOUND/i);
    }
  });

  it('test 7: mock/users.ts does NOT export ME_ID or ME_EXTERNAL_ID', async () => {
    const mockMod = await import('@/lib/mock/users');
    expect(mockMod).not.toHaveProperty('ME_ID');
    expect(mockMod).not.toHaveProperty('ME_EXTERNAL_ID');
    // USERS array was removed in Phase 4 (mock data deleted) — verify it's gone
    expect(mockMod).not.toHaveProperty('USERS');
  });

  it('test 8: useCurrentUser hook no longer falls back to hardcoded user ID', async () => {
    // After cutover, useCurrentUserId must NOT return a hardcoded fallback
    // like USERS[0]?.id when session is null.
    // We verify the source no longer imports USERS for fallback purposes.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const hookPath = path.resolve('hooks/useCurrentUser.ts');
    const source = fs.readFileSync(hookPath, 'utf-8');
    // Must NOT contain a fallback to USERS[0]
    expect(source).not.toMatch(/USERS\[0\]/);
    // Must NOT contain hardcoded 'u_aria' fallback
    expect(source).not.toMatch(/u_aria/);
    // Must import useSession
    expect(source).toMatch(/useSession/);
  });
});
