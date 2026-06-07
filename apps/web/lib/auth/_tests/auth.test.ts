import { describe, it, expect, beforeAll, vi } from 'vitest';

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: vi.fn(),
});

const MockPool = vi.fn().mockImplementation(() => ({
  query: mockQuery,
  connect: mockConnect,
}));

vi.mock('pg', () => ({
  Pool: vi.fn(function() {
    return { query: mockQuery, connect: mockConnect };
  }),
}));

vi.mock('better-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth')>();
  return {
    ...actual,
    betterAuth: vi.fn().mockImplementation((config: Record<string, unknown>) => {
      const authInstance = {
        options: config,
        api: {
          getSession: vi.fn(),
          signInEmail: vi.fn(),
          signUpEmail: vi.fn(),
        },
        $Infer: {
          Session: {
            user: {} as unknown,
            session: {} as unknown,
          },
        },
        handler: vi.fn(),
      };
      return authInstance;
    }),
  };
});

vi.mock('better-auth/plugins', () => ({
  emailAndPassword: vi.fn().mockReturnValue({ id: 'emailAndPassword' }),
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
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((_url: string) => {
    const error = new Error('NEXT_REDIRECT');
    (error as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    throw error;
  }),
}));

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
});

describe('auth server', () => {
  it('exports auth as a configured Better Auth instance', async () => {
    const mod = await import('@/lib/auth/server');
    expect(mod.auth).toBeDefined();
    const { betterAuth } = await import('better-auth');
    expect(betterAuth).toHaveBeenCalled();
  });

  it('configures emailAndPassword plugin with minPasswordLength:12 and requireEmailVerification:true', async () => {
    const { betterAuth } = await import('better-auth');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(config.emailAndPassword).toBeDefined();
    expect(config.emailAndPassword.enabled).toBe(true);
    expect(config.emailAndPassword.minPasswordLength).toBe(12);
    expect(config.emailAndPassword.requireEmailVerification).toBe(true);
    expect(config.emailAndPassword.autoSignIn).toBe(false);
  });

  it('configures session with 7-day expiry', async () => {
    const { betterAuth } = await import('better-auth');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(config.session).toBeDefined();
    expect(config.session.expiresIn).toBe(604800);
    expect(config.session.updateAge).toBe(86400);
    expect(config.session.freshAge).toBe(3600);
  });

  it('configures emailVerification with sendOnSignUp and 24h expiry', async () => {
    const { betterAuth } = await import('better-auth');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(config.emailVerification).toBeDefined();
    expect(config.emailVerification.sendOnSignUp).toBe(true);
    expect(config.emailVerification.autoSignInAfterVerification).toBe(true);
    expect(config.emailVerification.expiresIn).toBe(86400);
  });

  it('configures rate limiting with database storage', async () => {
    const { betterAuth } = await import('better-auth');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.rateLimit.storage).toBe('database');
    expect(config.rateLimit.window).toBe(60);
    expect(config.rateLimit.max).toBe(30);
  });
});

describe('getSession', () => {
  it('returns session data when a valid session token is present', async () => {
    const { auth } = await import('@/lib/auth/server');
    const mockUser = { id: 'user-1', email: 'test@test.com', emailVerified: true };
    const mockSession = { id: 'session-1', userId: 'user-1', expiresAt: Date.now() + 86400000 };

    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    const { getSession } = await import('@/lib/auth/get-session');
    const result = await getSession();

    expect(result).not.toBeNull();
    expect(result?.user).toBeDefined();
    expect(result?.session).toBeDefined();
  });

  it('returns null when no session token is present', async () => {
    const { auth } = await import('@/lib/auth/server');
    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { getSession } = await import('@/lib/auth/get-session');
    const result = await getSession();

    expect(result).toBeNull();
  });
});

describe('requireAuth', () => {
  it('returns user for verified sessions', async () => {
    const { auth } = await import('@/lib/auth/server');
    const mockUser = { id: 'user-1', email: 'test@test.com', emailVerified: true };

    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
      session: { id: 's1', userId: 'user-1', expiresAt: 0 },
    });

    const { requireAuth } = await import('@/lib/auth/require-auth');
    const user = await requireAuth();

    expect(user).toBeDefined();
    expect(user.email).toBe('test@test.com');
  });

  it('redirects to /sign-in for unauthenticated calls', async () => {
    const { auth } = await import('@/lib/auth/server');
    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(async () => {
      const { requireAuth } = await import('@/lib/auth/require-auth');
      await requireAuth();
    }).rejects.toThrow();
  });

  it('redirects to /verify-email for unverified users', async () => {
    const { auth } = await import('@/lib/auth/server');
    const mockUser = { id: 'user-1', email: 'test@test.com', emailVerified: false };

    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
      session: { id: 's1', userId: 'user-1', expiresAt: 0 },
    });

    await expect(async () => {
      const { requireAuth } = await import('@/lib/auth/require-auth');
      await requireAuth();
    }).rejects.toThrow();
  });
});
