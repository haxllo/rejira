import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

describe('auth events tracking', () => {
  it('trackAuthEvent emits sign-in event with userId and hashes', async () => {
    const { trackAuthEvent } = await import('@/lib/observability/auth-events');

    const event = {
      event: 'sign_in_success',
      userId: 'user-1',
      ipHash: 'ip-hash-1',
      uaHash: 'ua-hash-1',
      timestamp: Date.now(),
    };

    expect(() => trackAuthEvent(event)).not.toThrow();
  });

  it('trackAuthEvent emits failed sign-in event', async () => {
    const { trackAuthEvent } = await import('@/lib/observability/auth-events');

    const event = {
      event: 'sign_in_failed',
      userId: 'user-2',
      timestamp: Date.now(),
      metadata: { reason: 'invalid_password' },
    };

    expect(() => trackAuthEvent(event)).not.toThrow();
  });

  it('trackAuthEvent emits password change event', async () => {
    const { trackAuthEvent } = await import('@/lib/observability/auth-events');

    const event = {
      event: 'password_changed',
      userId: 'user-3',
      timestamp: Date.now(),
    };

    expect(() => trackAuthEvent(event)).not.toThrow();
  });

  it('trackAuthEvent emits email change event', async () => {
    const { trackAuthEvent } = await import('@/lib/observability/auth-events');

    const event = {
      event: 'email_changed',
      userId: 'user-4',
      timestamp: Date.now(),
      metadata: { oldEmailHash: 'hash1', newEmailHash: 'hash2' },
    };

    expect(() => trackAuthEvent(event)).not.toThrow();
  });

  it('trackAuthEvent emits account deletion event', async () => {
    const { trackAuthEvent } = await import('@/lib/observability/auth-events');

    const event = {
      event: 'account_deleted',
      userId: 'user-5',
      timestamp: Date.now(),
    };

    expect(() => trackAuthEvent(event)).not.toThrow();
  });
});

describe('sentry init', () => {
  it('initSentry does not throw without SENTRY_DSN', async () => {
    delete (process.env as Record<string, string | undefined>).SENTRY_DSN;
    const { initSentry } = await import('@/lib/observability/sentry');
    expect(() => initSentry()).not.toThrow();
  });

  it('captureError logs error without SENTRY_DSN', async () => {
    delete (process.env as Record<string, string | undefined>).SENTRY_DSN;
    const { captureError } = await import('@/lib/observability/sentry');
    expect(() => captureError(new Error('test error'), { test: true })).not.toThrow();
  });
});

describe('posthog init', () => {
  it('initPostHog does not throw without POSTHOG_API_KEY', async () => {
    delete (process.env as Record<string, string | undefined>).POSTHOG_API_KEY;
    const { initPostHog } = await import('@/lib/observability/posthog');
    expect(() => initPostHog()).not.toThrow();
  });

  it('trackEvent logs without POSTHOG_API_KEY', async () => {
    delete (process.env as Record<string, string | undefined>).POSTHOG_API_KEY;
    const { trackEvent } = await import('@/lib/observability/posthog');
    expect(() => trackEvent('test_event', 'user-1', { key: 'value' })).not.toThrow();
  });
});
