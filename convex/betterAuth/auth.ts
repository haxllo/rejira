// Phase 3 — Stream 3A: Better Auth instance for the Convex component.
//
// This file declares the Better Auth configuration used by the
// Convex-resident auth server. The `npx auth generate` command
// reads this file and writes `convex/betterAuth/schema.ts` with
// the corresponding Convex validators.
//
// IMPORTANT: this file's exports are consumed by:
//   - The auth component's HTTP handlers (see `convex/http.ts`)
//   - The `npx auth generate` CLI (the `options` export)
//   - The React client (the `createAuthOptions` shape is mirrored
//     in `apps/web/lib/auth/server.ts` for server-side reads)

import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

// ─── Component client ───────────────────────────────────────
// `createClient` returns a `authComponent` object that exposes:
//   - `authComponent.adapter(ctx)` — the database adapter for use
//     in Better Auth's `database` option
//   - `authComponent.getAuthUser(ctx)` — fetch the current user
//   - `authComponent.registerRoutes(http, createAuth)` — mount
//     Better Auth's HTTP handlers on a Convex `httpRouter`
//   - `authComponent.getAuthUserId(ctx)` — return the current
//     user's _id (or null)
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

// ─── Auth options factory ───────────────────────────────────
// Better Auth needs a fresh options object per request because the
// `database` adapter is request-scoped. This factory creates one
// from a Convex ctx.
export const createAuthOptions = (
  ctx: GenericCtx<DataModel>,
): BetterAuthOptions => ({
  appName: "Rejira",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // The Convex adapter writes auth rows to the component's tables.
  database: authComponent.adapter(ctx),

  // ─── Email + password (3B) ─────────────────────────────
  // Enabled in 3B. Keep the config minimal here; 3B adds
  // `sendResetPassword` and the email verification handler.
  emailAndPassword: {
    enabled: true,
    // Don't require email verification on sign-up by default.
    // 3B flips this to `true` once the verify-email flow lands.
    requireEmailVerification: false,
    minPasswordLength: 12,
  },

  // ─── Custom user fields (Phase 2 mock data carried over) ─
  // `handle` — @-mention slug; used in URLs and notifications.
  // `avatarColor` — OKLCH color from the Phase 2 seed.
  // `status` — online | away | offline (Phase 2 model).
  // `defaultWorkspaceId` — the workspace the user lands on at
  //   sign-in. Set during the post-signup wizard (3F).
  user: {
    additionalFields: {
      handle: {
        type: "string",
        required: false,
        input: false, // server-assigned at sign-up
      },
      avatarColor: {
        type: "string",
        required: false,
        input: true, // user can pick on profile page
      },
      status: {
        type: "string",
        required: false,
        input: false, // server-managed from presence heartbeat
        defaultValue: "offline",
      },
      defaultWorkspaceId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  // ─── Session hardening (3G adds the full set) ────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // ─── Rate limiting (3G adds the full set) ────────────────
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // generous for development; 3G tightens per-route
  },

  // ─── Security defaults ───────────────────────────────────
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
    },
  },

  // ─── Plugins (each sub-phase adds more) ──────────────────
  // 3A: just the Convex plugin (required for the auth config
  // provider to validate session cookies).
  // 3B: + magicLink, emailOtp
  // 3C: + social providers via config
  // 3D: + twoFactor
  // 3E: + organization (we use it for the invite table only;
  //     we own workspaces/memberships)
  plugins: [
    convex({ authConfig }),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
});

// `options` is read by the `npx auth generate` CLI to produce
// the schema. It uses an empty ctx (the schema validator doesn't
// need a real db connection).
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// ─── Better Auth instance factory ──────────────────────────
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
