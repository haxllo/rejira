import 'server-only';

let initialized = false;

export function initSentry(): void {
  if (initialized || !process.env.SENTRY_DSN) {
    return;
  }

  try {
    const { init } = require('@sentry/nextjs') as { init: (config: Record<string, unknown>) => void };
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production',
      ignoreErrors: [
        'NEXT_REDIRECT',
        'NEXT_NOT_FOUND',
      ],
    });
    initialized = true;
    console.log('[observability] Sentry initialized');
  } catch {
    initialized = true;
    console.log('[observability] Sentry DSN configured (SDK not yet installed)');
  }
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) {
    console.error(`[observability] Error: ${error.message}`, context);
    return;
  }

  try {
    const Sentry = require('@sentry/nextjs') as {
      captureException: (err: Error, ctx?: Record<string, unknown>) => void;
    };
    Sentry.captureException(error, {
      extra: context,
    });
  } catch {
    console.error(`[observability] Error: ${error.message}`, context);
  }
}
