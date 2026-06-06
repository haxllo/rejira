// Phase 3 — Stream 3A: Better Auth server instance for Next.js.
//
// In server components and Route Handlers that need server-side session
// reads, use these helpers. The actual Better Auth instance runs inside
// Convex HTTP actions (see `convex/http.ts`); this file provides the
// middleware and cookie helpers for Next.js server-side.

import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";

const options = {
  appName: "Rejira",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: "/api/auth",
  plugins: [nextCookies()],
} satisfies Partial<BetterAuthOptions> & { basePath: string };

export { nextCookies };
