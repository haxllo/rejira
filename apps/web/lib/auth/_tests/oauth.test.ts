import { describe, it, expect, vi, beforeAll } from 'vitest';

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
        api: {
          getSession: vi.fn().mockResolvedValue(null),
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
    magicLink: vi.fn().mockReturnValue({ id: 'magic-link', version: '1.6.14' }),
    twoFactor: vi.fn().mockReturnValue({ id: 'two-factor', version: '1.6.14' }),
    genericOAuth: vi.fn().mockReturnValue({ id: 'generic-oauth', version: '1.6.14' }),
    passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
  };
});

vi.mock('better-auth/social-providers', () => ({
  google: vi.fn((opts: Record<string, unknown>) => ({ id: 'google', ...opts })),
  github: vi.fn((opts: Record<string, unknown>) => ({ id: 'github', ...opts })),
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

vi.mock('@/lib/email/transport', () => ({
  transport: {
    send: vi.fn().mockResolvedValue({ ok: true }),
  },
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

describe('magic link plugin', () => {
  it('registers the magicLink plugin in the plugins array', async () => {
    const { auth } = await import('@/lib/auth/server');
    const config = auth.options;
    const plugins = config.plugins as Array<{ id: string }>;
    const mlPlugin = plugins.find((p) => p.id === 'magic-link');
    expect(mlPlugin).toBeDefined();
  });

  it('configures magic link with sendMagicLink callback', async () => {
    const { magicLink } = await import('better-auth/plugins');
    const calls = (magicLink as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const mlOptions = calls[calls.length - 1][0];
    expect(mlOptions).toBeDefined();
    expect(mlOptions.sendMagicLink).toBeDefined();
    expect(typeof mlOptions.sendMagicLink).toBe('function');
  });

  it('sets magic link expiry to 900 seconds (15 minutes)', async () => {
    const { magicLink } = await import('better-auth/plugins');
    const calls = (magicLink as ReturnType<typeof vi.fn>).mock.calls;
    const mlOptions = calls[calls.length - 1][0];
    expect(mlOptions.expiresIn).toBe(900);
  });

  it('magic link sendMagicLink callback calls render with magic-link template', async () => {
    const { render } = await import('@/lib/email/render');
    const renderSpy = vi.mocked(render);

    const { magicLink } = await import('better-auth/plugins');
    const calls = (magicLink as ReturnType<typeof vi.fn>).mock.calls;
    const mlOptions = calls[calls.length - 1][0];
    const callback = mlOptions.sendMagicLink as (
      payload: { email: string; url: string; token: string },
      _ctx: unknown,
    ) => Promise<void>;

    await callback({ email: 'aria@test.com', url: 'https://rejira.app/verify?token=abc', token: 'abc123' }, {});

    expect(renderSpy).toHaveBeenCalledWith(
      'magic-link',
      expect.objectContaining({
        to: 'aria@test.com',
      }),
    );
  });
});

describe('OAuth providers', () => {
  it('registers Google OAuth provider via genericOAuth plugin', async () => {
    const { genericOAuth } = await import('better-auth/plugins');
    const oauthCalls = (genericOAuth as ReturnType<typeof vi.fn>).mock.calls;
    expect(oauthCalls.length).toBeGreaterThan(0);

    const config_arg = oauthCalls[0][0] as { config: Array<{ id: string }> };
    expect(config_arg.config).toBeDefined();
    const googleConfig = config_arg.config.find((c) => c.id === 'google');
    expect(googleConfig).toBeDefined();
  });

  it('registers GitHub OAuth provider via genericOAuth plugin', async () => {
    const { genericOAuth } = await import('better-auth/plugins');
    const oauthCalls = (genericOAuth as ReturnType<typeof vi.fn>).mock.calls;
    const config_arg = oauthCalls[0][0] as { config: Array<{ id: string }> };
    const githubConfig = config_arg.config.find((c) => c.id === 'github');
    expect(githubConfig).toBeDefined();
  });
});

describe('oauth-config', () => {
  it('exports googleProvider with clientId and clientSecret from env', async () => {
    const { googleProvider } = await import('@/lib/auth/oauth-config');
    expect(googleProvider).toBeDefined();
    expect(googleProvider.clientId).toBe('test-google-id');
    expect(googleProvider.clientSecret).toBe('test-google-secret');
  });

  it('exports githubProvider with clientId and clientSecret from env', async () => {
    const { githubProvider } = await import('@/lib/auth/oauth-config');
    expect(githubProvider).toBeDefined();
    expect(githubProvider.clientId).toBe('test-github-id');
    expect(githubProvider.clientSecret).toBe('test-github-secret');
  });

  it('isOAuthConfigured returns true when Google env vars are set', async () => {
    const { isOAuthConfigured } = await import('@/lib/auth/oauth-config');
    expect(isOAuthConfigured()).toBe(true);
  });
});

describe('account-linking', () => {
  it('exports accountLinkingConfig with enabled: true', async () => {
    const { accountLinkingConfig } = await import('@/lib/auth/account-linking');
    expect(accountLinkingConfig).toBeDefined();
    expect(accountLinkingConfig.enabled).toBe(true);
  });

  it('trustedProviders includes google and github', async () => {
    const { accountLinkingConfig } = await import('@/lib/auth/account-linking');
    expect(accountLinkingConfig.trustedProviders).toContain('google');
    expect(accountLinkingConfig.trustedProviders).toContain('github');
  });

  it('isProviderTrusted returns true for trusted providers', async () => {
    const { isProviderTrusted } = await import('@/lib/auth/account-linking');
    expect(isProviderTrusted('google')).toBe(true);
    expect(isProviderTrusted('github')).toBe(true);
    expect(isProviderTrusted('facebook')).toBe(false);
  });
});
