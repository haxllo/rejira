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

export function forgetPassword(params: { email: string; redirectTo?: string }) {
  return (authClient as unknown as Record<string, CallableFunction>).forgetPassword(params) as Promise<{ error?: { message?: string } }>;
}

export function resetPassword(params: { newPassword: string; token?: string }) {
  return authClient.resetPassword(params);
}

export { isOAuthConfigured } from './oauth-config';
