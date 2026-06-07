import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('server-only', () => ({}));

const mockPoolQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockPoolConnect = vi.fn().mockResolvedValue({
  query: mockPoolQuery,
  release: vi.fn(),
});

vi.mock('pg', () => ({
  Pool: vi.fn(function() {
    return { query: mockPoolQuery, connect: mockPoolConnect };
  }),
}));

vi.mock('better-auth', () => ({
  betterAuth: vi.fn().mockReturnValue({
    api: {
      addPasskey: vi.fn().mockResolvedValue({
        options: { challenge: 'test-challenge', rp: { name: 'rejira' }, user: { id: 'user-1', name: 'test' } },
        challenge: 'test-challenge',
      }),
      verifyPasskey: vi.fn().mockResolvedValue({ ok: true }),
      signInPasskey: vi.fn().mockResolvedValue({
        options: { challenge: 'test-challenge', rpId: 'localhost' },
        challenge: 'test-challenge',
      }),
      verifyPasskeySignIn: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'test@test.com' },
        session: { id: 'session-1', token: 'abc' },
      }),
      removePasskey: vi.fn().mockResolvedValue({ ok: true }),
      listPasskeys: vi.fn().mockResolvedValue({
        passkeys: [
          { id: 'pk-1', name: 'MacBook Touch ID', createdAt: '2024-01-01T00:00:00Z', lastUsedAt: null },
          { id: 'pk-2', name: 'YubiKey 5C', createdAt: '2024-02-01T00:00:00Z', lastUsedAt: '2024-03-01T00:00:00Z' },
        ],
      }),
    },
  }),
}));

vi.mock('better-auth/plugins', () => ({
  organization: vi.fn().mockReturnValue({ id: 'organization' }),
  admin: vi.fn().mockReturnValue({ id: 'admin' }),
  jwt: vi.fn().mockReturnValue({ id: 'jwt' }),
  magicLink: vi.fn().mockReturnValue({ id: 'magicLink' }),
  genericOAuth: vi.fn().mockReturnValue({ id: 'genericOAuth' }),
  twoFactor: vi.fn().mockReturnValue({ id: 'twoFactor' }),
  passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
  nextCookies: vi.fn().mockReturnValue({ id: 'nextCookies' }),
}));

vi.mock('better-auth/social-providers', () => ({
  google: vi.fn().mockReturnValue({ id: 'google' }),
  github: vi.fn().mockReturnValue({ id: 'github' }),
}));

vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn().mockReturnValue({ id: 'nextCookies' }),
}));

vi.mock('@/lib/auth/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/auth/account-linking', () => ({
  accountLinkingConfig: {
    enabled: true,
    trustedProviders: ['google', 'github'],
    allowUnlinking: true,
  },
}));

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long-!!';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
  process.env.GOOGLE_CLIENT_ID = 'test-google-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
  process.env.GITHUB_CLIENT_ID = 'test-github-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
});

describe('passkey enrollment', () => {
  it('enrollPasskey returns challenge and options', async () => {
    const { enrollPasskey } = await import('@/lib/auth/passkey');
    const result = await enrollPasskey('user-1');

    expect(result).toBeDefined();
    expect(result.options).toBeDefined();
    expect(result.challenge).toBeDefined();
  });

  it('the challenge is returned for authenticator verification', async () => {
    const { enrollPasskey } = await import('@/lib/auth/passkey');
    const result = await enrollPasskey('user-1');

    expect(result.challenge).toBe('test-challenge');
    expect(result.options.challenge).toBe('test-challenge');
  });

  it('verifyPasskeyRegistration returns true for valid credentials', async () => {
    const { verifyPasskeyRegistration } = await import('@/lib/auth/passkey');
    const result = await verifyPasskeyRegistration('user-1', { id: 'cred-1' });

    expect(result).toBe(true);
  });

  it('signInWithPasskey returns options and challenge', async () => {
    const { signInWithPasskey } = await import('@/lib/auth/passkey');
    const result = await signInWithPasskey();

    expect(result).toBeDefined();
    expect(result.options).toBeDefined();
    expect(result.challenge).toBeDefined();
  });

  it('verifyPasskeySignIn returns session', async () => {
    const { verifyPasskeySignIn } = await import('@/lib/auth/passkey');
    const result = await verifyPasskeySignIn({ id: 'cred-1' });

    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });

  it('removePasskey removes a specific credential', async () => {
    const { removePasskey } = await import('@/lib/auth/passkey');

    await expect(removePasskey('user-1', 'pk-1')).resolves.not.toThrow();
  });

  it('listPasskeys returns enrolled passkeys with metadata', async () => {
    const { listPasskeys } = await import('@/lib/auth/passkey');
    const passkeys = await listPasskeys('user-1');

    expect(passkeys).toHaveLength(2);
    expect(passkeys[0].id).toBe('pk-1');
    expect(passkeys[0].name).toBe('MacBook Touch ID');
    expect(passkeys[1].id).toBe('pk-2');
    expect(passkeys[1].name).toBe('YubiKey 5C');
  });

  it('multiple passkeys per user are supported', async () => {
    const { listPasskeys } = await import('@/lib/auth/passkey');
    const passkeys = await listPasskeys('user-1');

    expect(passkeys.length).toBeGreaterThanOrEqual(2);
  });
});
