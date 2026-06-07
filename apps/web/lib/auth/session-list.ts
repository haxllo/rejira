import 'server-only';

import { Pool } from 'pg';

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: string;
  isCurrent: boolean;
}

function getPool(): Pool {
  const { auth } = require('./server') as { auth: { options: { database: Pool } } };
  return auth.options.database;
}

export async function listSessions(userId: string): Promise<SessionInfo[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, "userId", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt"
     FROM auth.session
     WHERE "userId" = $1
     ORDER BY "updatedAt" DESC`,
    [userId],
  );
  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.userId as string,
    expiresAt: row.expiresAt as string,
    ipAddress: (row.ipAddress as string) ?? null,
    userAgent: (row.userAgent as string) ?? null,
    lastActive: (row.updatedAt as string) || (row.createdAt as string),
    isCurrent: false,
  }));
}

export async function revokeSession(sessionId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM auth.session WHERE id = $1', [sessionId]);
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  const pool = getPool();
  if (exceptSessionId) {
    await pool.query('DELETE FROM auth.session WHERE "userId" = $1 AND id != $2', [
      userId,
      exceptSessionId,
    ]);
  } else {
    await pool.query('DELETE FROM auth.session WHERE "userId" = $1', [userId]);
  }
}

export async function sessionCount(userId: string): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM auth.session WHERE "userId" = $1',
    [userId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}
