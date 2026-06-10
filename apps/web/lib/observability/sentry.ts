import 'server-only';

import * as Sentry from '@sentry/nextjs';

let initialized = false;

export function initSentry(): void {
  if (initialized || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
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
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) {
    console.error(`[observability] Error: ${error.message}`, context);
    return;
  }

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch {
    console.error(`[observability] Error: ${error.message}`, context);
  }
}

export async function withSentryTransaction<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!process.env.SENTRY_DSN) {
    return fn();
  }

  try {
    return await Sentry.startSpan({ name, op: 'db.transaction' }, async () => {
      return fn();
    });
  } catch {
    return fn();
  }
}

export function captureDrizzleError(
  err: unknown,
  context: { workspaceId?: string; sql?: string },
): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    Sentry.captureException(err, {
      extra: {
        workspaceId: context.workspaceId,
        sql: context.sql ? context.sql.slice(0, 500) : undefined,
        code: (err as Record<string, unknown>)?.code,
      },
    });
  } catch {
    // Sentry must never throw
  }
}
