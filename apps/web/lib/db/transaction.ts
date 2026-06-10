import 'server-only';

import { sql } from 'drizzle-orm';
import { db, type DB } from './client';
import { requireAuth } from '@/lib/auth/require-auth';
import { mapDrizzleError } from './errors';
import { withSentryTransaction, captureDrizzleError } from '@/lib/observability/sentry';
import type { AuthUser } from '@/lib/auth/types';

export type Tx = Parameters<DB['transaction']>[0] extends (tx: infer T) => unknown ? T : never;

function userExternalId(user: AuthUser): string {
  const u = user as unknown as { id?: unknown; externalId?: unknown };
  if (typeof u.externalId === 'string' && u.externalId.length > 0) return u.externalId;
  if (typeof u.id === 'string' && u.id.length > 0) return u.id;
  throw new Error('Cannot resolve externalId from session user');
}

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const user = await requireAuth();
  const externalId = userExternalId(user);
  try {
    return await withSentryTransaction('withTransaction', async () => {
      return await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: externalId })}, true)`,
        );
        return fn(tx);
      });
    });
  } catch (err) {
    captureDrizzleError(err, {});
    throw mapDrizzleError(err);
  }
}

export async function withWorkspaceTransaction<T>(
  workspaceId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const user = await requireAuth();
  const externalId = userExternalId(user);
  try {
    return await withSentryTransaction(`withWorkspaceTransaction:${workspaceId}`, async () => {
      return await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: externalId, workspace_id: workspaceId })}, true)`,
        );
        return fn(tx);
      });
    });
  } catch (err) {
    captureDrizzleError(err, { workspaceId });
    throw mapDrizzleError(err);
  }
}
