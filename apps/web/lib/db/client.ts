import 'server-only';

import { drizzle, type Logger } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { drizzleLogger } from '@/lib/observability/drizzle-logger';

/**
 * Database client singleton management.
 * 
 * In Next.js development (especially with Turbopack), this module may be 
 * re-evaluated or loaded in multiple contexts (RSC, API, etc.). We use
 * a global variable to ensure we don't leak connection pools.
 */

// Use globalThis to persist the pool and db instance across hot-reloads in dev
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: ReturnType<typeof createDb> | undefined;
};

function createPool(): Pool {
  // Use the environment variable with a fallback for local development
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('::1');

  const poolConfig = {
    connectionString: dbUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000, // Slightly longer timeout
    application_name: 'rejira-web',
    ssl: isLocal ? false : { rejectUnauthorized: false }, // Use false for broader compatibility
  };

  const pool = new Pool(poolConfig);

  pool.on('error', (err: any) => {
    console.error('[db] Unexpected pool error:', err.message);
    if (err.errors) {
      err.errors.forEach((e: any, i: number) => {
        console.error(`[db] Pool sub-error ${i}:`, e.message);
      });
    }
  });

  // Test connection immediately in development
  if (process.env.NODE_ENV === 'development') {
    pool.connect()
      .then(client => {
        console.log('[db] Initial connection test successful');
        client.release();
      })
      .catch(err => {
        console.error('[db] Initial connection test failed:', err.message);
        if (err.errors) {
          err.errors.forEach((e: any, i: number) => {
            console.error(`[db] Connection sub-error ${i}:`, e.message);
          });
        }
      });
  }

  return pool;
}

function createDb() {
  const pool = globalForDb.pool ?? createPool();
  if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

  const drizLogger: Logger = {
    logQuery(query: string, params: unknown[]): void {
      const start = Date.now();
      Promise.resolve()
        .then(() => {
          const durationMs = Date.now() - start;
          drizzleLogger.logQuery({
            sql: query,
            params,
            durationMs,
            workspaceId: null,
            userId: null,
          });
        })
        .catch(() => {});
    },
  };

  return drizzle({ client: pool }, {
    schema,
    prepare: false, // Required for Supabase pooler (transaction mode)
    logger: process.env.NODE_ENV === 'development' ? drizLogger : false,
  });
}

// Ensure we only have one instance of the database and pool
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export type DB = typeof db;

