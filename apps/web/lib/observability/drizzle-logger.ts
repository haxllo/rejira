import 'server-only';

const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'accessToken', 'refreshToken']);

export interface DrizzleLogEntry {
  sql: string;
  params: unknown[];
  durationMs: number;
  workspaceId: string | null;
  userId: string | null;
}

export function redactParams(params: unknown[]): unknown[] {
  return params.map((p) => {
    if (p === null || p === undefined) return p;
    if (typeof p === 'object' && !Array.isArray(p)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
        out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v;
      }
      return out;
    }
    if (Array.isArray(p)) {
      return p.map((v) => (typeof v === 'string' && SENSITIVE_KEYS.has(v.toLowerCase()) ? '[REDACTED]' : v));
    }
    return p;
  });
}

export const drizzleLogger = {
  logQuery(entry: DrizzleLogEntry): void {
    const redacted = redactParams(entry.params);
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
  },
};
