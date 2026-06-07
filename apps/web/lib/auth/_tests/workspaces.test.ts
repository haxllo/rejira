import { describe, it, expect, beforeAll, vi } from 'vitest';

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: vi.fn(),
});

const mockOrgApi = {
  createOrganization: vi.fn(),
  listOrganizations: vi.fn(),
  getFullOrganization: vi.fn(),
  setActiveOrganization: vi.fn(),
  createInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
};

vi.mock('pg', () => ({
  Pool: vi.fn(function () {
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
          getSession: vi.fn().mockResolvedValue(null),
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
      return authInstance;
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
    passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
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
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((_url: string) => {
    const error = new Error('NEXT_REDIRECT');
    (error as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    throw error;
  }),
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
      orderBy: () => drizzleThenableArray(result),
      limit: () => drizzleThenableArray(result),
    },
  );
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => drizzleThenableArray([]),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    }),
    query: {
      memberships: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
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

vi.mock('@/lib/email/transport', () => ({
  transport: {
    send: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-chars-long';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL_SESSION = 'postgresql://test:test@localhost:5432/test';
  process.env.GOOGLE_CLIENT_ID = 'test-google-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
  process.env.GITHUB_CLIENT_ID = 'test-github-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
});

describe('workspace types', () => {
  it('exports Workspace type inferred from schema', async () => {
    const types = await import('@/lib/auth/workspace-types');
    expect(types).toBeDefined();
    expect(typeof types.getInviteStatus).toBe('function');
  });

  it('getInviteStatus returns accepted for invites with acceptedAt', async () => {
    const { getInviteStatus } = await import('@/lib/auth/workspace-types');
    const invite = { acceptedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) };
    expect(getInviteStatus(invite)).toBe('accepted');
  });

  it('getInviteStatus returns expired for past-due invites', async () => {
    const { getInviteStatus } = await import('@/lib/auth/workspace-types');
    const invite = { acceptedAt: null, expiresAt: new Date('2020-01-01') };
    expect(getInviteStatus(invite)).toBe('expired');
  });

  it('getInviteStatus returns pending for active unaccepted invites', async () => {
    const { getInviteStatus } = await import('@/lib/auth/workspace-types');
    const invite = { acceptedAt: null, expiresAt: new Date(Date.now() + 86400000) };
    expect(getInviteStatus(invite)).toBe('pending');
  });
});

describe('organization plugin registration', () => {
  it('registers the organization plugin mapped to workspaces/memberships tables', async () => {
    const { betterAuth } = await import('better-auth');
    await import('@/lib/auth/server');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(config.plugins).toBeDefined();
    const pluginIds = config.plugins.map((p: { id: string }) => p.id);
    expect(pluginIds).toContain('organization');
  });

  it('registers the admin plugin', async () => {
    const { betterAuth } = await import('better-auth');
    await import('@/lib/auth/server');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const pluginIds = config.plugins.map((p: { id: string }) => p.id);
    expect(pluginIds).toContain('admin');
  });

  it('registers the JWT plugin', async () => {
    const { betterAuth } = await import('better-auth');
    await import('@/lib/auth/server');
    const config = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const pluginIds = config.plugins.map((p: { id: string }) => p.id);
    expect(pluginIds).toContain('jwt');
  });

  it('configures organization schema mapping to our tables', async () => {
    const { organization } = await import('better-auth/plugins');
    await import('@/lib/auth/server');
    const orgConfig = (organization as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orgConfig).toBeDefined();
    expect(orgConfig.schema).toBeDefined();
    expect(orgConfig.schema.organization.modelName).toBe('workspaces');
    expect(orgConfig.schema.member.modelName).toBe('memberships');
  });

  it('configures allowUserToCreateOrganization as true', async () => {
    const { organization } = await import('better-auth/plugins');
    await import('@/lib/auth/server');
    const orgConfig = (organization as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orgConfig.allowUserToCreateOrganization).toBe(true);
  });

  it('sets organizationLimit to 10 per user', async () => {
    const { organization } = await import('better-auth/plugins');
    await import('@/lib/auth/server');
    const orgConfig = (organization as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orgConfig.organizationLimit).toBe(10);
  });

  it('sets invitationExpiresIn to 7 days (604800 seconds)', async () => {
    const { organization } = await import('better-auth/plugins');
    await import('@/lib/auth/server');
    const orgConfig = (organization as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orgConfig.invitationExpiresIn).toBe(604800);
  });
});

describe('workspace helpers', () => {
  it('createWorkspace delegates to auth.api.createOrganization', async () => {
    mockOrgApi.createOrganization.mockResolvedValue({
      id: '1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      externalId: 'ext-1',
      ownerId: '1',
      archivedAt: null,
    });

    const { createWorkspace } = await import('@/lib/auth/workspace-helpers');
    const result = await createWorkspace('user-1', { name: 'Test Workspace', slug: 'test-workspace' });

    expect(mockOrgApi.createOrganization).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('listUserWorkspaces returns empty array for user with no memberships', async () => {
    const { listUserWorkspaces } = await import('@/lib/auth/workspace-helpers');
    const result = await listUserWorkspaces('user-none');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('getDefaultWorkspace returns null when user has no workspaces', async () => {
    const { getDefaultWorkspace } = await import('@/lib/auth/workspace-helpers');
    const result = await getDefaultWorkspace('user-none');
    expect(result).toBeNull();
  });

  it('archiveWorkspace completes without throwing', async () => {
    const { archiveWorkspace } = await import('@/lib/auth/workspace-helpers');
    await expect(archiveWorkspace('1')).resolves.toBeUndefined();
  });
});
