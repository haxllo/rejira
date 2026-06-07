import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';
import { twoFactorClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  basePath: '/api/auth',
  plugins: [
    magicLinkClient(),
    twoFactorClient(),
    organizationClient(),
  ],
});

export type AuthClient = typeof authClient;

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export const forgetPassword = authClient.forgetPassword;
export const resetPassword = authClient.resetPassword;

export { isOAuthConfigured } from './oauth-config';
