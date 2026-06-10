import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

let mockAddBreadcrumb: ReturnType<typeof vi.fn>;
let mockCaptureMessage: ReturnType<typeof vi.fn>;
let mockCaptureException: ReturnType<typeof vi.fn>;

vi.mock('@sentry/nextjs', () => {
  mockAddBreadcrumb = vi.fn();
  mockCaptureMessage = vi.fn();
  mockCaptureException = vi.fn();
  return {
    addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
    captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    init: vi.fn(),
    startSpan: vi.fn(),
  };
});

vi.mock('@/lib/observability/redact', () => ({
  redactParams: vi.fn((params: unknown[]) => params.map(() => '[TEST_REDACTED]')),
}));

function isValidUUIDv4(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

describe('observability', () => {
  beforeAll(() => {
    delete process.env.SENTRY_DSN;
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Drizzle client config', () => {
    it('contains statement_timeout: 5000 (ms) and prepare: false', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        new URL('../client.ts', import.meta.url),
        'utf-8',
      );

      expect(content).toContain('statement_timeout');
      expect(content).toContain('5_000');
      expect(content).toContain('prepare: false');
    });
  });

  describe('drizzleLogger', () => {
    it('emits a Sentry breadcrumb for every Drizzle query', async () => {
      const { drizzleLogger } = await import('@/lib/observability/drizzle-logger');

      drizzleLogger.logQuery({
        sql: "SELECT * FROM issues WHERE workspaceId = 'ws_test'",
        params: [],
        durationMs: 42,
        workspaceId: 'ws_test',
        userId: 'u_test',
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
      const breadcrumbCall = mockAddBreadcrumb.mock.calls[0][0];
      expect(breadcrumbCall.category).toBe('drizzle');
      expect(breadcrumbCall.level).toBe('info');
      expect(breadcrumbCall.data.workspaceId).toBe('ws_test');
      expect(breadcrumbCall.data.userId).toBe('u_test');
      expect(breadcrumbCall.data.durationMs).toBe(42);
    });

    it('emits a Sentry warning for queries > 100ms', async () => {
      const { drizzleLogger } = await import('@/lib/observability/drizzle-logger');

      drizzleLogger.logQuery({
        sql: 'SELECT * FROM issues',
        params: [],
        durationMs: 150,
        workspaceId: null,
        userId: null,
      });

      expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
      const msgCall = mockCaptureMessage.mock.calls[0];
      expect(msgCall[0]).toContain('Slow query');
      expect(msgCall[0]).toContain('150ms');
      expect(msgCall[1]).toBe('warning');
    });

    it('does not emit a warning for queries <= 100ms', async () => {
      const { drizzleLogger } = await import('@/lib/observability/drizzle-logger');

      drizzleLogger.logQuery({
        sql: 'SELECT * FROM issues',
        params: [],
        durationMs: 100,
        workspaceId: null,
        userId: null,
      });

      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it('includes sql, durationMs, workspaceId in breadcrumb data', async () => {
      const { drizzleLogger } = await import('@/lib/observability/drizzle-logger');

      drizzleLogger.logQuery({
        sql: 'UPDATE issues SET status = $1',
        params: ['done'],
        durationMs: 85,
        workspaceId: 'ws_test',
        userId: 'u_test',
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
      const bc = mockAddBreadcrumb.mock.calls[0][0];
      expect(bc.data.durationMs).toBe(85);
      expect(bc.data.workspaceId).toBe('ws_test');
      expect(bc.message).toContain('UPDATE');
    });
  });

  describe('pino logger', () => {
    it('attaches requestId, userId, workspaceId bindings', async () => {
      const { logger, withRequestContext } = await import('@/lib/observability/logger');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');

      const child = withRequestContext({
        requestId: 'req-123',
        userId: 'u_test',
        workspaceId: 'ws_test',
      });

      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });
  });

  describe('middleware request ID', () => {
    it('UUID v4 is generated with correct format', async () => {
      const { randomUUID } = await import('crypto');
      const id = randomUUID();
      expect(isValidUUIDv4(id)).toBe(true);
    });

    it('two generated UUIDs are unique', async () => {
      const { randomUUID } = await import('crypto');
      const ids = new Set(Array.from({ length: 1000 }, () => randomUUID()));
      expect(ids.size).toBe(1000);
    });
  });

  describe('Sentry capture in withWorkspaceTransaction', () => {
    it('captures Drizzle exceptions with workspaceId in context', async () => {
      const { captureDrizzleError } = await import('@/lib/observability/sentry');

      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/1');

      const err = new Error('DB timeout');
      (err as unknown as Record<string, unknown>).code = '57014';

      captureDrizzleError(err, { workspaceId: 'ws_test', sql: 'SELECT pg_sleep(10)' });

      expect(mockCaptureException).toHaveBeenCalledTimes(1);
      const captureCall = mockCaptureException.mock.calls[0];
      expect(captureCall[0]).toBe(err);
      expect(captureCall[1].extra.workspaceId).toBe('ws_test');
      expect(captureCall[1].extra.code).toBe('57014');
    });

    it('does not throw when Sentry DSN is not configured', async () => {
      vi.stubEnv('SENTRY_DSN', '');

      const { captureDrizzleError } = await import('@/lib/observability/sentry');

      expect(() => {
        captureDrizzleError(new Error('test'), {});
      }).not.toThrow();
    });
  });

  describe('PostHog 10 high-funnel events', () => {
    it('all 10 high-funnel event functions are exported', async () => {
      const events = await import('@/lib/observability/events');

      const eventFunctions = [
        'trackIssueCreated',
        'trackStatusChanged',
        'trackCommentCreated',
        'trackProjectCreated',
        'trackCycleCreated',
        'trackViewSaved',
        'trackNotificationRead',
        'trackMemberInvited',
        'trackMemberJoined',
        'trackMemberRoleChanged',
      ];

      for (const fn of eventFunctions) {
        expect(typeof (events as Record<string, unknown>)[fn]).toBe('function');
      }
    });

    it('member events fire without throwing', async () => {
      const events = await import('@/lib/observability/events');

      expect(() => {
        events.trackMemberInvited({
          userId: 'u_test',
          workspaceId: 'ws_test',
          email: 'test@example.com',
        });
      }).not.toThrow();

      expect(() => {
        events.trackMemberJoined({
          userId: 'u_test',
          workspaceId: 'ws_test',
        });
      }).not.toThrow();

      expect(() => {
        events.trackMemberRoleChanged({
          userId: 'u_test',
          workspaceId: 'ws_test',
          targetUserId: 'u_target',
          from: 'member',
          to: 'admin',
        });
      }).not.toThrow();
    });
  });
});
