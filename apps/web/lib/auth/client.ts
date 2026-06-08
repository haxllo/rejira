import { createAuthClient } from 'better-auth/react';
import {
  magicLinkClient,
  twoFactorClient,
  organizationClient,
  genericOAuthClient,
} from 'better-auth/client/plugins';

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
    genericOAuthClient(),
  ],
});

export type AuthClient = typeof authClient;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  useActiveOrganization,
  useListOrganizations,
  useActiveMember,
} = authClient;

export const createOrganization = (authClient as unknown as Record<string, CallableFunction>).createOrganization as (params: { name: string; slug: string }) => Promise<{ data?: unknown; error?: { message?: string } }>;
export const setActiveOrganization = (authClient as unknown as Record<string, CallableFunction>).setActiveOrganization as (params: { organizationId: string }) => Promise<{ data?: unknown; error?: { message?: string } }>;

export function forgetPassword(params: { email: string; redirectTo?: string }) {
  return (authClient as unknown as Record<string, CallableFunction>).forgetPassword(params) as Promise<{ error?: { message?: string } }>;
}

export function verifyEmail(params: { query: { token: string; callbackURL?: string } }) {
  return (authClient as unknown as Record<string, CallableFunction>).verifyEmail(params) as Promise<{ data?: unknown; error?: { message?: string; statusText?: string } | null }>;
}

export function sendVerificationEmail(params: { email: string; callbackURL?: string }) {
  return (authClient as unknown as Record<string, CallableFunction>).sendVerificationEmail(params) as Promise<{ data?: { status?: boolean }; error?: { message?: string; statusText?: string } | null }>;
}

export function resetPassword(params: { newPassword: string; token?: string }) {
  return authClient.resetPassword(params);
}

export const { listAccounts, unlinkAccount } = authClient as unknown as Record<string, CallableFunction>;

export { isOAuthConfigured } from './oauth-config';
