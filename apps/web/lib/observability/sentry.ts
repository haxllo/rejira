import * as Sentry from '@sentry/nextjs';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }
  initialized = true;
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
