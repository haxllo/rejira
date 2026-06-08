# Phase 3 — Auth & Identity (Better Auth + Supabase)

**Status:** 📌 Ready to execute (rewritten from the Convex-era version; **production-grade**, **not minimal**)
**Owner:** opencode
**Depends on:** Phase 0 ✅, Phase 1 ✅, **Phase 2 (Supabase data layer) 📌**
**Blocks:** Phase 4 (Drizzle queries/mutations), Phase 5 (realtime), Phase 6 (AI/Storage), Phase 7 (integrations), Phase 8 (launch)

## Goal

Replace the Phase 2 demo session (`ME_ID = "u_aria"`) with a real, production-grade authentication and identity layer backed by **Better Auth** running inside Next.js, with **PostgreSQL (Supabase)** as the auth-database and the workspace-isolation enforced by **Row Level Security** at the Postgres layer. Users can sign up, sign in, manage sessions, enable 2FA, link OAuth providers, invite teammates to workspaces, and the existing UI seamlessly reads the real signed-in user instead of the demo constant. The app is closed-beta-ready at the end of this phase: invite a handful of users, they can log in, switch workspaces, and use every page — but state still doesn't persist across the database boundary (the app still reads `lib/mock/` until Phase 4). Phase 3 is the security phase: every stream ships behind a passing test suite.

**The Convex references in the previous version of this plan are removed.** There is no `ConvexHttpClient`, no `convex/auth.ts`, no `convex/_lib/auth_helpers.ts`, no `getAuthUserId(ctx)`, no `convex/memberships.ts`, no `convex/crons.ts`, no `convex/_tests/`, and no `convex:test`. Auth lives in Next.js (`apps/web/lib/auth/`) and reads/writes Postgres via Drizzle/Supabase.

---

## Why this pivot

The previous version of this plan treated Better Auth as a third-party app calling into Convex. That worked, but it put Better Auth one network hop away from the data. The new architecture puts Better Auth **inside the Next.js process** and points it at the **same Postgres database** (Supabase) that the app uses, via `pg.Pool`. Benefits:

- **One database, one migration story.** Better Auth's tables (managed via `@better-auth/cli generate`) and the app's tables (managed via Drizzle) both live in the same Supabase Postgres. The same `supabase db push` applies both.
- **RLS as the primary tenancy boundary.** The Phase 2 RLS policies read `auth.jwt() ->> 'sub'`, which is exactly the field Better Auth sets on session JWTs. We get multi-tenant isolation enforced at the DB level — independent of the app's query helpers.
- **No Convex functions to maintain for auth.** Better Auth's official Postgres adapter handles the CRUD.
- **Faster iteration.** No deployment of a separate auth service; auth changes ship in the same Vercel deploy as the app.

---

## Architecture decisions (locked before 3A)

| # | Decision | Rationale |
| --- | --- | --- |
| AD-1 | **Use Better Auth core + the `organization` plugin**, mapping the plugin's tables to our existing `workspaces` / `memberships` / `invitations` tables | The previous version of this plan chose "custom workspace tables" to avoid duplication. The pivot to Supabase removes that rationale: we can configure Better Auth's organization plugin to use our table names (`organization.modelName: "workspaces"`, `member.modelName: "memberships"`, `invitation.modelName: "invitations"`). We get a battle-tested invite flow and member management; we keep our schema. |
| AD-2 | **Better Auth tables use Better Auth's default names** (`user`, `session`, `account`, `verification`, `twoFactor`, plus the org plugin's `workspaces`, `memberships`, `invitations`, `teams`) | Matches Better Auth docs verbatim for the core tables. The org plugin's tables get our names via plugin config. |
| AD-3 | **Keep the Phase 2 `users` mirror table**; trigger from 2E syncs it from `auth.user` on insert/update | The app queries `public.users` (Drizzle-managed). Better Auth's `auth.user` is the source of truth for identity; the trigger keeps the mirror in sync. No denormalization at the app layer. |
| AD-4 | **Better Auth server runs inside Next.js** at `apps/web/app/api/auth/[...all]/route.ts`; uses `pg.Pool` against Supabase's session-mode pooler (`DATABASE_URL_SESSION`) | Better Auth needs long-lived prepared statements; session-mode pooler preserves them. The app uses transaction-mode pooler (`DATABASE_URL`) for short queries. Migrations use `DIRECT_URL` (never pooled). |
| AD-5 | **All foreign keys into the user table reference `public.users.id` (BIGINT)**; Better Auth's `auth.user.id` (TEXT) is bridged via the mirror trigger | Keeps the app's FKs as `BIGINT`. The trigger writes `public.users.id` from `auth.user.id` (TEXT → BIGINT cast in the trigger). |
| AD-6 | **Email transport: Resend for prod, Inbucket for local dev (via Supabase CLI)**; a `ConsoleTransport` fallback when neither is configured | No third-party account required to develop locally (Inbucket catches everything). Production switches via `RESEND_API_KEY`. |
| AD-7 | **2FA is optional per user**; a per-workspace "require 2FA for admins" toggle lands in 3Q | Linear matches this. SOC2 customers can enable the toggle. |
| AD-8 | **Account deletion has a 30-day grace period** via a `pg_cron` job (scheduled in 2I) | User clicks "Delete account" → soft-delete (anonymize PII in `auth.user` + `public.users` mirror), set `scheduled_hard_delete_at = now() + 30 days`. The pg_cron job from 2I hard-deletes users whose `scheduled_hard_delete_at < now()`. |
| AD-9 | **Workspace switcher in the sidebar (TopBar), not a separate page** | Linear pattern. URL uses `?w=acme` for deep-linkability (already wired in Phase 1). The active workspace lives in the session and the URL is the canonical truth. |
| AD-10 | **Sign-in is a page (`/sign-in`) for unauthenticated users; a modal for switching accounts while signed in** | The app is unreachable when not signed in (middleware). Once signed in, "Switch account" opens a modal. |
| AD-11 | **Workspaces are team-only in Phase 3**; personal workspaces are deferred to post-MVP | Linear has both, but personal workspaces double the test surface area. Defer to Phase 3.5 if requested. |
| AD-12 | **The dev seed keeps `u_aria` as the "demo owner"** with `emailVerified: true` and a known password (`password-demo`) | Lets the existing UI keep working during the migration window (3A–3I). Production seed (3N) removes this hard-coding. |
| AD-13 | **Rate limiting uses Upstash Redis (prod) + in-memory fallback (dev)** | In-memory is fine for a single-instance dev; Redis is required for multi-instance prod. The same interface abstracts both. |
| AD-14 | **All Better Auth JWTs carry the `sub` claim as the user's `external_id`** | Phase 2 RLS functions read `auth.jwt() ->> 'sub'`. Better Auth's `jwt` plugin (or default session JWT) is configured to set `sub` to `users.external_id`. |
| AD-15 | **Sessions are stored in Postgres, not in client cookies** | Client cookies hold only the session token (httpOnly, secure, sameSite=lax, `__Host-` prefix in prod). The session row in `auth.session` is the source of truth; revocation is immediate. |
| AD-16 | **Passkeys (WebAuthn) are supported in 3K**; SAML SSO is deferred to Phase 8 | Modern B2B SaaS needs passkeys; Better Auth's passkey plugin adds ~150 lines. SAML SSO is its own beast (IdP discovery, metadata XML, ACS endpoints) and lands in Phase 8's enterprise readiness. |
| AD-17 | **Audit log writes happen via Better Auth's `databaseHooks.user.create.after` / `.update.after`**, not from app code | The auth event lives in the same transaction as the user mutation. There's no window where the user exists but the audit row doesn't. The hook writes to the `audit_log` table from 2C. |

---

## Stack lock-in (the auth layer)

| Concern | Tool | Notes |
|---|---|---|
| Auth framework | **Better Auth 1.x** (`better-auth`) | TypeScript-first, plugin-based, runs in any Node.js process |
| Auth HTTP handler | **Next.js App Router catch-all** | `app/api/auth/[...all]/route.ts` |
| Auth DB driver | **pg.Pool → Supabase Postgres** | session-mode pooler (`DATABASE_URL_SESSION`) |
| Auth tables | Better Auth's defaults: `user`, `session`, `account`, `verification`, `twoFactor` | Managed via `@better-auth/cli generate` |
| Workspace tables | Better Auth `organization` plugin → our `workspaces` / `memberships` / `invitations` / `teams` | Plugin config maps the table names |
| Email | **Resend** (prod) + **Inbucket** (local via Supabase CLI) + **ConsoleTransport** (no-config fallback) | React Email templates |
| OAuth | **Google** + **GitHub** (3C) + **Microsoft** (3C stretch) | Provider configs in `apps/web/lib/auth/oauth-config.ts` |
| 2FA | **Better Auth `twoFactor` plugin** | TOTP + 10 backup codes, hashed at rest |
| Passkeys | **Better Auth `passkey` plugin** (3K) | WebAuthn, discoverable credentials |
| Rate limit | **Upstash Redis** (prod) + **in-memory** (dev) | Per-endpoint, per-IP, per-email |
| Session store | Postgres `auth.session` rows | Cookie cache (JWE, 5 min) for fast RSC reads |
| Password hashing | **scrypt** (Better Auth default) | Configurable cost factor |
| Email verification | Email link + 24h expiry | Required for sensitive workspaces (deferred to 3Q) |
| Anomaly detection | IP/UA hash + new-device email | 3G |
| Audit log | **`public.audit_log`** table from 2C | Written via Better Auth database hooks |
| GDPR delete | soft-delete + 30-day pg_cron hard-delete | 2I scheduled the job |
| Data export | async job → CSV/JSON in Storage | 3G |

