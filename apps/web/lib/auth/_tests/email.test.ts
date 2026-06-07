import { describe, it, expect, vi, beforeAll } from 'vitest';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy';

vi.mock('pg', () => ({
  Pool: vi.fn(function() {
    return { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn() };
  }),
}));

vi.mock('better-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth')>();
  let instanceConfig: Record<string, unknown> = {};
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
    __getConfig: () => instanceConfig,
  };
});

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

describe('password policy', () => {
  it('rejects passwords below 12 characters', () => {
    const result = validatePassword('Abcdef1');
    expect(result).not.toBeNull();
    expect(result).toContain('12');
  });

  it('rejects passwords without uppercase letters', () => {
    const result = validatePassword('abcdefghijk1');
    expect(result).not.toBeNull();
    expect(result).toContain('uppercase');
  });

  it('rejects passwords without lowercase letters', () => {
    const result = validatePassword('ABCDEFGHIJK1');
    expect(result).not.toBeNull();
    expect(result).toContain('lowercase');
  });

  it('rejects passwords without digits', () => {
    const result = validatePassword('Abcdefghijkl');
    expect(result).not.toBeNull();
    expect(result).toContain('number');
  });

  it('rejects common password patterns', () => {
    const result = validatePassword('Password1234');
    expect(result).not.toBeNull();
    expect(result).toContain('too common');
  });

  it('rejects keyboard walk patterns', () => {
    const result = validatePassword('Qwertyuiop12');
    expect(result).not.toBeNull();
    expect(result).toContain('too common');
  });

  it('accepts strong passwords meeting all criteria', () => {
    const result = validatePassword('MyStr0ng!Pass#2026');
    expect(result).toBeNull();
  });

  it('exports PASSWORD_MIN_LENGTH as 12', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });
});

describe('email templates', () => {
  it('exports welcome template with HTML and text', async () => {
    const { welcomeTemplate } = await import('@/lib/email/templates/index');
    const result = welcomeTemplate({ name: 'Aria' });
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.html).toContain('Aria');
    expect(result.text).toContain('Aria');
  });

  it('exports verify-email template with URL', async () => {
    const { verifyEmailTemplate } = await import('@/lib/email/templates/index');
    const result = verifyEmailTemplate({ name: 'Aria', url: 'https://example.com/verify?token=abc' });
    expect(result.html).toContain('https://example.com/verify?token=abc');
    expect(result.text).toContain('https://example.com/verify?token=abc');
  });

  it('exports reset-password template with link', async () => {
    const { resetPasswordTemplate } = await import('@/lib/email/templates/index');
    const result = resetPasswordTemplate({ name: 'Aria', url: 'https://example.com/reset?token=abc' });
    expect(result.html).toContain('reset');
    expect(result.text).toContain('reset');
  });
});

describe('email transport', () => {
  it('creates ConsoleTransport when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const { transport } = await import('@/lib/email/transport');
    expect(transport).toBeDefined();
    const result = await transport.send({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });
    expect(result.ok).toBe(true);
  });
});
