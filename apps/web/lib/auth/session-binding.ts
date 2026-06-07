import 'server-only';

import { createHash } from 'node:crypto';

export function hashIP(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export function hashUA(ua: string): string {
  return createHash('sha256').update(ua).digest('hex');
}

export async function isNewDevice(
  userId: string,
  ipHash: string,
  uaHash: string,
): Promise<boolean> {
  try {
    const { auth } = await import('./server');
    const sessions = (await (auth as unknown as Record<string, CallableFunction>).api.listSessions?.({ userId })) as Array<{
      ipAddress?: string;
      userAgent?: string;
    }> | null;

    if (!sessions || sessions.length === 0) return false;

    const knownDevice = sessions.some(
      (s) => s.ipAddress === ipHash && s.userAgent === uaHash,
    );
    return !knownDevice;
  } catch {
    return false;
  }
}
