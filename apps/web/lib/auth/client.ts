// Phase 3 — Stream 3A: Better Auth React client.
//
// Creates a typed auth client for the browser. The `api` object exposes
// typed `signIn`, `signUp`, `signOut`, and `useSession` hooks.
//
// The base path points to the Next.js API route which proxies to Convex.

import { createAuthClient } from "better-auth/react";
import type { BetterAuthOptions } from "better-auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  plugins: [],
} as BetterAuthOptions & { basePath: string });

export type AuthClient = typeof authClient;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  forgetPassword,
  resetPassword,
} = authClient;

export { isOAuthConfigured } from "./oauth-config";
