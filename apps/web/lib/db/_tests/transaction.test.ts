import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
const mockTransaction = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    sql: actual.sql,
  };
});

vi.mock('../client', () => ({
  db: {
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error('NEXT_REDIRECT');
    (err as Error & { digest: string }).digest = 'NEXT_REDIRECT';
    throw err;
  }),
}));

function makeTx() {
  return { execute: mockExecute };
}

function getFirstSqlObject(): { queryChunks: unknown[] } | null {
  for (const call of mockExecute.mock.calls) {
    const arg = call[0];
    if (arg && typeof arg === 'object' && 'queryChunks' in arg) {
      return arg as { queryChunks: unknown[] };
    }
  }
  return null;
}

function chunksToText(sqlObj: { queryChunks: unknown[] }): string {
  return sqlObj.queryChunks
    .map((c) => {
      if (!c || typeof c !== 'object') return String(c ?? '');
      const obj = c as { constructor?: { name?: string }; value?: unknown };
      if (obj.constructor?.name === 'StringChunk' && Array.isArray(obj.value)) {
        return obj.value.join('');
      }
      if (obj.constructor?.name === 'String') {
        return String(c);
      }
      if (typeof obj.value === 'string') return obj.value;
      if (Array.isArray(obj.value)) return obj.value.join('');
      return String(obj.value ?? c);
    })
    .join('');
}

describe('transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: 'u_aria', email: 'aria@acme.com' });
    mockExecute.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(makeTx()));
  });

  describe('withTransaction', () => {
    it('1: invokes the callback with a tx object and returns the callback result', async () => {
      const { withTransaction } = await import('../transaction');
      const result = await withTransaction(async () => 42);
      expect(result).toBe(42);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('2: calls set_config with request.jwt.claims containing externalId before the callback', async () => {
      const { withTransaction } = await import('../transaction');
      let callObservedBefore: boolean | null = null;
      let observedText: string | null = null;
      await withTransaction(async () => {
        const sqlObj = getFirstSqlObject();
        if (sqlObj) observedText = chunksToText(sqlObj);
        callObservedBefore = mockExecute.mock.calls.length > 0;
        return 'ok';
      });
      expect(callObservedBefore).toBe(true);
      expect(observedText).toContain('request.jwt.claims');
      expect(observedText).toContain('u_aria');
    });

    it('3: set_config third argument is true (local to transaction; no pool leak)', async () => {
      const { withTransaction } = await import('../transaction');
      await withTransaction(async () => 'ok');
      const sqlObj = getFirstSqlObject();
      expect(sqlObj).not.toBeNull();
      const text = chunksToText(sqlObj!);
      expect(text).toMatch(/,\s*true\s*\)/);
    });

    it('4: throws DbError with code FORBIDDEN (status 403) when SQLSTATE is 42501', async () => {
      const { withTransaction } = await import('../transaction');
      mockTransaction.mockImplementationOnce(async () => {
        const err = new Error('permission denied') as Error & { code: string };
        err.code = '42501';
        throw err;
      });
      await expect(withTransaction(async () => null)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('5: throws DbError with code CONFLICT (status 409) when SQLSTATE is 23505', async () => {
      const { withTransaction } = await import('../transaction');
      mockTransaction.mockImplementationOnce(async () => {
        const err = new Error('unique') as Error & { code: string };
        err.code = '23505';
        throw err;
      });
      await expect(withTransaction(async () => null)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });

    it('6: throws DbError with code FOREIGN_KEY (status 409) when SQLSTATE is 23503', async () => {
      const { withTransaction } = await import('../transaction');
      mockTransaction.mockImplementationOnce(async () => {
        const err = new Error('fk') as Error & { code: string };
        err.code = '23503';
        throw err;
      });
      await expect(withTransaction(async () => null)).rejects.toMatchObject({
        code: 'FOREIGN_KEY',
        status: 409,
      });
    });

    it('7: throws DbError with code TIMEOUT (status 408) when SQLSTATE is 57014', async () => {
      const { withTransaction } = await import('../transaction');
      mockTransaction.mockImplementationOnce(async () => {
        const err = new Error('cancel') as Error & { code: string };
        err.code = '57014';
        throw err;
      });
      await expect(withTransaction(async () => null)).rejects.toMatchObject({
        code: 'TIMEOUT',
        status: 408,
      });
    });

    it('8: mapDrizzleError returns a stable user-safe message (no SQL, no stack) for each mapped code', async () => {
      const { mapDrizzleError } = await import('../errors');
      const cases: Array<[string, string, number]> = [
        ['42501', "You don't have permission to do that", 403],
        ['23505', 'That value is already taken', 409],
        ['23503', 'Cannot complete — referenced elsewhere', 409],
        ['57014', 'The request took too long — try again', 408],
        ['PGRST116', 'Not found', 404],
      ];
      for (const [code, expectedMsg, expectedStatus] of cases) {
        const mapped = mapDrizzleError(Object.assign(new Error('SELECT 1 FROM secret_table'), { code }));
        expect(mapped.message).toBe(expectedMsg);
        expect(mapped.message).not.toContain('SELECT');
        expect(mapped.message).not.toContain('secret_table');
        expect(mapped.status).toBe(expectedStatus);
      }
      const unknown = mapDrizzleError(new Error('boom'));
      expect(unknown.message).toBe('Something went wrong');
      expect(unknown.status).toBe(500);
    });
  });

  describe('withWorkspaceTransaction', () => {
    it('sets request.jwt.claims with sub and workspace_id', async () => {
      const { withWorkspaceTransaction } = await import('../transaction');
      await withWorkspaceTransaction('ws_acme', async () => 'ok');
      const sqlObj = getFirstSqlObject();
      expect(sqlObj).not.toBeNull();
      const text = chunksToText(sqlObj!);
      expect(text).toContain('request.jwt.claims');
      expect(text).toContain('u_aria');
      expect(text).toContain('ws_acme');
      expect(text).toMatch(/,\s*true\s*\)/);
      const match = text.match(/request\.jwt\.claims',\s*(\{[^}]*\})/);
      expect(match).not.toBeNull();
      const parsed = JSON.parse(match![1]);
      expect(parsed.sub).toBe('u_aria');
      expect(parsed.workspace_id).toBe('ws_acme');
    });

    it('throws DbError on failure', async () => {
      const { withWorkspaceTransaction } = await import('../transaction');
      mockTransaction.mockImplementationOnce(async () => {
        const err = new Error('boom') as Error & { code: string };
        err.code = '23505';
        throw err;
      });
      await expect(withWorkspaceTransaction('ws_acme', async () => null)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('redactParams', () => {
    it('strips sensitive keys from object params', async () => {
      const { redactParams } = await import('@/lib/observability/drizzle-logger');
      const redacted = redactParams([{ password: 'pw', token: 'tk', name: 'aria' }]);
      expect(redacted[0]).toEqual({ password: '[REDACTED]', token: '[REDACTED]', name: 'aria' });
    });

    it('passes through primitives', async () => {
      const { redactParams } = await import('@/lib/observability/drizzle-logger');
      expect(redactParams(['hello', 42, null, undefined])).toEqual(['hello', 42, null, undefined]);
    });
  });
});
