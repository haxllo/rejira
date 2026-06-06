// Phase 3 — Stream 3A: Better Auth React client.
//
// Creates a typed auth client for the browser. Client-side plugins
// mirror the server-side plugins to expose typed methods.
//
// The base path points to the Next.js API route which proxies to Convex.

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  plugins: [
    magicLinkClient(),
    twoFactorClient(),
  ],
});

export type AuthClient = typeof authClient;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  resetPassword,
} = authClient as any;

export const forgetPassword = (authClient as any).forgetPassword;
export const requestPasswordReset = (authClient as any).requestPasswordReset;

export { isOAuthConfigured } from "./oauth-config";
