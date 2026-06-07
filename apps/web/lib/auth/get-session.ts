import 'server-only';

import { auth } from './server';
import type { AuthUser, AuthSession } from './types';
import { headers } from 'next/headers';

export async function getSession(): Promise<{ user: AuthUser; session: AuthSession } | null> {
  const headersList = await headers();
  const result = await auth.api.getSession({
    headers: headersList,
  });

  if (!result) return null;

  return {
    user: result.user as AuthUser,
    session: result.session as AuthSession,
  };
}
