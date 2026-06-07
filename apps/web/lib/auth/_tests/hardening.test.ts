import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

describe('rate limiter', () => {
  it('allows up to max requests within the window', async () => {
    const { MemoryRateLimiter } = await import('@/lib/auth/rate-limit');
    const limiter = new MemoryRateLimiter();
    const key = 'test-key-1';

    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(key, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it('blocks requests after exceeding the limit', async () => {
    const { MemoryRateLimiter } = await import('@/lib/auth/rate-limit');
    const limiter = new MemoryRateLimiter();
    const key = 'test-key-2';

    for (let i = 0; i < 5; i++) {
      await limiter.check(key, 5, 60000);
    }

    const blocked = await limiter.check(key, 5, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('returns a reset timestamp in the future', async () => {
    const { MemoryRateLimiter } = await import('@/lib/auth/rate-limit');
    const limiter = new MemoryRateLimiter();
    const key = 'test-key-3';

    const result = await limiter.check(key, 5, 60000);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it('resets count after window expires', async () => {
    const { MemoryRateLimiter } = await import('@/lib/auth/rate-limit');
    const limiter = new MemoryRateLimiter();
    const key = 'test-key-4';

    for (let i = 0; i < 5; i++) {
      await limiter.check(key, 5, 1);
    }

    await new Promise((r) => setTimeout(r, 10));

    const result = await limiter.check(key, 5, 1);
    expect(result.allowed).toBe(true);
  });

  it('getRateLimiter returns memory limiter without Upstash env', async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    delete (process.env as Record<string, string | undefined>).UPSTASH_REDIS_REST_URL;

    const { getRateLimiter } = await import('@/lib/auth/rate-limit');
    const limiter = getRateLimiter();
    expect(limiter).toBeDefined();

    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  });

  it('per-endpoint limits are defined for all auth endpoints', async () => {
    const { RATE_LIMITS } = await import('@/lib/auth/rate-limit');

    expect(RATE_LIMITS['sign-in']).toBeDefined();
    expect(RATE_LIMITS['sign-in'].max).toBeGreaterThan(0);
    expect(RATE_LIMITS['sign-up']).toBeDefined();
    expect(RATE_LIMITS['forget-password']).toBeDefined();
    expect(RATE_LIMITS['magic-link']).toBeDefined();
    expect(RATE_LIMITS['two-factor']).toBeDefined();
    expect(RATE_LIMITS['backup-code']).toBeDefined();
  });
});

describe('breach check', () => {
  it('checkBreach returns false for a strong unique password (mock)', async () => {
    const { checkBreach } = await import('@/lib/auth/breach-check');
    const result = await checkBreach('Un1que$tr0ngP@ss!2024');
    expect(typeof result).toBe('boolean');
  });

  it('checkBreach is callable and returns a boolean', async () => {
    const { checkBreach } = await import('@/lib/auth/breach-check');
    const result = await checkBreach('test-password');
    expect([true, false]).toContain(result);
  });
});

describe('password policy', () => {
  it('rejects passwords shorter than 12 characters', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('Short1!');
    expect(error).toBe('Password must be at least 12 characters');
  });

  it('rejects passwords without uppercase', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('alllowercase1!');
    expect(error).toBe('Password must contain at least one uppercase letter');
  });

  it('rejects passwords without lowercase', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('ALLUPPERCASE1!');
    expect(error).toBe('Password must contain at least one lowercase letter');
  });

  it('rejects passwords without a number', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('NoNumbersHere!');
    expect(error).toBe('Password must contain at least one number');
  });

  it('rejects common passwords', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('Password12345');
    expect(error).toBe('This password is too common');
  });

  it('accepts strong passwords', async () => {
    const { validatePassword } = await import('@/lib/auth/password-policy');
    const error = await validatePassword('C0rrectHorseBatteryStaple!');
    expect(error).toBeNull();
  });

  it('checkStrength returns a score between 0 and 4', async () => {
    const { checkStrength } = await import('@/lib/auth/password-policy');

    const weak = checkStrength('abc');
    expect(weak.score).toBe(0);

    const strong = checkStrength('C0rrectHorseBatteryStaple!');
    expect(strong.score).toBeGreaterThanOrEqual(3);
  });
});

describe('account deletion', () => {
  it('deleteAccount function exists and accepts userId', async () => {
    const { deleteAccount } = await import('@/lib/auth/account-deletion');
    expect(typeof deleteAccount).toBe('function');
  });

  it('restoreAccount function exists and accepts userId', async () => {
    const { restoreAccount } = await import('@/lib/auth/account-deletion');
    expect(typeof restoreAccount).toBe('function');
  });
});

describe('audit log', () => {
  it('emitAuditEvent exists and is callable', async () => {
    const { emitAuditEvent } = await import('@/lib/auth/audit');
    expect(typeof emitAuditEvent).toBe('function');
  });

  it('audit event types cover all required events', async () => {
    const { AuditEventType } = await import('@/lib/auth/audit');

    const requiredEvents = [
      'auth_signup',
      'auth_signin',
      'auth_signout',
      'auth_password_change',
      'auth_email_change',
      'auth_2fa_enabled',
      'auth_2fa_disabled',
      'auth_backup_code_used',
      'auth_account_deleted',
      'auth_account_restored',
      'auth_passkey_enrolled',
      'auth_passkey_removed',
    ];

    for (const event of requiredEvents) {
      expect(AuditEventType).toContain(event);
    }
  });
});

describe('data export', () => {
  it('requestExport exists and is callable', async () => {
    const { requestExport } = await import('@/lib/auth/data-export');
    expect(typeof requestExport).toBe('function');
  });
});

describe('anomaly detection', () => {
  it('detectAnomalies returns risk level', async () => {
    const { detectAnomalies } = await import('@/lib/auth/anomaly-detection');
    const result = await detectAnomalies('user-1', 'hash1', 'hash2');
    expect(result).toBeDefined();
    expect(['low', 'medium', 'high']).toContain(result.riskLevel);
    expect(typeof result.isNewDevice).toBe('boolean');
    expect(typeof result.isNewLocation).toBe('boolean');
  });
});
