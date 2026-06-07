import { describe, it, expect, vi, beforeAll } from 'vitest';

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

let instanceConfig: Record<string, unknown> = {};

vi.mock('better-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth')>();
  return {
    ...actual,
    betterAuth: vi.fn().mockImplementation((config: Record<string, unknown>) => {
      instanceConfig = config;
      return {
        options: config,
        api: { getSession: vi.fn().mockResolvedValue(null) },
        $Infer: { Session: { user: {} as unknown, session: {} as unknown } },
        handler: vi.fn(),
      };
    }),
  };
});

vi.mock('better-auth/plugins', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth/plugins')>();
  return {
    ...actual,
    magicLink: vi.fn().mockReturnValue({ id: 'magic-link' }),
    twoFactor: vi.fn().mockReturnValue({ id: 'two-factor' }),
    genericOAuth: vi.fn().mockReturnValue({ id: 'generic-oauth' }),
    organization: vi.fn().mockReturnValue({ id: 'organization' }),
    admin: vi.fn().mockReturnValue({ id: 'admin' }),
    jwt: vi.fn().mockReturnValue({ id: 'jwt' }),
  };
});

vi.mock('better-auth/social-providers', () => ({
  google: vi.fn((opts: Record<string, unknown>) => ({ id: 'google', ...opts })),
  github: vi.fn((opts: Record<string, unknown>) => ({ id: 'github', ...opts })),
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
}));

vi.mock('@/lib/email/transport', () => ({
  transport: { send: vi.fn().mockResolvedValue({ ok: true }) },
}));

vi.mock('@/lib/email/render', () => ({
  render: vi.fn((template: string, props: Record<string, string>) => ({
    to: props.to,
    subject: props.subject,
    html: '<p>test</p>',
    text: 'test',
  })),
}));

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long--!!';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
  process.env.GOOGLE_CLIENT_ID = 'test-google-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
  process.env.GITHUB_CLIENT_ID = 'test-github-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
});

describe('session-binding', () => {
  it('hashIP returns a SHA-256 hash string', async () => {
    const { hashIP } = await import('@/lib/auth/session-binding');
    const result = hashIP('192.168.1.1');
    expect(typeof result).toBe('string');
    expect(result.length).toBe(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashIP is deterministic for the same input', async () => {
    const { hashIP } = await import('@/lib/auth/session-binding');
    const a = hashIP('192.168.1.1');
    const b = hashIP('192.168.1.1');
    expect(a).toBe(b);
  });

  it('hashIP produces different hashes for different IPs', async () => {
    const { hashIP } = await import('@/lib/auth/session-binding');
    const a = hashIP('192.168.1.1');
    const b = hashIP('10.0.0.1');
    expect(a).not.toBe(b);
  });

  it('hashUA returns a SHA-256 hash string', async () => {
    const { hashUA } = await import('@/lib/auth/session-binding');
    const result = hashUA('Mozilla/5.0 Chrome/120');
    expect(typeof result).toBe('string');
    expect(result.length).toBe(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashUA is deterministic for the same input', async () => {
    const { hashUA } = await import('@/lib/auth/session-binding');
    const ua = 'Mozilla/5.0 Chrome/120';
    expect(hashUA(ua)).toBe(hashUA(ua));
  });
});

describe('session-list', () => {
  it('exports listSessions as a function', async () => {
    const { listSessions } = await import('@/lib/auth/session-list');
    expect(typeof listSessions).toBe('function');
  });

  it('exports revokeSession as a function', async () => {
    const { revokeSession } = await import('@/lib/auth/session-list');
    expect(typeof revokeSession).toBe('function');
  });

  it('exports revokeAllSessions as a function', async () => {
    const { revokeAllSessions } = await import('@/lib/auth/session-list');
    expect(typeof revokeAllSessions).toBe('function');
  });
});

describe('session config in server', () => {
  it('configures session with expiresIn, updateAge, cookieCache', async () => {
    const { auth } = await import('@/lib/auth/server');
    const config = auth.options;
    expect(config.session).toBeDefined();
    const session = config.session as Record<string, unknown>;
    expect(session.expiresIn).toBe(604800);
    expect(session.updateAge).toBe(86400);
    expect(session.cookieCache).toBeDefined();
  });

  it('configures cookieCache with enabled:true and maxAge:300', async () => {
    const { auth } = await import('@/lib/auth/server');
    const config = auth.options;
    const session = config.session as Record<string, unknown>;
    const cc = session.cookieCache as Record<string, unknown>;
    expect(cc.enabled).toBe(true);
    expect(cc.maxAge).toBe(300);
  });
});
