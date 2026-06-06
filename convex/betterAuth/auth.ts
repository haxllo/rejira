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
import { magicLink } from "better-auth/plugins";
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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 12,

    // 3B: Console-log emails in dev; enable Resend in production
    // via the RESEND_API_KEY Convex env var.
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email — Rejira",
        html: renderEmailTemplate("verify", { name: user.name, url }),
        text: `Verify your email: ${url}`,
      });
    },

    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password — Rejira",
        html: renderEmailTemplate("reset", { name: user.name, url }),
        text: `Reset your password: ${url}`,
      });
    },
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
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to Rejira",
          html: renderEmailTemplate("magic-link", { name: email, url }),
          text: `Sign in to Rejira: ${url}`,
        });
      },
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

// ─── 3B: Email sending helpers ─────────────────────────────

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Rejira <noreply@rejira.app>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (!res.ok) {
      console.error("[auth] Resend send failed:", await res.text());
    }
    return;
  }
  console.log(`\n${"-".repeat(50)}`);
  console.log(`[auth] EMAIL → ${payload.to}`);
  console.log(`[auth] SUBJECT: ${payload.subject}`);
  console.log(`[auth] BODY: ${payload.text.slice(0, 200)}`);
  console.log(`${"-".repeat(50)}\n`);
}

function renderEmailTemplate(
  type: "verify" | "reset" | "magic-link",
  props: { name: string; url: string },
): string {
  if (type === "verify") {
    return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Verify your email</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, click below to verify your email.</p>
      <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Verify Email</a>
    </div>`;
  }
  if (type === "magic-link") {
    return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Sign in to Rejira</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, click below to sign in instantly.</p>
      <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Sign In</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">This link expires in 5 minutes and can only be used once.</p>
    </div>`;
  }
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
    <h2 style="color:#fff;margin-top:0">Reset your password</h2>
    <p style="color:#a1a1aa">Hi ${props.name}, click below to reset your password.</p>
    <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Reset Password</a>
  </div>`;
}
