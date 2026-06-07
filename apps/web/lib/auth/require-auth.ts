import 'server-only';

import { getSession } from './get-session';
import { redirect } from 'next/navigation';
import type { AuthUser } from './types';

export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();

  if (!session) {
    redirect('/sign-in');
  }

  if (!session.user.emailVerified) {
    redirect('/verify-email');
  }

  return session.user;
}
