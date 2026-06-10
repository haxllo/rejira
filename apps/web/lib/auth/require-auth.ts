import 'server-only';

import { getSession } from './get-session';
import { redirect } from 'next/navigation';
import type { AuthUser } from './types';

const skipEmailVerification =
  process.env.DEV_SKIP_EMAIL_VERIFICATION === 'true' &&
  process.env.NODE_ENV !== 'production';

export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();

  if (!session) {
    redirect('/sign-in');
  }

  if (!session.user.emailVerified && !skipEmailVerification) {
    redirect('/verify-email');
  }

  return session.user;
}
