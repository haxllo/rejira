import 'server-only';

import pino from 'pino';

export const logger = pino({
  name: 'rejira-web',
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});

export function withRequestContext({
  requestId,
  userId,
  workspaceId,
}: {
  requestId: string;
  userId: string | null;
  workspaceId: string | null;
}): pino.Logger {
  return logger.child({ requestId, userId, workspaceId });
}
