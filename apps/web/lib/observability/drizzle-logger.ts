import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { redactParams } from './redact';

export interface DrizzleLogEntry {
  sql: string;
  params: unknown[];
  durationMs: number;
  workspaceId: string | null;
  userId: string | null;
}

export const drizzleLogger = {
  logQuery(entry: DrizzleLogEntry): void {
    const redacted = redactParams(entry.params);

    Sentry.addBreadcrumb({
      category: 'drizzle',
      message: entry.sql.slice(0, 200),
      data: {
        durationMs: entry.durationMs,
        workspaceId: entry.workspaceId,
        userId: entry.userId,
      },
      level: 'info',
    });

    if (entry.durationMs > 100) {
      Sentry.captureMessage(
        `Slow query (${entry.durationMs}ms): ${entry.sql.slice(0, 200)}`,
        'warning',
      );
    }

    if (process.env.NODE_ENV === 'development') {
      const payload = {
        sql: entry.sql,
        params: redacted,
        durationMs: entry.durationMs,
        workspaceId: entry.workspaceId,
        userId: entry.userId,
      };
      if (entry.durationMs > 100) {
        console.warn('[drizzle] slow query', payload);
      } else {
        console.debug('[drizzle]', payload);
      }
    }
  },
};