---

## Sub-phases

```
3A ─── Better Auth core + Supabase adapter + schema migration
        │   (auth tables, getSession, swap ME_ID, typecheck)
        ▼
3B ─── Email/password + email verification + password reset
        │   (Resend, React Email, /sign-in /sign-up, Inbucket local)
        ▼
3C ─── Magic link + OAuth (Google, GitHub) + account linking
        │   (mockable OAuth for tests, new-device email)
        ▼
3D ─── Sessions + session list + device tracking
        │   (cookie cache, expiry, refresh, sign-out-all, IP/UA hash)
        ▼
3E ─── Two-factor (TOTP) + backup codes
        │   (enrollment, recovery, session list interaction, lockout)
        ▼
3F ─── Organization plugin (workspaces) + memberships
        │   (org plugin → workspaces/memberships/invitations tables)
        ▼
3G ─── Member invitations + role management
        │   (invite by email, link invites, expiry, role changes, bulk invite)
        ▼
3H ─── Onboarding + workspace creation + switcher
        │   (post-signup wizard, useWorkspace hook, default ws, archive)
        ▼
3I ─── Account settings UI
        │   (profile, email change, password, sessions, 2FA, delete)
        ▼
3J ─── Production hardening: rate limit, breach check, password policy
        │   (per-endpoint, HIBP, zxcvbn, audit log, GDPR delete)
        ▼
3K ─── Passkeys (WebAuthn) + observability
        │   (Sentry, PostHog, SPF/DKIM/DMARC, bounce handling)
        ▼
3L ─── App integration: swap demo session → real auth
        │   (middleware, useSession, RequireAuth, RSC plumbing)
        ▼
3M ─── Internationalization + accessibility
        │   (i18n, keyboard-only, axe-core, email locales)
        ▼
3N ─── First-pass deploy (Vercel + Supabase prod + env promotion)
        │   (production project, secrets, smoke tests)
        ▼
3O ─── Test suite: Vitest unit + Playwright E2E for all flows
        ▼
3P ─── SECURITY: security headers, CSP, dependency audit, pen-test
        ▼
3Q ─── Per-workspace security policy (require 2FA for admins, etc.)
```

Each sub-phase ends with **explicit verification commands** that must all exit 0 before the next starts:

```bash
npm run typecheck          # TypeScript clean
npm run lint               # Biome clean
npm run build              # Next.js production build
npm run db:test            # Drizzle + RLS + auth tests (Supabase local)
npm run test:e2e           # Playwright E2E suite (added progressively)
npm run test:a11y          # axe-core + keyboard walkthrough (3M)
```

Sub-phases 3A–3L ship in this session order. 3M, 3N, 3O, 3P, 3Q are flagged as parallelizable in a small team.

---

## 3A — Better Auth core + Supabase adapter + schema migration

**Files to create:**
- `apps/web/lib/auth/server.ts` — Better Auth server instance (the `betterAuth({...})` config)
- `apps/web/lib/auth/client.ts` — Better Auth React client (`createAuthClient`)
- `apps/web/lib/auth/email.ts` — email/password helpers (re-export from server)
- `apps/web/lib/auth/types.ts` — session/user TypeScript types (inferred from server)
- `apps/web/lib/auth/index.ts` — public re-exports
- `apps/web/lib/auth/get-session.ts` — server-side `getSession()` for RSC + server actions
- `apps/web/lib/auth/require-auth.ts` — `requireAuth()` HOC for RSC and server actions
- `apps/web/app/api/auth/[...all]/route.ts` — Better Auth HTTP handler
- `apps/web/lib/db/_tests/auth.test.ts` — auth tests

