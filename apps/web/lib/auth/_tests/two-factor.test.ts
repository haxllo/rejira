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

describe('twoFactor plugin in server', () => {
  it('registers the twoFactor plugin in the plugins array', async () => {
    const { auth } = await import('@/lib/auth/server');
    const config = auth.options;
    const plugins = config.plugins as Array<{ id: string }>;
    const tfPlugin = plugins.find((p) => p.id === 'two-factor');
    expect(tfPlugin).toBeDefined();
  });

  it('configures twoFactor plugin with issuer: rejira', async () => {
    const { twoFactor } = await import('better-auth/plugins');
    const calls = (twoFactor as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const tfOptions = calls[calls.length - 1][0];
    expect(tfOptions).toBeDefined();
    expect(tfOptions.issuer).toBe('rejira');
  });

  it('configures twoFactor otpOptions with digits:6 and period:30', async () => {
    const { twoFactor } = await import('better-auth/plugins');
    const calls = (twoFactor as ReturnType<typeof vi.fn>).mock.calls;
    const tfOptions = calls[calls.length - 1][0];
    expect(tfOptions.otpOptions).toBeDefined();
    expect(tfOptions.otpOptions.digits).toBe(6);
    expect(tfOptions.otpOptions.period).toBe(30);
  });
});

describe('two-factor helpers', () => {
  it('exports enableTwoFactor as a function', () => {
    const { enableTwoFactor } = require('@/lib/auth/two-factor');
    expect(typeof enableTwoFactor).toBe('function');
  });

  it('exports disableTwoFactor as a function', () => {
    const { disableTwoFactor } = require('@/lib/auth/two-factor');
    expect(typeof disableTwoFactor).toBe('function');
  });

  it('exports verifyTwoFactor as a function', () => {
    const { verifyTwoFactor } = require('@/lib/auth/two-factor');
    expect(typeof verifyTwoFactor).toBe('function');
  });
});

describe('backup codes helpers', () => {
  it('exports generateBackupCodes as a function', () => {
    const { generateBackupCodes } = require('@/lib/auth/backup-codes');
    expect(typeof generateBackupCodes).toBe('function');
  });

  it('exports verifyBackupCode as a function', () => {
    const { verifyBackupCode } = require('@/lib/auth/backup-codes');
    expect(typeof verifyBackupCode).toBe('function');
  });
});

describe('backup codes display component', () => {
  it('can be imported as a React component', async () => {
    const { BackupCodesDisplay } = await import('@/components/auth/backup-codes-display');
    expect(BackupCodesDisplay).toBeDefined();
  });
});
