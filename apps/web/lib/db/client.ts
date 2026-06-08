import 'server-only';

import { drizzle, type Logger } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { drizzleLogger } from '@/lib/observability/drizzle-logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5_000,
  query_timeout: 5_000,
  application_name: 'rejira-web',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

const drizLogger: Logger = {
  logQuery(query: string, params: unknown[]): void {
    const start = Date.now();
    const workspaceId = null;
    const userId = null;
    Promise.resolve()
      .then(() => {
        const durationMs = Date.now() - start;
        drizzleLogger.logQuery({
          sql: query,
          params,
          durationMs,
          workspaceId,
          userId,
        });
      })
      .catch(() => {});
  },
};

export const db = drizzle(pool, {
  schema,
  prepare: false,
  logger: process.env.NODE_ENV === 'development' ? drizLogger : false,
});

export type DB = typeof db;