**Files to edit:**
- `drizzle.config.ts` — add Better Auth's `auth.*` tables to the schema filter
- `supabase/config.toml` — confirm `auth.*` schema is in the migration path
- `apps/web/lib/auth/server.ts` — pg.Pool config uses `DATABASE_URL_SESSION`
- `apps/web/lib/auth/types.ts` — types inferred from `typeof auth.$Infer`
- `apps/web/lib/auth/demo-session.ts` — **delete**
- `apps/web/lib/mock/users.ts` — keep USERS data; add a comment marking it as dev-only fixtures. The `ME_ID` re-export is deleted.
- `package.json` — add `better-auth`, `pg` (peer), `@better-auth/cli` (dev)
- `.env.example` (root + `apps/web/`) — add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL_SESSION`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_CLIENT_ID`/`SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**`betterAuth({...})` config (the core):**

```ts
// apps/web/lib/auth/server.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { emailAndPassword } from "better-auth/plugins/email-and-password";
import { magicLink } from "better-auth/plugins/magic-link";
import { twoFactor } from "better-auth/plugins/two-factor";
import { organization } from "better-auth/plugins/organization";
import { passkey } from "better-auth/plugins/passkey";        // 3K
import { admin } from "better-auth/plugins/admin";            // 3F
import { jwt } from "better-auth/plugins/jwt";                // for RLS

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_SESSION!,
  max: 10,
  ssl: { rejectUnauthorized: false },
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,  // 24h
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,    // 7 days
    updateAge: 60 * 60 * 24,         // 1 day — refresh if older
    cookieCache: { enabled: true, maxAge: 60 * 5 },  // 5-min JWE
    freshAge: 60 * 60,               // 1h — sensitive ops need fresh session
  },
  user: {
    additionalFields: {
      avatarUrl: { type: "string", required: false },
      avatarColor: { type: "string", required: false, defaultValue: "neutral" },
      status: { type: "string", required: false, defaultValue: "active" },
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, template: "magic-link", data: { url } });
      },
      expiresIn: 60 * 15,  // 15 min
    }),
    twoFactor({
      issuer: "rejira",
      otpOptions: { digits: 6, period: 30 },
      backupCodeOptions: { length: 10, customBackupCodesGenerate: undefined },
      totpOptions: { digits: 6, period: 30 },
    }),
    organization({
      // Map plugin tables to our schema
      schema: {
        organization: { modelName: "workspaces" },
        member:        { modelName: "memberships" },
        invitation:    { modelName: "invitations" },
        team:          { modelName: "teams" },
      },
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      invitationExpiresIn: 60 * 60 * 24 * 7,  // 7 days
      sendInvitationEmail: async ({ email, invitation }) => {
        await sendEmail({ to: email, template: "workspace-invite", data: { ...invitation } });
      },
    }),
    admin(),         // 3F — admin plugin (impersonation, ban)
    jwt(),           // for RLS to read auth.jwt() ->> 'sub'
    passkey(),       // 3K
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  advanced: {
    cookiePrefix: "rejira",
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax", httpOnly: true, secure: true },
  },
  rateLimit: {
    enabled: true,
    storage: "database",  // Better Auth uses the auth.rate_limit table; we override with Redis in 3J
    window: 60,           // 1 minute
    max: 30,              // 30 reqs/window per IP
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Mirror row to public.users is created by the DB trigger in 2E-7.
          // This hook writes the audit_log entry in the same transaction.
          await db.insert(auditLog).values({
            actorId: user.id,
            actorWorkspaceId: null,
            event: "auth_signup",
            metadata: { email: user.email },
          });
        },
      },
    },
  },
  onAPIError: { throw: true },
});
```

**Tests added in 3A (15 tests in `apps/web/lib/auth/_tests/auth.test.ts`):**
1. `getSession` returns the user when a valid session token is in the request
2. `getSession` returns `null` when no session token
3. `requireAuth` throws a redirect to `/sign-in?next=...` for unauthenticated calls
4. `requireAuth` throws a redirect to `/verify-email` for unverified emails
5. `requireAuth` returns the user for verified sessions
6. The Better Auth sign-up creates a row in `auth.user`, `auth.account`
7. The Better Auth sign-up creates a mirror row in `public.users` (via DB trigger)
8. The Better Auth sign-up writes an `audit_log` row with `event = "auth_signup"`
9. The Better Auth sign-in validates the password hash correctly
10. Sessions expire after their TTL (mock the clock)
11. Sessions are bound to a user agent + IP hash (configurable; default: bound)
12. `request.jwt.claims` in RLS is set to `sub = user.external_id` after sign-in
13. RLS test: a user in workspace X cannot see workspace Y's data (the RLS functions in 2D read `auth.jwt() ->> 'sub'`)
14. The `public.users` mirror trigger fires on `auth.user` insert
15. The `public.users` mirror trigger updates on `auth.user` update (email change reflected in mirror)

**Verification at end of 3A:**
```bash
npm run typecheck                                    # must exit 0
npm run lint                                         # must exit 0
npm run build                                        # must exit 0
npm run db:test                                      # 8 RLS tests + 15 auth tests = 23 tests must pass
npm run db:lint                                      # must exit 0 (schema drift check)
```

---

## 3B — Email/password + email verification + password reset

**Why:** Email/password is the table-stakes auth method. Both sign-up confirmation and password reset must work end-to-end with real emails.

**Files to create:**
- `apps/web/lib/email/transport.ts` — Resend + Inbucket + Console transports (env-driven)
- `apps/web/lib/email/render.ts` — renders React Email to HTML + plaintext
- `apps/web/lib/email/templates/` — React Email components:
  - `welcome.tsx`
  - `verify-email.tsx`
  - `reset-password.tsx`
  - `password-changed.tsx`
  - `email-changed.tsx`
  - `new-device.tsx` (used in 3D)
- `apps/web/lib/email/i18n.ts` — locale-aware template picker (3M)
- `apps/web/app/(auth)/sign-in/page.tsx` — sign-in form
- `apps/web/app/(auth)/sign-up/page.tsx` — sign-up form
- `apps/web/app/(auth)/forgot-password/page.tsx` — request reset
- `apps/web/app/(auth)/reset-password/page.tsx` — set new password
- `apps/web/app/(auth)/verify-email/page.tsx` — verify email handler
- `apps/web/app/(auth)/check-email/page.tsx` — "check your email" landing
- `apps/web/app/(auth)/layout.tsx` — auth layout (centered, dark, branded)
- `apps/web/components/auth/sign-in-form.tsx`
- `apps/web/components/auth/sign-up-form.tsx`
- `apps/web/components/auth/forgot-password-form.tsx`
- `apps/web/components/auth/reset-password-form.tsx`
- `apps/web/components/auth/oauth-buttons.tsx` (used in 3C)
- `apps/web/components/auth/auth-shell.tsx` — the centered dark container
- `apps/web/lib/auth/password-policy.ts` — zxcvbn-style strength check (12+ chars, top-1000 blocklist, common patterns)
- `apps/web/lib/auth/breach-check.ts` — HaveIBeenPwned k-anonymity API client

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register `sendEmail` plugin callback; wire `password-policy` and `breach-check` hooks
- `apps/web/lib/auth/client.ts` — expose `signIn.email`, `signUp.email`, `forgetPassword`, `resetPassword`, `verifyEmail`
- `apps/web/app/globals.css` — add `.auth-shell` styles
- `package.json` — add `resend`, `@react-email/components`, `react-email`, `zxcvbn`, `node-fetch` (for HIBP)

**Tests added in 3B (12 unit tests in `apps/web/lib/auth/_tests/email.test.ts`):**
1. Sign-up sends a `verify-email` email (captured via Inbucket/ConsoleTransport)
2. Clicking the verify link marks the user as verified and signs them in
3. Sign-up blocks the session if `requireEmailVerification: true` and email is unverified
4. Forgot password sends a `reset-password` email
5. Reset link sets a new password and revokes all other sessions
6. Reset link is single-use (second click throws)
7. Reset link expires after 1 hour
8. Welcome email is sent on first sign-up (idempotent — second sign-up doesn't re-send)
9. Password change sends a `password-changed` email
10. Password below 12 chars is rejected
11. Password in HIBP top-1000 is rejected (mocked)
12. Password matching common patterns (`qwerty`, `password123`, etc.) is rejected

**E2E tests added in 3B (in `e2e/auth/`):**
- `sign-up.spec.ts` (3 tests): new user can sign up; sign-up redirects to `/check-email`; clicking the verify link signs the user in
- `sign-in.spec.ts` (3 tests): existing user can sign in; wrong password shows a generic error; sign-in with unverified email shows a "verify your email" message
- `forgot-password.spec.ts` (3 tests): user requests a reset; email is captured; reset form accepts the new password; old password no longer works

**Verification at end of 3B:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 23 + 12 = 35 tests
npm run test:e2e -- --grep "sign-up|sign-in|forgot"  # 9 E2E tests
```

---

## 3C — Magic link + OAuth (Google, GitHub) + account linking

**Why:** B2B users expect to sign in with Google (workspace-bound identity) or GitHub (developer audience). Account linking prevents the "duplicate account" problem when an email/password user later tries Google with the same email.

**Files to create:**
- `apps/web/lib/auth/oauth-config.ts` — provider configs (Google, GitHub, Microsoft stretch)
- `apps/web/lib/auth/account-linking.ts` — link-by-email logic
- `apps/web/components/auth/magic-link-form.tsx`
- `apps/web/lib/email/templates/magic-link.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register `magicLink` and OAuth providers
- `apps/web/lib/auth/client.ts` — expose `signIn.social`, `signIn.magicLink`
- `apps/web/components/auth/oauth-buttons.tsx` — wire up the providers
- `apps/web/components/auth/sign-in-form.tsx` — add the magic-link tab

**Tests added in 3C (10 unit tests in `apps/web/lib/auth/_tests/oauth.test.ts`):**
1. Magic link sign-in sends a `magic-link` email with a one-time token
2. Clicking the magic link creates a session
3. Magic link tokens are single-use
4. Magic link tokens expire after 15 minutes
5. New Google OAuth sign-up creates `auth.user` + `auth.account` with `providerId: "google"`
6. New GitHub OAuth sign-up creates `auth.user` + `auth.account` with `providerId: "github"`
7. OAuth sign-up with email matching an existing user links the `account` to the existing `user` (no duplicate)
8. OAuth sign-up with an unverified email is rejected if `requireEmailVerification: true`
9. The `auth.account` row stores `accessToken` and `refreshToken` (encrypted at rest)
10. Revoking an OAuth provider disconnects it (does not delete the user)

**E2E tests added in 3C (in `e2e/auth/`):**
- `magic-link.spec.ts` (3 tests): user requests a magic link; email is captured; clicking the magic link signs them in
- `google.spec.ts` (2 tests, uses `playwright-msw` to mock Google): new user can sign in with Google; existing email-password user can link Google
- `github.spec.ts` (2 tests, uses `playwright-msw` to mock GitHub): new user can sign in with GitHub; existing GitHub user is auto-signed in

**Verification at end of 3C:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 35 + 10 = 45 tests
npm run test:e2e -- --grep "magic|oauth|google|github"  # 7 E2E tests
```

---

## 3D — Sessions + session list + device tracking

**Why:** Users need to see who's logged in and revoke sessions. New-device emails catch hijacking.

**Files to create:**
- `apps/web/lib/auth/session-binding.ts` — IP hash + UA hash helpers
- `apps/web/lib/auth/session-list.ts` — query + revoke logic
- `apps/web/components/settings/sessions-list.tsx`
- `apps/web/lib/email/templates/new-device.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — wire session hooks (IP/UA capture, new-device email)
- `apps/web/components/auth/sign-in-form.tsx` — show "new device" warning on sign-in from unfamiliar IP/UA

**Tests added in 3D (8 unit tests in `apps/web/lib/auth/_tests/sessions.test.ts`):**
1. Session creation captures IP hash and UA hash
2. Session refresh extends expiry (1-day rolling window)
3. `cookieCache` returns a JWE in < 5ms (no DB hit)
4. `signOut` revokes the current session only
5. `signOutAll` revokes all sessions for the user
6. Signing in from a new IP/UA sends a `new-device` email
7. Sessions list shows last-active, IP-hash (last 4 chars), UA (browser, OS)
8. Revoking a session from the list signs out that device immediately

**E2E tests added in 3D (in `e2e/auth/`):**
- `sessions.spec.ts` (4 tests): user can view active sessions; user can revoke a single session; user can sign out all sessions; sign-in from a new IP/UA triggers a `new-device` email

**Verification at end of 3D:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 45 + 8 = 53 tests
npm run test:e2e -- --grep "session|sign-out"       # 4 E2E tests
```

---

## 3E — Two-factor (TOTP) + backup codes

**Why:** B2B customers require 2FA for admins (SOC2). Even non-2FA users benefit from a session list (3D) — but 2FA is the next escalation.

**Files to create:**
- `apps/web/lib/auth/two-factor.ts` — TOTP enrollment helpers
- `apps/web/lib/auth/backup-codes.ts` — generate + verify
- `apps/web/app/(auth)/two-factor/page.tsx` — challenge form
- `apps/web/app/(auth)/two-factor/setup/page.tsx` — QR + secret
- `apps/web/app/(auth)/two-factor/backup-codes/page.tsx`
- `apps/web/components/auth/two-factor-form.tsx`
- `apps/web/components/auth/two-factor-setup.tsx`
- `apps/web/components/auth/backup-codes-display.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register the `twoFactor` plugin (already in 3A config; this stream adds the UI)
- `apps/web/components/auth/sign-in-form.tsx` — handle the 2FA challenge redirect
- `apps/web/app/(auth)/sign-in/page.tsx` — detect 2FA requirement and redirect

**Tests added in 3E (10 unit tests in `apps/web/lib/auth/_tests/two-factor.test.ts`):**
1. TOTP enrollment returns a TOTP URI + secret
2. The first TOTP code after enrollment confirms the setup
3. After 2FA is on, sign-in requires a TOTP code (or backup code)
4. Wrong TOTP code 3 times locks the account for 15 minutes
5. Backup codes are 10 one-time-use codes, each ~22 chars, hashed at rest
6. Used backup codes cannot be reused
7. Regenerating backup codes invalidates the old set
8. Disabling 2FA requires a fresh TOTP code
9. Sign-in flow is: password → (optional 2FA challenge) → session
10. 2FA events write `audit_log` rows (`two_factor_enabled`, `two_factor_disabled`, `two_factor_backup_code_used`)

**E2E tests added in 3E (in `e2e/auth/`):**
- `two-factor.spec.ts` (4 tests): user can enroll 2FA from settings; next sign-in prompts for 2FA; user can use a backup code to sign in; user can disable 2FA

**Verification at end of 3E:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 53 + 10 = 63 tests
npm run test:e2e -- --grep "two-factor"             # 4 E2E tests
```

---

## 3F — Organization plugin (workspaces) + memberships

**Why:** This is the "first class" workspace model. The org plugin's tables ARE our `workspaces` / `memberships` / `invitations` / `teams` tables (per AD-1).

**Files to create:**
- `apps/web/lib/auth/workspace-helpers.ts` — Drizzle queries that read from the org plugin's tables
- `apps/web/lib/auth/workspace-types.ts` — type re-exports from Better Auth
- `apps/web/hooks/useWorkspaceList.ts`
- `apps/web/hooks/useMembership.ts`
- `apps/web/components/team/workspace-switcher.tsx`
- `apps/web/components/team/create-workspace-modal.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — confirm `organization` plugin config from 3A; add `admin` plugin for impersonation/ban
- `apps/web/lib/auth/client.ts` — expose `organization.*` (create, list, switch, setActive, etc.)
- `apps/web/app/(workspace)/layout.tsx` — read the active workspace from Better Auth's `useActiveOrganization` (stored in session)
- `supabase/migrations/0003_rls_policies.sql` (from Phase 2) — confirm `workspaces` and `memberships` policies use the org plugin's `current_workspace_ids()` function

**Tests added in 3F (12 unit tests in `apps/web/lib/auth/_tests/workspaces.test.ts`):**
1. New user (post-signup) gets a personal workspace auto-created by the org plugin
2. The personal workspace's `ownerId` is the new user's `auth.user.id`
3. `workspaces` row is mirrored to `public.workspaces` view (or queryable via Drizzle)
4. User can create additional workspaces via `auth.api.createOrganization`
5. Workspace slug is unique
6. User can list workspaces they belong to
7. User can set the active workspace (stored in session)
8. Setting a default workspace updates the user's `defaultWorkspaceId`
9. Cross-workspace data isolation still works (RLS from 2D)
10. The `useWorkspace` hook falls back to the default when no `?w=` is set
11. A user can only see workspaces they're a member of
12. Workspaces with `archivedAt` set are excluded from the active list

**Verification at end of 3F:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 63 + 12 = 75 tests
```

---

## 3G — Member invitations + role management

**Why:** A single-user app is not a Jira replacement. Invites drive adoption.

**Files to create:**
- `apps/web/lib/auth/invites.ts` — token generation, expiry, hashing (wraps Better Auth's invitation flow)
- `apps/web/components/team/workspace-invite-form.tsx`
- `apps/web/components/team/workspace-members-table.tsx`
- `apps/web/components/team/workspace-invites-table.tsx`
- `apps/web/components/team/role-select.tsx`
- `apps/web/app/(workspace)/settings/members/page.tsx` — member list, invite form, role changes
- `apps/web/app/invite/[token]/page.tsx` — accept invite handler
- `apps/web/lib/email/templates/workspace-invite.tsx`
- `apps/web/lib/email/templates/role-changed.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register `sendInvitationEmail` callback (already in 3A)
- `apps/web/lib/auth/audit.ts` — write `audit_log` rows for invite/role changes

**Tests added in 3G (12 unit tests in `apps/web/lib/auth/_tests/invites.test.ts`):**
1. Owner can invite a user by email
2. Invited user receives an email with a 256-bit token
3. Invited user clicks the link, signs up (or signs in), and lands in the workspace
4. The `invitations` row is marked `acceptedAt` and a `memberships` row is created
5. Invite tokens expire after 7 days
6. Revoking an invite prevents acceptance
7. Bulk invite (CSV upload) creates N invitation rows
8. Resend invite rotates the token
9. An owner cannot demote themselves
10. An owner cannot remove themselves (must transfer ownership first)
11. An admin can change member roles but cannot promote to owner
12. Role change writes an `audit_log` row

**E2E tests added in 3G (in `e2e/team/`):**
- `invite.spec.ts` (3 tests): owner invites a new email; invitee clicks the link, signs up, and lands in the workspace; invitee appears in the members table

**Verification at end of 3G:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 75 + 12 = 87 tests
npm run test:e2e -- --grep "invite"                 # 3 E2E tests
```

---

## 3H — Onboarding + workspace creation + switcher

**Why:** New users need a frictionless first 60 seconds. The Phase 1 `?w=acme` URL is a hack — replace it with a real switcher and a post-signup wizard.

**Files to create:**
- `apps/web/components/onboarding/workspace-setup-wizard.tsx`
- `apps/web/components/onboarding/step-welcome.tsx`
- `apps/web/components/onboarding/step-create-workspace.tsx`
- `apps/web/components/onboarding/step-invite-team.tsx`
- `apps/web/components/onboarding/step-create-project.tsx`
- `apps/web/components/onboarding/step-done.tsx`
- `apps/web/hooks/useWorkspace.ts` — replaces `?w=` parsing
- `apps/web/hooks/useDefaultWorkspace.ts`
- `apps/web/app/(workspace)/onboarding/page.tsx` — post-signup wizard

**Files to edit:**
- `apps/web/app/(workspace)/layout.tsx` — read `useWorkspace()` from `?w=` OR the user's default
- `apps/web/components/team/workspace-switcher.tsx` — replaces the Phase 1 `?w=` switcher

**Tests added in 3H (8 unit tests in `apps/web/lib/auth/_tests/onboarding.test.ts`):**
1. New user lands on `/onboarding` after first sign-in
2. Onboarding is skipped if the user already has a workspace
3. Workspace slug is editable in the wizard; uniqueness is enforced
4. Inviting teammates from the wizard creates pending invitations
5. Creating a first project from the wizard is optional (skippable)
6. The `useWorkspace` hook falls back to the default when no `?w=` is set
7. Switching workspaces updates the URL `?w=slug`
8. Reloading the page keeps the active workspace

**E2E tests added in 3H (in `e2e/onboarding/` and `e2e/team/`):**
- `new-user.spec.ts` (3 tests): new user signs up; lands on the wizard; creates the first workspace; lands on the home view
- `switcher.spec.ts` (2 tests): user with 2 workspaces sees both; clicking navigates with `?w=slug` set; reloading keeps the active workspace

**Verification at end of 3H:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 87 + 8 = 95 tests
npm run test:e2e -- --grep "onboarding|switcher"    # 5 E2E tests
```

---

## 3I — Account settings UI

**Why:** Users need a place to change their name, email, password, manage sessions, and configure 2FA. This is also where the GDPR export and deletion live.

**Files to create:**
- `apps/web/app/(workspace)/settings/account/page.tsx` — main settings page
- `apps/web/app/(workspace)/settings/account/profile/page.tsx`
- `apps/web/app/(workspace)/settings/account/security/page.tsx` — password, 2FA
- `apps/web/app/(workspace)/settings/account/sessions/page.tsx` — active sessions
- `apps/web/app/(workspace)/settings/account/data/page.tsx` — export, delete
- `apps/web/app/(workspace)/settings/account/notifications/page.tsx`
- `apps/web/components/settings/profile-form.tsx`
- `apps/web/components/settings/password-form.tsx`
- `apps/web/components/settings/email-form.tsx`
- `apps/web/components/settings/sessions-list.tsx` (reuses 3D)
- `apps/web/components/settings/two-factor-settings.tsx` (reuses 3E)
- `apps/web/components/settings/data-export-button.tsx`
- `apps/web/components/settings/delete-account-button.tsx` (with confirmation modal)

**Files to edit:**
- `apps/web/app/(workspace)/settings/page.tsx` — add navigation cards for the new sub-pages

**Tests added in 3I (8 unit tests in `apps/web/lib/auth/_tests/settings.test.ts`):**
1. Profile update writes a new `name` and `image`
2. Email change creates a pending change with a verification token; both emails must confirm
3. Password change requires the old password
4. Password change invalidates other sessions (configurable: "sign out other devices")
5. Sessions list shows last-active, IP-hash, UA-hash
6. Revoking a session signs out that device
7. Revoking all sessions signs out every device
8. 2FA toggle writes `audit_log` rows

**E2E tests added in 3I (in `e2e/settings/`):**
- `profile.spec.ts` (2 tests): user can update name and avatar color
- `security.spec.ts` (3 tests): user can change password; user can enable 2FA; user can view active sessions; user can revoke a session
- `data.spec.ts` (2 tests): user can request a data export; user can delete the account (with confirmation)

**Verification at end of 3I:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 95 + 8 = 103 tests
npm run test:e2e -- --grep "settings"               # 7 E2E tests
```

---

## 3J — Production hardening: rate limit, breach check, password policy, audit log, GDPR delete

**Why:** This is what separates a demo from a product. B2B customers will not sign a contract without rate limiting, breach checks, audit logs, and GDPR deletion.

**Files to create:**
- `apps/web/lib/auth/rate-limit.ts` — Upstash Redis (prod) + in-memory (dev) wrapper
- `apps/web/lib/auth/breach-check.ts` — HaveIBeenPwned k-anonymity API client (called from 3B; this is the rate-limited wrapper)
- `apps/web/lib/auth/password-policy.ts` — zxcvbn-style strength check (called from 3B; this is the policy module)
- `apps/web/lib/auth/audit.ts` — emits `audit_log` rows for all auth events (signup, signin, signout, password change, email change, 2FA events, account deletion)
- `apps/web/lib/auth/account-deletion.ts` — soft-delete (anonymize PII) + schedule hard-delete in 30 days
- `apps/web/lib/auth/data-export.ts` — GDPR data export (returns a JSON file, archived to Storage)
- `apps/web/lib/auth/anomaly-detection.ts` — IP/UA hash + new-device email (3D uses this)
- `supabase/migrations/0018_hard_delete_cron.sql` — function body for the 2I cron job
- `supabase/migrations/0019_session_cleanup.sql` — function to prune expired sessions and verification tokens nightly

**Files to edit:**
- `apps/web/lib/auth/server.ts` — wire rate-limit hooks, breach-check on sign-up, password-policy on sign-up, audit hooks on every event
- `.env.example` — add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `HIBP_API_KEY` (optional)
- `supabase/migrations/0017_cron_jobs.sql` (from 2I) — replace the placeholder function bodies

**Rate limit policy (per endpoint):**
| Endpoint | Window | Max | Notes |
|---|---|---|---|
| `POST /api/auth/sign-in/email` | 5 min | 5 per email, 20 per IP | Wrong password counter |
| `POST /api/auth/sign-up/email` | 1 hour | 5 per IP | Spam guard |
| `POST /api/auth/forget-password` | 1 hour | 3 per email | Reset spam |
| `POST /api/auth/magic-link/send` | 1 hour | 5 per email | Magic-link spam |
| `POST /api/auth/sign-in/social` | 1 hour | 10 per IP | OAuth abuse |
| `POST /api/auth/two-factor/verify` | 5 min | 5 per user, 20 per IP | TOTP brute force |
| `POST /api/auth/two-factor/backup-code/verify` | 5 min | 5 per user | Backup-code brute force |
| Generic | 1 min | 30 per IP | Backstop |

**Tests added in 3J (16 unit tests in `apps/web/lib/auth/_tests/hardening.test.ts`):**
1. 5 wrong passwords in 5 minutes trigger a rate-limit error
2. 5 magic-link requests in 1 hour trigger a rate-limit error
3. 3 password-reset requests in 1 hour trigger a rate-limit error
4. Sign-up with a password in the HaveIBeenPwned top-1000 is rejected
5. Sign-up with a password shorter than 12 chars is rejected
6. Sign-up with a common password (`password`, `qwerty`, etc.) is rejected
7. Account deletion soft-deletes the user (anonymizes PII) immediately
8. The user cannot sign in after soft-deletion
9. After 30 days, the user is hard-deleted (pg_cron job with clock mock)
10. Data export returns a JSON of all user-owned data (issues, comments, activities, etc.)
11. Auth events emit `audit_log` rows (sign-in, sign-out, password change, email change)
12. New IP / UA triggers a `new-device` email
13. Email change requires confirmation of both old and new email
14. Email change invalidates all sessions on the old email
15. Account deletion is reversible for 30 days (re-sign-in restores the account)
16. Rate limit backed by Redis in prod, in-memory in dev (mocked Redis)

**E2E tests added in 3J (in `e2e/hardening/`):**
- `rate-limit.spec.ts` (2 tests): 5 wrong passwords trigger a rate-limit error
- `delete-account.spec.ts` (3 tests): user clicks "Delete account"; user is signed out; user cannot sign in with the same password

**Verification at end of 3J:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 103 + 16 = 119 tests
npm run test:e2e -- --grep "rate-limit|delete"      # 5 E2E tests
```

---

## 3K — Passkeys (WebAuthn) + observability + email deliverability

**Why:** When something breaks in production, you need logs. When an email bounces, you need to know. When a user reports "I can't sign in", you need traces. Passkeys are the modern alternative to passwords.

**Files to create:**
- `apps/web/lib/auth/passkey.ts` — enrollment + sign-in helpers
- `apps/web/components/auth/passkey-enrollment.tsx`
- `apps/web/components/auth/passkey-sign-in.tsx`
- `apps/web/lib/observability/sentry.ts` — Sentry initialization (server + edge + browser)
- `apps/web/lib/observability/posthog.ts` — PostHog init (events, not pageviews)
- `apps/web/lib/observability/auth-events.ts` — emits structured events for sign-in, sign-up, sign-out, password change, email change, 2FA events, account deletion, passkey events
- `apps/web/lib/email/bounce-handler.ts` — Resend webhook handler
- `apps/web/app/api/email/webhook/route.ts` — webhook receiver
- `apps/web/lib/auth/audit-queries.ts` — admin-only query to read `audit_log` history

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register the `passkey` plugin (already in 3A config; this stream adds the UI + signing)
- `apps/web/lib/auth/server.ts` — emit events at every sign-in/sign-up/sign-out
- `apps/web/next.config.ts` — Sentry plugin
- `apps/web/components/auth/sign-in-form.tsx` — add the passkey option (prominent when the user has enrolled)
- `.env.example` — add `SENTRY_DSN`, `POSTHOG_API_KEY`, `RESEND_WEBHOOK_SECRET`

**Tests added in 3K (8 unit tests in `apps/web/lib/auth/_tests/passkey.test.ts`):**
1. Passkey enrollment returns a challenge + options
2. The challenge is verified by the authenticator
3. The passkey is stored as a credential
4. Signing in with a passkey returns a session (no password)
5. Signing in with a passkey from a new device sends a `new-device` email
6. Removing a passkey requires re-auth
7. Multiple passkeys per user are allowed (laptop, phone, YubiKey)
8. The passkey private key never leaves the device (server only stores the public key)

**Tests added in 3K (5 unit tests in `apps/web/lib/auth/_tests/observability.test.ts`):**
1. Sign-in event is emitted with `{ userId, ipHash, uaHash, timestamp }`
2. Failed sign-in event is emitted (for brute-force detection)
3. Password change event is emitted
4. Email change event is emitted with both old and new email hashes
5. Account deletion event is emitted

**Manual verification at end of 3K:**
```bash
# Email deliverability
- Send a sign-up email to a Gmail address → arrives in inbox (not spam)
- Check SPF/DKIM/DMARC pass on mail-tester.com (score ≥ 9/10)
- Send a sign-up email to an Outlook address → arrives in inbox
- Trigger a bounce → Resend webhook fires → bounce handler updates state

# Observability
- Open Sentry → no auth-related errors
- Open PostHog → sign-in events appear
- Force a sign-in failure → event appears in PostHog with the right shape

# Passkeys
- Enroll a passkey on a real device (Touch ID, Windows Hello, security key)
- Sign in with the passkey
- Sign in with a passkey from a new device → `new-device` email fires
```

**Verification at end of 3K:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 119 + 8 + 5 = 132 tests
npm run test:e2e -- --grep "passkey"                # 2 E2E tests
```

---

## 3L — App integration: swap demo session → real auth (THE CUTOVER)

**Why:** This is the cutover. The app stops reading `ME_ID` and starts reading `useSession().user`. Every business query is workspace-scoped via RLS, which now reads the real session JWT.

**Files to create:**
- `apps/web/hooks/useSession.ts` — Better Auth's `useSession` wrapper
- `apps/web/hooks/useUser.ts` — current user
- `apps/web/hooks/useMembership.ts` — current user's membership in the active workspace
- `apps/web/components/auth/require-auth.tsx` — `<RequireAuth>` wrapper
- `apps/web/components/auth/session-loading-skeleton.tsx` — Suspense fallback
- `apps/web/middleware.ts` — protect all routes except `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/auth/*`, `/invite/[token]`, `/`

**Files to edit (find/replace `ME_ID` and `ME_EXTERNAL_ID`):**
- `apps/web/lib/mock/users.ts` — `ME_ID` deleted
- `apps/web/components/**` — every `userById(ME_ID)` → `useUser().externalId`
- `apps/web/hooks/useViewQuery.ts` — uses real user for "my issues" filter
- `apps/web/components/views/issue-row.tsx` — assignee / creator lookups use real users
- `apps/web/components/inbox/inbox-item.tsx` — same
- `apps/web/app/(workspace)/layout.tsx` — `<RequireAuth>` wraps children; reads `useWorkspace()`
- `apps/web/app/(workspace)/home/page.tsx` — replaces the hard-coded "Aria" greeting
- All 8 protected pages

**Files to delete:**
- `apps/web/lib/auth/demo-session.ts`
- `apps/web/lib/mock/users.ts` `ME_ID` re-export (keep the data fixtures for tests)

**Tests added in 3L (8 unit tests in `apps/web/lib/auth/_tests/cutover.test.ts`):**
1. `requireAuth` no longer accepts the `ME_EXTERNAL_ID` lookup
2. `requireAuth` reads the session from Better Auth and looks up the user
3. `requireAuth` works for any user with a valid session
4. `requireAuth` redirects to `/sign-in?next=...` for unauthenticated calls
5. `requireAuth` returns 403 for authenticated users with no membership
6. The seed inserts a `u_aria` user via the Better Auth sign-up action
7. Every previous test that used `ME_EXTERNAL_ID` is updated to use a real session flow
8. RLS test: a user in workspace X can read workspace X's data (proves the `auth.jwt() ->> 'sub'` chain)

**E2E tests added in 3L (in `e2e/app/`):**
- `protected-routes.spec.ts` (5 tests): unauthenticated user is redirected to `/sign-in?next=/...`; after sign-in, user is redirected back to `next`; the home view shows the real user's name; the "My issues" filter uses the real user's ID; sign-out clears the session cookie and redirects to `/sign-in`

**Verification at end of 3L:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 132 + 8 = 140 tests
npm run test:e2e                                     # full E2E suite
```

**This is the cutover.** Once 3L is green, the app is fully on Better Auth. The Phase 1 demo session is gone forever.

---

## 3M — Internationalization + accessibility (parallelizable after 3L)

**Why:** Global teams need locale-aware emails and strings. B2B procurement requires WCAG 2.2 AA.

**Files to create:**
- `apps/web/lib/i18n/dictionaries/{en,es,fr,de,ja,zh}.json`
- `apps/web/lib/i18n/dict.ts` — `getDict(locale)`
- `apps/web/hooks/useLocale.ts`
- `apps/web/middleware.ts` — detect locale from `Accept-Language` header (extend the 3L middleware)
- `apps/web/lib/email/templates/_locales/{en,es,fr,de,ja,zh}.json` — email strings
- `apps/web/tests/a11y/axe.spec.ts` — Playwright + axe-core

**Files to edit:**
- All auth pages and components use `t("key")` from `useLocale()`
- `apps/web/app/layout.tsx` — `<html lang={locale}>`
- Email rendering pipeline uses the user's `locale` to pick the template strings

**Tests added in 3M (no new unit tests; only E2E):**
- `e2e/i18n/sign-in.spec.ts` — sign in works in each of 6 locales
- `e2e/a11y/auth.spec.ts` — every auth page passes axe-core WCAG 2.2 AA
- `e2e/a11y/keyboard.spec.ts` — sign-up and sign-in are keyboard-only completable

**Verification at end of 3M:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 140 (no new)
npm run test:e2e                                     # full E2E
npm run test:a11y                                    # axe + keyboard
```

---

## 3N — First-pass deploy (Vercel + Supabase prod + env promotion)

**Why:** A real product needs a real URL. The first deploy to production proves the auth flow works end-to-end against the real Supabase project, the real Resend account, the real Google/GitHub OAuth apps.

**Tasks:**
1. **Supabase prod project** — `supabase projects create rejira-prod --org muhammad-rahman --region eu-west-1 --size small`. Enable PITR (7 days; Pro for 28). Enable Branching (Pro plan).
2. **Vercel project** — connect the GitHub repo; set the production env vars (`DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL_SESSION`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `POSTHOG_API_KEY`, `RESEND_WEBHOOK_SECRET`).
3. **Migrations** — `supabase db push --project-ref <prod-ref>`. Verify all tables, RLS policies, triggers, and functions are in place.
4. **Seed prod** — `DATABASE_URL=<prod> npm run db:seed` (one-time, idempotent). Creates the demo workspace.
5. **OAuth apps** — register `https://rejira.app/api/auth/callback/google` and `https://rejira.app/api/auth/callback/github` in the Google Cloud Console and GitHub OAuth Apps. Add the client IDs/secrets to Vercel.
6. **Resend domain** — verify `rejira.app` in Resend; set SPF/DKIM/DMARC. Test a real email lands in Gmail/Outlook inboxes.
7. **Sentry** — create the project; add the DSN. Verify errors are captured.
8. **PostHog** — create the project; add the API key. Verify events are sent.
9. **Smoke tests** — sign up, sign in, invite, create an issue (with mock data still), enable 2FA, sign out. All succeed.
10. **DNS** — point `rejira.app` at Vercel. SSL via Vercel auto-cert.
11. **Monitoring** — Sentry alerts on auth failures, 2FA lockouts, rate-limit hits. PostHog weekly digest of sign-up funnels.

**Files to create / edit:**
- `docs/runbooks/prod-deploy.md` (new) — the deploy runbook
- `docs/runbooks/prod-rollback.md` (new) — rollback procedure (Vercel revert + Supabase migration down)

**Acceptance criteria:**
- `https://rejira.app` loads
- A real user can sign up, receive a verification email, verify, sign in, create a workspace, invite a teammate, enable 2FA
- The pg_cron job runs nightly and hard-deletes any accounts scheduled more than 30 days ago
- The Vercel build passes on every push to `main`
- The Supabase Branching preview env deploys on every PR

---

## 3O — Test suite consolidation

**Why:** The unit + E2E + a11y tests from 3A–3M are the foundation. This stream consolidates them into a single, fast, reliable suite that runs on every PR.

**Tasks:**
1. **Vitest** — `apps/web/vitest.config.ts` picks up all `**/_tests/*.test.ts` under `apps/web/lib/` and `apps/web/lib/db/`. Coverage target: 80% on `lib/`.
2. **Playwright** — `playwright.config.ts` configures:
   - 1 webServer per project
   - Local Supabase starts in `globalSetup`
   - 3 browsers (Chromium, Firefox, WebKit)
   - Parallelism: 4 workers
   - Retries: 1 on CI, 0 locally
   - Traces: on first retry
3. **Axe-core** — `npm run test:a11y` runs Playwright + axe-core against the 6 core auth screens.
4. **pgTAP** (Phase 2 already has RLS tests; this stream formalizes them) — `apps/web/lib/db/_tests/rls.pg` runs against the local Supabase DB.
5. **Coverage report** — `npm run test:coverage` produces an HTML report; uploaded to Codecov on CI.

**Files to create / edit:**
- `apps/web/vitest.config.ts` (new)
- `playwright.config.ts` (new)
- `apps/web/lib/db/_tests/rls.pg` (new, pgTAP tests for RLS)
- `package.json` (root) — add `test:coverage` script
- `codecov.yml` (new)

**Acceptance criteria:**
- `npm run db:test` passes 140 tests in < 30s
- `npm run test:e2e` passes ~50 tests in < 5 min
- `npm run test:a11y` passes 10 tests in < 1 min
- Coverage on `apps/web/lib/` ≥ 80%

---

## 3P — Security: headers, CSP, dependency audit, pen-test

**Why:** A SaaS app that doesn't pass a basic security review won't be in any enterprise procurement flow.

**Files to create:**
- `apps/web/middleware.ts` — adds security headers (extends the 3L middleware)
- `apps/web/next.config.ts` — `headers()` block for Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `docs/security/threat-model.md` — STRIDE-style threat model
- `docs/security/pen-test-report.md` — initial pen-test findings
- `.github/dependabot.yml` — weekly npm audit + auto-PR for patches

**Tasks:**
1. **Security headers** (set in `next.config.ts`):
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' https://*.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
2. **Dependency audit** — `npm audit` runs in CI; high/critical fail the build.
3. **Pen-test** — engage an external firm (or run a manual review) for a basic OWASP Top 10 walkthrough.
4. **Secret rotation** — `BETTER_AUTH_SECRET` rotation procedure documented; `RESEND_API_KEY`, OAuth secrets rotation procedure documented.

**Files to create / edit:**
- `apps/web/middleware.ts` (extended)
- `apps/web/next.config.ts` (extended)
- `docs/security/threat-model.md` (new)
- `docs/security/pen-test-report.md` (new)
- `.github/dependabot.yml` (new)

**Acceptance criteria:**
- `https://rejira.app` scores A+ on Mozilla Observatory
- `npm audit` is clean
- All security headers are present (verified via `securityheaders.com`)
- Threat model + pen-test report are reviewed by the team

---

## 3Q — Per-workspace security policy

**Why:** SOC2 customers require workspace-level enforcement. "All admins in this workspace must have 2FA" is a real requirement.

**Files to create:**
- `supabase/migrations/0021_workspace_security_policy.sql` — `workspace_security_policy` table + RLS
- `apps/web/lib/auth/workspace-policy.ts` — get/set policy
- `apps/web/app/(workspace)/settings/security/page.tsx` — admin UI

**Policy options (per workspace):**
- `require_2fa_for_admins: boolean` — admins must have 2FA enabled
- `require_2fa_for_members: boolean` — all members must have 2FA enabled
- `allowed_email_domains: TEXT[]` — only sign-ups from these domains (e.g. `["acme.com"]`)
- `session_max_age_days: INTEGER` — cap session lifetime (default 7)
- `disable_password_signin: boolean` — force SSO / passkey / magic-link only
- `ip_allowlist: INET[]` — restrict sign-in to specific IPs (Enterprise only)

**Tasks:**
1. Migration creates `workspace_security_policy` (1:1 with `workspaces`)
2. RLS: only admins can read/write
3. The auth flow checks the policy before sign-in (e.g. 2FA required → redirect to `/two-factor/setup`)
4. The policy enforcement happens server-side (in `betterAuth({...})` hooks) — never trust the client
5. Audit log writes when a policy is changed

**Tests added in 3Q (8 unit tests in `apps/web/lib/auth/_tests/workspace-policy.test.ts`):**
1. Enabling `require_2fa_for_admins` blocks admins from signing in without 2FA
2. Disabling 2FA for an admin in a workspace with `require_2fa_for_admins` is blocked
3. Sign-up from a non-allowed email domain is rejected
4. Sign-in from a non-allowed IP is rejected
5. The policy is enforced at sign-in time (not just at settings time)
6. Audit log records the policy change
7. Only workspace admins can change the policy
8. The policy applies retroactively to existing sessions (e.g. an admin session is invalidated when `require_2fa_for_admins` is enabled and they don't have 2FA)

**Verification at end of 3Q:**
```bash
npm run typecheck && npm run lint && npm run build
npm run db:test                                      # 140 + 8 = 148 tests
```

---

## Cross-cutting concerns

- **Animations:** the auth pages use the same 120/220/320ms spring physics as the rest of the app. No "auth-specific" animation library.
- **Accessibility:** axe-core 0 critical issues on every auth page. Keyboard-only completion of sign-up, sign-in, magic-link, 2FA setup, password reset.
- **Performance:** Better Auth's `cookieCache` keeps the session in a JWE cookie for 5 min, avoiding a DB hit on every RSC render. The session DB hit happens only on cache miss.
- **Type safety:** `auth.$Infer.Session` is the source of truth. Every server action receives `await getSession()` typed as `Session | null`.
- **Persistence boundary:** auth tables are managed by Better Auth (`@better-auth/cli generate`); app tables are managed by Drizzle. Both applied via `supabase db push`.
- **Multi-tenancy boundary:** every business table has `workspace_id`. RLS policies read `auth.jwt() ->> 'sub'`. `public.current_workspace_ids()` is the canonical "what workspaces can I see" function. Phase 2 tests prove the boundary is enforced.
- **Migrations are not auto-generated for RLS / triggers / functions / storage / pg_cron** — those are hand-authored. Better Auth's schema is auto-generated and committed.
- **Generated code:** `apps/web/lib/supabase/database.types.ts` is committed. Drizzle types are inferred. Better Auth types are inferred from `auth.$Infer`.
- **Phase 4 forward-compat:** every server action in Phase 4 starts with `const session = await requireAuth();`. Every Drizzle query takes a `workspaceId` and the RLS enforces isolation. No app-side check is needed.

---

## File-level change summary

| File / surface | Sub-phase | Type |
| --- | --- | --- |
| `apps/web/lib/auth/server.ts` | 3A, 3B, 3C, 3D, 3E, 3F, 3G, 3J, 3K | new, then edited by every subsequent phase |
| `apps/web/lib/auth/client.ts` | 3A, 3B, 3C | new, then edited |
| `apps/web/lib/auth/email.ts` | 3A | new |
| `apps/web/lib/auth/oauth-config.ts` | 3C | new |
| `apps/web/lib/auth/account-linking.ts` | 3C | new |
| `apps/web/lib/auth/session-binding.ts` | 3D | new |
| `apps/web/lib/auth/session-list.ts` | 3D | new |
| `apps/web/lib/auth/two-factor.ts` | 3E | new |
| `apps/web/lib/auth/backup-codes.ts` | 3E | new |
| `apps/web/lib/auth/invites.ts` | 3G | new |
| `apps/web/lib/auth/audit.ts` | 3G, 3J | new |
| `apps/web/lib/auth/rate-limit.ts` | 3J | new |
| `apps/web/lib/auth/breach-check.ts` | 3B, 3J | new |
| `apps/web/lib/auth/password-policy.ts` | 3B, 3J | new |
| `apps/web/lib/auth/account-deletion.ts` | 3J | new |
| `apps/web/lib/auth/data-export.ts` | 3J | new |
| `apps/web/lib/auth/anomaly-detection.ts` | 3D, 3J | new |
| `apps/web/lib/auth/passkey.ts` | 3K | new |
| `apps/web/lib/auth/audit-queries.ts` | 3K | new |
| `apps/web/lib/auth/workspace-helpers.ts` | 3F | new |
| `apps/web/lib/auth/workspace-types.ts` | 3F | new |
| `apps/web/lib/auth/workspace-policy.ts` | 3Q | new |
| `apps/web/lib/auth/get-session.ts` | 3A | new |
| `apps/web/lib/auth/require-auth.ts` | 3A | new |
| `apps/web/lib/auth/index.ts` | 3A | new |
| `apps/web/lib/auth/types.ts` | 3A | new |
| `apps/web/lib/auth/demo-session.ts` | 3L | **delete** |
| `apps/web/lib/email/transport.ts` | 3B | new |
| `apps/web/lib/email/render.ts` | 3B | new |
| `apps/web/lib/email/i18n.ts` | 3M | new |
| `apps/web/lib/email/templates/*.tsx` | 3B, 3C, 3D, 3G, 3K | new (10+ templates) |
| `apps/web/lib/email/templates/_locales/*.json` | 3M | new (6 locales) |
| `apps/web/lib/observability/sentry.ts` | 3K | new |
| `apps/web/lib/observability/posthog.ts` | 3K | new |
| `apps/web/lib/observability/auth-events.ts` | 3K | new |
| `apps/web/lib/i18n/dictionaries/*.json` | 3M | new (6 locales) |
| `apps/web/lib/i18n/dict.ts` | 3M | new |
| `apps/web/app/api/auth/[...all]/route.ts` | 3A | new |
| `apps/web/app/api/email/webhook/route.ts` | 3K | new |
| `apps/web/app/(auth)/*` | 3B, 3E | new (8 pages) |
| `apps/web/app/(workspace)/settings/account/*` | 3I | new (5 pages) |
| `apps/web/app/(workspace)/settings/security/*` | 3Q | new (1 page) |
| `apps/web/app/(workspace)/settings/members/*` | 3G | new (1 page) |
| `apps/web/app/(workspace)/onboarding/*` | 3H | new (1 page) |
| `apps/web/app/invite/[token]/page.tsx` | 3G | new |
| `apps/web/middleware.ts` | 3L, 3M, 3P | new, then edited |
| `apps/web/components/auth/*` | 3A–3L | new (20+ components) |
| `apps/web/components/team/*` | 3F, 3G | new (6+ components) |
| `apps/web/components/settings/*` | 3I | new (10+ components) |
| `apps/web/components/onboarding/*` | 3H | new (6+ components) |
| `apps/web/components/observability/*` | 3K | new (2+ components) |
| `apps/web/hooks/useSession.ts` | 3L | new |
| `apps/web/hooks/useUser.ts` | 3L | new |
| `apps/web/hooks/useMembership.ts` | 3F | new |
| `apps/web/hooks/useWorkspace.ts` | 3H | new |
| `apps/web/hooks/useWorkspaceList.ts` | 3F | new |
| `apps/web/hooks/useDefaultWorkspace.ts` | 3H | new |
| `apps/web/hooks/useLocale.ts` | 3M | new |
| `apps/web/app/globals.css` | 3B, 3M | edit |
| `apps/web/app/layout.tsx` | 3M | edit (lang) |
| `apps/web/app/(workspace)/layout.tsx` | 3F, 3L | edit |
| `apps/web/components/**` (Phase 1 components reading `ME_ID`) | 3L | edit (find/replace) |
| `apps/web/lib/mock/users.ts` | 3L | edit (delete `ME_ID` re-export) |
| `apps/web/next.config.ts` | 3K, 3P | edit (Sentry, security headers) |
| `supabase/migrations/0018_hard_delete_cron.sql` | 3J | new (function body) |
| `supabase/migrations/0019_session_cleanup.sql` | 3J | new |
| `supabase/migrations/0021_workspace_security_policy.sql` | 3Q | new |
| `drizzle.config.ts` | 3A | edit (auth schema filter) |
| `supabase/config.toml` | 3A | edit (auth schema) |
| `package.json` (root) | 3A, 3B, 3K | extend (deps + scripts) |
| `.env.example` (root + `apps/web/`) | 3A, 3B, 3G, 3K | extend |
| `.github/dependabot.yml` | 3P | new |
| `.github/workflows/ci.yml` | 3L, 3O | edit (add Playwright) |
| `codecov.yml` | 3O | new |
| `playwright.config.ts` | 3O | new |
| `apps/web/vitest.config.ts` | 3O | new |
| `docs/runbooks/prod-deploy.md` | 3N | new |
| `docs/runbooks/prod-rollback.md` | 3N | new |
| `docs/security/threat-model.md` | 3P | new |
| `docs/security/pen-test-report.md` | 3P | new |
| `e2e/auth/*.spec.ts` | 3B, 3C, 3D, 3E | new (8+ specs) |
| `e2e/team/*.spec.ts` | 3G, 3H | new (3+ specs) |
| `e2e/onboarding/*.spec.ts` | 3H | new (1+ spec) |
| `e2e/hardening/*.spec.ts` | 3J | new (2+ specs) |
| `e2e/settings/*.spec.ts` | 3I | new (3+ specs) |
| `e2e/app/*.spec.ts` | 3L | new (1+ spec) |
| `e2e/i18n/*.spec.ts` | 3M | new (1+ spec) |
| `e2e/a11y/*.spec.ts` | 3M | new (2+ specs) |

**Net new files: ~85. Net edited files: ~20. Net new dependencies: `better-auth`, `@better-auth/cli`, `pg`, `@types/pg`, `resend`, `react-email`, `@react-email/components`, `zxcvbn`, `node-fetch`, `@upstash/redis`, `@sentry/nextjs`, `posthog-js`, `posthog-node`, `next-intl`, `@axe-core/playwright`.**

---

## Test coverage summary at end of Phase 3

| Layer | Test count | Tooling |
|---|---|---|
| Auth + RLS + DB unit + integration | 148 | Vitest + pg |
| E2E (Playwright) | ~50 | Playwright + MSW for OAuth mocks |
| A11y (axe + keyboard) | ~12 | Playwright + axe-core |
| pgTAP (RLS) | 8 | pgTAP against local Supabase |
| **Total** | **~218 tests** | |

Every test runs on every PR via the CI workflow. The CI matrix:
- Node 22
- Ubuntu latest
- `npm ci`
- `npm run lint` (Biome)
- `npm run typecheck` (TypeScript)
- `npm run db:test` (Vitest + pg)
- `npm run db:lint` (supabase db lint + drift detection)
- `npm run build` (Next.js)
- `npm run test:e2e` (Playwright, 3 browsers, 4 workers)
- `npm run test:a11y` (axe-core + keyboard)

---

## Migration plan from Phase 2 to Phase 3

This is a one-way door. The Phase 2 `ME_ID` constant is deleted. To preserve the dev experience during the cutover:

1. **3A** keeps the dev seed inserting `u_aria` via Better Auth's sign-up action with `emailVerified: true` and password `password-demo`. The dev can still sign in as Aria.
2. **3L** removes the seed's special handling for `u_aria`; instead, the dev clicks "Sign up" with `aria@acme.dev` to create the demo owner. The seed creates the workspace + projects + cycles + issues + labels for the first sign-up.
3. **3J** removes the hard-coded `password-demo`; the dev uses real password reset flow.

---

## Forward-compat with Phases 4–8

- **Phase 4 (queries):** `requireAuth` is the canonical guard. Every server action starts with `const session = await requireAuth();`. Every Drizzle query takes a `workspaceId` and the RLS enforces isolation. No app-side check is needed.
- **Phase 5 (mutations):** every mutation writes an `activities` row via the `audit` helper from 3G. The `actorId` is `session.user.id`.
- **Phase 6 (realtime):** Supabase Realtime's subscription uses the same session cookie; no separate auth.
- **Phase 7 (storage + AI):** file uploads go through RLS-gated storage paths; the `userId` is from the session, not a hard-coded constant. Vector search is workspace-scoped via `workspace_id` on the index.
- **Phase 8 (e2e + perf + deploy):** the Playwright suite from 3A–3Q is the foundation. The OAuth + 2FA flows are the hardest E2E tests in the suite; we add performance tests using the seeded data. SAML SSO lands in Phase 8's enterprise readiness.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Better Auth's API changes between minor versions | Pin to `better-auth@^1.4.0`; upgrade deliberately; full E2E suite catches regressions |
| Email deliverability to corporate inboxes is hard | Use Resend; verify the domain; publish SPF/DKIM/DMARC; provide a `ConsoleTransport` for local dev |
| 2FA recovery is a footgun | Generate 10 backup codes at enrollment; require the user to download/print them; show a "you haven't saved your backup codes" warning |
| Account deletion is irreversible | 30-day grace period with a "restore" path; email a reminder at 7, 3, 1, and 0 days |
| Workspace invite links leak | Tokens are 256-bit, single-use, expire in 7 days, hashed at rest |
| Rate limiting can lock out legitimate users | Exponentially-backoff cap; admin override; "unlock account" via email link |
| OAuth provider changes its API | Pin the Better Auth version; upgrade deliberately |
| Session theft via cookie | httpOnly, secure, sameSite=lax, `__Host-` prefix in prod; IP + UA binding; new-device email |
| GDPR right-to-be-forgotten | Soft-delete + 30-day hard-delete; data export; clear "what we delete" UI |
| RLS bypass via service_role | Service role used only in migrations, cron, admin tooling; never in app code |
| Cross-workspace data leakage | RLS tests in Phase 2 (`rls.test.ts`) + the cutover test in 3L |
| Upstash Redis outage | In-memory rate-limit fallback (dev only); fail open for non-critical endpoints; fail closed for sign-in |
| Supabase PITR cost | 7-day PITR included; extend to 28 days only on Pro/Enterprise tier |

---

## Acceptance criteria for Phase 3 completion

The phase is **DONE** when all of the following are true:

- [ ] All 17 sub-phases (3A–3Q) have their DoD checklists met
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run db:test` passes 148 tests
- [ ] `npm run db:lint` exits 0 (no schema drift)
- [ ] `npm run test:e2e` passes all ~50 Playwright specs
- [ ] `npm run test:a11y` passes 12 axe-core + keyboard walkthrough tests
- [ ] The app is deployed to production (`https://rejira.app`)
- [ ] A real user can sign up, receive a verification email, verify, sign in, create a workspace, invite a teammate, enable 2FA, set up a passkey, and sign out
- [ ] Security headers score A+ on Mozilla Observatory
- [ ] `npm audit` is clean
- [ ] Pen-test report is reviewed and findings addressed
- [ ] Per-workspace security policy works (`require_2fa_for_admins`, `allowed_email_domains`, etc.)
- [ ] GDPR export and 30-day deletion work end-to-end
- [ ] `ME_ID` constant is deleted; the app reads from `useSession().user`
- [ ] RLS proves cross-workspace data isolation (Phase 2 tests + 3L cutover test)
- [ ] The pg_cron job runs nightly and hard-deletes accounts scheduled more than 30 days ago

---

## Phase 4 — what's next

Phase 4 lands Drizzle queries and mutations on top of Phase 2's data layer. Every `apply()` call in the UI is replaced with a transactional Drizzle write. RBAC is enforced at the RLS layer (Phase 2). Realtime subscriptions are wired (Supabase Realtime publication from 2G). The app is GA-ready backend: state survives reloads, is shared across users, respects permissions, and keeps everyone in sync. Closed-beta can promote to open-beta after Phase 4.
