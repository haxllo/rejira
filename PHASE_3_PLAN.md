# Phase 3 — Better Auth integration

**Status:** in progress (3A–3D done, dash connected, production deploy ready)

**Architecture:** Better Auth in Next.js (`apps/web/app/api/auth/[...all]/route.ts`) using `ConvexHttpClient` + `adminAuth` to call `convex/auth_adapter.ts` public endpoints. Env vars: `CONVEX_URL`, `CONVEX_ADMIN_KEY` (deploy key with `runInternalQueries` + `runInternalMutations`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY`, `BETTER_AUTH_URL`.

**Deployments:**  
- Convex: `https://beloved-tapir-68.convex.cloud` (production)  
- Vercel: `https://rejira.vercel.app`  
- Better Auth Dash: connected at `https://rejira.vercel.app/api/auth`
**Goal:** Replace the Phase 2 demo session (`ME_EXTERNAL_ID = "u_aria"`) with a real, production-grade authentication and identity layer. Users can sign up, sign in, manage sessions, invite teammates to workspaces, and the existing UI seamlessly reads the real signed-in user instead of the demo constant.

**Scope philosophy:** This is the most consequential phase. It touches security, data isolation, email infrastructure, every protected route, and the seed. A real-world SaaS auth layer has **hundreds** of edge cases (CSRF, rate limiting, breach detection, 2FA recovery, expired invite tokens, GDPR deletion, etc.). I am breaking the work into **11 sub-phases (3A–3K)** so that each one ships behind tests that must pass before the next begins. No sub-phase is optional.

---

## Architecture decisions (locked before 3A)

| # | Decision | Rationale |
| --- | --- | --- |
| AD-1 | **Use Better Auth core + custom workspace tables**, not Better Auth's org plugin | Our 14-entity business schema already has `workspaceId` on every table. The org plugin doesn't model this; we'd fight it. Better Auth core gives us `user`/`session`/`account`/`verification`; we own the rest. |
| AD-2 | **Better Auth tables use their default names**: `user`, `session`, `account`, `verification` (singular) | Matches Better Auth docs verbatim. Our business tables stay plural: `workspaces`, `memberships`, `projects`, etc. |
| AD-3 | **Drop the Phase 2 `users` table**; use Better Auth's `user` directly with `additionalFields` | No denormalization. Single source of truth. The fields that don't fit on `user` (per-workspace `role`, `status` in the workspace context) live on `memberships`. |
| AD-4 | **Better Auth server runs in Next.js** (`app/api/auth/[...all]/route.ts`); the Convex adapter writes auth tables to Convex | Standard Better Auth + Convex pattern. Convex functions call `getAuthUserId(ctx)` which runs Better Auth's internal query. |
| AD-5 | **All foreign keys into the user table reference `v.id("user")`** | After 3B, every `userId`, `actorId`, `authorId`, `ownerId` field points at the Better Auth user table. The seed inserts users via a Better Auth sign-up internal action (so the password hash, email-verified flag, and other auth metadata are correct). |
| AD-6 | **Email transport: Resend for dev + prod, with a `ConsoleTransport` fallback for local-only dev** | No third-party account required to develop. Production switches via `RESEND_API_KEY` env var. |
| AD-7 | **2FA is optional per user**; per-workspace "require 2FA for admin operations" toggle is a stretch goal of 3D | Linear matches this. SOC2 customers can enable the per-workspace toggle later. |
| AD-8 | **Account deletion has a 30-day grace period** via a `scheduledFunctions` Convex cron | User clicks "Delete account" → soft-delete immediately (anonymize PII), then a nightly cron hard-deletes users whose `scheduledHardDeleteAt < now`. |
| AD-9 | **Workspace switcher in the sidebar, not a separate page** | Linear pattern. URL uses `?w=acme` for deep-linkability (already wired in Phase 1). |
| AD-10 | **Sign-in is a page (`/sign-in`) for unauthenticated users; a modal for switching accounts while signed in** | The app is unreachable when not signed in. Once signed in, "Switch account" opens a modal. |
| AD-11 | **Workspaces are team-only in Phase 3**; personal workspaces are deferred to a post-MVP phase | Linear has both, but personal workspaces double the test surface area. Defer to Phase 3.5 if requested. |
| AD-12 | **The dev seed keeps `u_aria` as the "demo owner"** with `emailVerified: true` and a known password `password-demo` | Lets the existing UI keep working during the migration window (3A–3I). Production seed (in 3G) removes this hard-coding. |

---

## Sub-phases

```
3A ─── Better Auth core + Convex adapter + schema migration
        │   (auth tables, getAuthUserId, swap ME_ID, typecheck)
        ▼
3B ─── Email/password + magic link + transactional email
        │   (Resend, React Email templates, /sign-in /sign-up pages)
        ▼
3C ─── OAuth (Google + GitHub) + account linking
        │   (mockable OAuth for tests, new-device email)
        ▼
3D ─── Sessions + 2FA + backup codes
        │   (TOTP, recovery, session list, sign-out-all)
        ▼
3E ─── Workspace invites + member management
        │   (invite by email, link invites, expiry, role changes)
        ▼
3F ─── Onboarding + workspace creation + switcher
        │   (post-signup wizard, useWorkspace hook, default ws)
        ▼
3G ─── Production hardening
        │   (rate limit, CSRF, breach check, audit log, GDPR delete)
        ▼
3H ─── Account settings UI
        │   (profile, email change, sessions list, delete account)
        ▼
3I ─── App integration (swap demo session → real auth)
        │   (middleware, useUser, RequireAuth, loading skeletons)
        ▼
3J ─── Internationalization + accessibility
        │   (i18n, keyboard-only, axe-core, email locales)
        ▼
3K ─── Observability + email deliverability
            (Sentry, PostHog, SPF/DKIM/DMARC, bounce handling)
```

Each sub-phase ends with **explicit verification commands** that must all exit 0 before the next starts. The commands are the same in every sub-phase:

```bash
npm run typecheck       # TypeScript clean
npm run build           # Next.js production build
npm run convex:test     # 11 Phase 2 tests still pass + new 3X tests
npm run test:e2e        # Playwright E2E suite (added progressively)
```

Sub-phases 3A–3I ship in this session order. 3J and 3K are flagged as parallelizable and can be picked up after the MVP is in production.

---

## 3A — Better Auth core + Convex adapter + schema migration

**Files to create:**
- `apps/web/lib/auth/server.ts` — Better Auth server instance
- `apps/web/lib/auth/client.ts` — Better Auth React client
- `apps/web/lib/auth/email.ts` — email/password helpers
- `apps/web/lib/auth/types.ts` — session/user TypeScript types
- `apps/web/lib/auth/index.ts` — public re-exports
- `apps/web/app/api/auth/[...all]/route.ts` — Better Auth HTTP handler
- `convex/auth.ts` — Convex-side auth functions (uses `getAuthUserId` etc.)
- `convex/_lib/auth_helpers.ts` — `requireUser`, `requireVerifiedEmail`
- `convex/_tests/auth.test.ts` — auth tests
- `convex/_tests/convex_auth_harness.ts` — bootstrap a real Better Auth instance inside the test DB

**Files to edit:**
- `convex/schema.ts` — add `user`, `session`, `account`, `verification` tables (Better Auth core) + custom `additionalFields`. Drop the old `users` table.
- `convex/seed.ts` — replace direct `db.insert("users", ...)` with calls to Better Auth's sign-up internal action.
- `convex/_lib/tenancy.ts` — `requireWorkspace` now reads `getAuthUserId(ctx)` instead of `ME_EXTERNAL_ID`.
- `convex/_lib/errors.ts` — add `emailNotVerified()` factory.
- `apps/web/lib/auth/demo-session.ts` — **delete**.
- `apps/web/lib/mock/users.ts` — keep USERS data; add a comment marking it as dev-only fixtures. The `ME_ID` re-export is deleted.
- `package.json` — add `better-auth`, `@auth/core` (peer), `next-auth` not needed.
- `.env.example` (root + `apps/web/`) — add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_CLIENT_ID`/`SECRET`.

**Tests added in 3A:**
- `convex/_tests/auth.test.ts`:
  1. `getAuthUserId` returns the user when a valid session token is in the test ctx
  2. `getAuthUserId` returns `null` when no session token
  3. `requireUser` throws `unauthenticated()` for unauthenticated calls
  4. `requireUser` throws `emailNotVerified()` for unverified emails
  5. `requireUser` returns the user doc for verified sessions
  6. The Better Auth sign-up internal action creates a row in `user`, `account`, and (later) `verification` tables
  7. The Better Auth sign-in internal action validates the password hash correctly
  8. Sessions expire after their TTL (mock the clock)
  9. Sessions are bound to a user agent + IP hash (configurable; default: bound)

**Verification at end of 3A:**
```bash
npm run typecheck                                    # must exit 0
npm run build                                        # must exit 0
npm run convex:test                                  # 11 + 9 = 20 tests must pass
npx convex dev --once                                # must exit 0 (schema compiles)
```

---

## 3B — Email/password + magic link + transactional email

**Why:** Email/password is the table-stakes auth method. Magic link is what users expect when they don't want a password (Linear's primary method). Both must work end-to-end with real emails.

**Files to create:**
- `apps/web/lib/email/transport.ts` — Resend + Console transports (env-driven)
- `apps/web/lib/email/templates/` — React Email components:
  - `welcome.tsx`
  - `magic-link.tsx`
  - `verify-email.tsx`
  - `reset-password.tsx`
- `apps/web/lib/email/render.ts` — renders React Email to HTML + plaintext
- `apps/web/app/(auth)/sign-in/page.tsx` — sign-in form
- `apps/web/app/(auth)/sign-up/page.tsx` — sign-up form
- `apps/web/app/(auth)/forgot-password/page.tsx` — request reset
- `apps/web/app/(auth)/reset-password/page.tsx` — set new password
- `apps/web/app/(auth)/verify-email/page.tsx` — verify email handler
- `apps/web/app/(auth)/layout.tsx` — auth layout (centered, dark, branded)
- `apps/web/components/auth/sign-in-form.tsx`
- `apps/web/components/auth/sign-up-form.tsx`
- `apps/web/components/auth/magic-link-form.tsx`
- `apps/web/components/auth/forgot-password-form.tsx`
- `apps/web/components/auth/reset-password-form.tsx`
- `apps/web/components/auth/oauth-buttons.tsx` (used in 3C)

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register email/password + magic link plugins
- `apps/web/lib/auth/client.ts` — expose `signIn.email`, `signIn.magicLink`, `signUp.email`
- `apps/web/app/globals.css` — add `.auth-shell` styles
- `package.json` — add `resend`, `@react-email/components`, `react-email`

**Tests added in 3B:**
- `convex/_tests/email.test.ts` (uses the ConsoleTransport to capture emails):
  1. Sign-up sends a `verify-email` email
  2. Clicking the verify link marks the user as verified
  3. Sign-up blocks the session if `requireEmailVerification` is true and email is unverified
  4. Magic link sign-in sends a `magic-link` email with a one-time token
  5. Clicking the magic link creates a session
  6. Magic link tokens are single-use (second click throws)
  7. Magic link tokens expire after 15 minutes (mock the clock)
  8. Forgot password sends a `reset-password` email
  9. Reset link sets a new password and revokes all other sessions
  10. Welcome email is sent on first sign-up (idempotent)

**E2E tests added in 3B:**
- `e2e/auth/sign-up.spec.ts`:
  1. New user can sign up with email + password
  2. Sign-up redirects to a "check your email" page
  3. Clicking the verify link from the email logs the user in
- `e2e/auth/sign-in.spec.ts`:
  1. Existing user can sign in with email + password
  2. Wrong password shows a generic error
- `e2e/auth/magic-link.spec.ts`:
  1. User requests a magic link
  2. Email is captured (in test mode)
  3. Clicking the magic link signs them in
- `e2e/auth/forgot-password.spec.ts`:
  1. User requests a reset
  2. Email is captured
  3. Reset form accepts the new password
  4. Old password no longer works

**Verification at end of 3B:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 20 + 10 = 30 tests
npm run test:e2e -- --grep "sign-up|sign-in|magic|forgot"   # 7 E2E tests
```

---

## 3C — OAuth (Google + GitHub) + account linking

**Why:** B2B users expect to sign in with Google (workspace-bound identity) or GitHub (developer audience). Account linking prevents the "duplicate account" problem.

**Files to create:**
- `apps/web/lib/auth/oauth-config.ts` — provider configs
- `apps/web/lib/auth/account-linking.ts` — link-by-email logic
- `apps/web/lib/email/templates/new-device.tsx`

**Files to edit:**
- `apps/web/lib/auth/server.ts` — register Google + GitHub providers
- `apps/web/lib/auth/client.ts` — expose `signIn.social`
- `apps/web/components/auth/oauth-buttons.tsx` — wire up the providers
- `apps/web/lib/auth/account-linking.ts` — on OAuth callback, if email matches existing user, link the `account` row to the existing `user`

**Tests added in 3C:**
- `convex/_tests/oauth.test.ts`:
  1. New Google OAuth sign-up creates a `user` + `account` row with `providerId: "google"`
  2. New GitHub OAuth sign-up creates a `user` + `account` row with `providerId: "github"`
  3. OAuth sign-up with an email that matches an existing user links the `account` to the existing `user`
  4. OAuth sign-up sends a `new-device` email
  5. OAuth sign-up with an unverified email is rejected if `requireEmailVerification` is on
  6. The `account` row stores `accessToken` and `refreshToken` (encrypted at rest)
  7. Revoking an OAuth provider disconnects it (does not delete the user)
  8. OAuth provider offline scope returns a refresh token

**E2E tests added in 3C:**
- `e2e/auth/google.spec.ts` (uses `playwright-msw` to mock Google):
  1. New user can sign in with Google
  2. Existing email-password user can link Google on next Google sign-in
- `e2e/auth/github.spec.ts` (uses `playwright-msw` to mock GitHub):
  1. New user can sign in with GitHub
  2. Existing GitHub user is auto-signed in

**Verification at end of 3C:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 30 + 8 = 38 tests
npm run test:e2e -- --grep "oauth|google|github"    # 4 E2E tests
```

---

## 3D — Sessions + 2FA + backup codes

**Why:** B2B customers require 2FA for admins (SOC2). Even non-2FA users need a session list to detect account hijacking.

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
- `apps/web/lib/auth/server.ts` — register the `two-factor` plugin
- `apps/web/components/auth/sign-in-form.tsx` — handle the 2FA challenge redirect

**Tests added in 3D:**
- `convex/_tests/two-factor.test.ts`:
  1. TOTP enrollment returns a TOTP URI + secret
  2. The first TOTP code after enrollment confirms the setup
  3. After 2FA is on, sign-in requires a TOTP code (or backup code)
  4. Wrong TOTP code 3 times locks the account for 15 minutes
  5. Backup codes are 10 one-time-use codes, each ~22 chars, hashed at rest
  6. Used backup codes cannot be reused
  7. Regenerating backup codes invalidates the old set
  8. Disabling 2FA requires a fresh TOTP code
  9. Sign-in flow is: password → TOTP challenge → session
  10. Sessions are bound to a user-agent hash + IP-hash (configurable)

**E2E tests added in 3D:**
- `e2e/auth/two-factor.spec.ts`:
  1. User can enroll 2FA from settings
  2. Next sign-in prompts for 2FA
  3. User can use a backup code to sign in
  4. User can disable 2FA

**Verification at end of 3D:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 38 + 10 = 48 tests
npm run test:e2e -- --grep "two-factor"             # 4 E2E tests
```

---

## 3E — Workspace invites + member management

**Why:** A single-user app is not a Jira replacement. Invites drive adoption.

**Files to create:**
- `apps/web/lib/auth/invites.ts` — token generation, expiry, hashing
- `apps/web/components/team/workspace-invite-form.tsx`
- `apps/web/components/team/workspace-members-table.tsx`
- `apps/web/components/team/workspace-invites-table.tsx`
- `apps/web/components/team/role-select.tsx`
- `apps/web/app/(workspace)/settings/members/page.tsx` — member list, invite form, role changes
- `apps/web/app/(workspace)/settings/teams/page.tsx` — projects visibility (deferred to 3I if scope creep)
- `apps/web/app/invite/[token]/page.tsx` — accept invite handler

**Files to edit:**
- `convex/memberships.ts` — add `invite`, `acceptInvite`, `revokeInvite`, `changeRole`, `removeMember` mutations
- `convex/_lib/tenancy.ts` — `requireOwner` and `requireAdmin` for these mutations
- `apps/web/lib/email/templates/workspace-invite.tsx`
- `apps/web/lib/auth/server.ts` — register the `organization` plugin (just for the invite table; we own the rest)

**Tests added in 3E:**
- `convex/_tests/invites.test.ts`:
  1. Owner can invite a user by email
  2. Invited user receives an email with a 256-bit token
  3. Invited user clicks the link, signs up (or signs in), and lands on the workspace
  4. The `invitations` row is marked `acceptedAt` and a `memberships` row is created
  5. Invite tokens expire after 7 days
  6. Revoking an invite prevents acceptance
  7. Bulk invite (CSV upload) creates N invitation rows
  8. Resend invite rotates the token
  9. An owner cannot demote themselves
  10. An owner cannot remove themselves (must transfer ownership first)
  11. An admin can change member roles but cannot promote to owner
  12. Role change writes an `activities` row

**E2E tests added in 3E:**
- `e2e/team/invite.spec.ts`:
  1. Owner invites a new email
  2. Invitee clicks the link, signs up, and lands in the workspace
  3. Invitee appears in the members table

**Verification at end of 3E:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 48 + 12 = 60 tests
npm run test:e2e -- --grep "invite"                 # 3 E2E tests
```

---

## 3F — Onboarding + workspace creation + switcher

**Why:** New users need a frictionless first 60 seconds. The current `?w=acme` URL is a hack — replace it with a real switcher.

**Files to create:**
- `apps/web/components/onboarding/workspace-setup-wizard.tsx`
- `apps/web/components/team/workspace-switcher.tsx`
- `apps/web/components/team/create-workspace-modal.tsx`
- `apps/web/app/(workspace)/onboarding/page.tsx` — post-signup wizard
- `apps/web/hooks/useWorkspace.ts` — replaces `?w=` parsing
- `apps/web/hooks/useWorkspaceList.ts`
- `apps/web/hooks/useDefaultWorkspace.ts`
- `convex/workspaces.ts` — add `create`, `archive`, `rename`, `setDefault` mutations

**Files to edit:**
- `apps/web/app/(workspace)/layout.tsx` — read `useWorkspace()` from `?w=` OR the user's default
- `apps/web/components/team/workspace-switcher.tsx` — replaces the Phase 1 `?w=` switcher

**Tests added in 3F:**
- `convex/_tests/workspaces.test.ts`:
  1. New user (post-signup) gets a personal workspace auto-created
  2. The personal workspace's `ownerId` is the new user
  3. User can create additional workspaces
  4. Workspace slug is unique within the platform
  5. User can archive a workspace (soft delete)
  6. Archived workspaces are excluded from the active list
  7. Setting a default workspace updates the user's `defaultWorkspaceId`
  8. The `useWorkspace` hook falls back to the default when no `?w=` is set
  9. Cross-workspace data isolation still works (every business query is workspace-scoped — already enforced in 3A)
  10. A user can only see workspaces they're a member of

**E2E tests added in 3F:**
- `e2e/onboarding/new-user.spec.ts`:
  1. New user signs up
  2. Lands on the onboarding wizard
  3. Creates the first workspace
  4. Skips the team-invite step
  5. Lands on the home view of the new workspace
- `e2e/team/switcher.spec.ts`:
  1. User with 2 workspaces sees both in the switcher
  2. Clicking a workspace navigates with `?w=slug` set
  3. Reloading the page keeps the active workspace

**Verification at end of 3F:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 60 + 10 = 70 tests
npm run test:e2e -- --grep "onboarding|switcher"    # 4 E2E tests
```

---

## 3G — Production hardening

**Why:** This is what separates a demo from a product. B2B customers will not sign a contract without rate limiting, breach checks, and GDPR deletion.

**Files to create:**
- `apps/web/lib/auth/rate-limit.ts` — Redis-free in-memory rate limiter (Phase 3); Convex-side rate limiter in 3K
- `apps/web/lib/auth/breach-check.ts` — HaveIBeenPwned k-anonymity API client
- `apps/web/lib/auth/password-policy.ts` — zxcvbn-style strength check
- `apps/web/lib/auth/audit.ts` — emits `activities` rows for auth events
- `apps/web/lib/auth/account-deletion.ts` — soft-delete + 30-day grace period
- `apps/web/lib/auth/data-export.ts` — GDPR data export (returns a JSON file)
- `apps/web/lib/auth/session-binding.ts` — IP + UA hashing
- `convex/crons.ts` — scheduled functions: hard-delete, expired invites, expired sessions

**Files to edit:**
- `apps/web/lib/auth/server.ts` — wire rate-limit hooks, breach-check on sign-up, password-policy on sign-up
- `convex.json` — register `crons.ts` so the nightly hard-delete runs in production
- `.env.example` — add `HIBP_API_KEY` (optional), `HASH_SECRET`

**Tests added in 3G:**
- `convex/_tests/hardening.test.ts`:
  1. 5 sign-in attempts in 60 seconds trigger a rate-limit error
  2. 5 magic-link requests in 60 seconds trigger a rate-limit error
  3. 3 password-reset requests in 60 seconds trigger a rate-limit error
  4. Sign-up with a password in the HaveIBeenPwned top 1000 is rejected
  5. Sign-up with a password shorter than 12 chars is rejected
  6. Sign-up with a common password (`password`, `qwerty`, etc.) is rejected
  7. Account deletion soft-deletes the user (anonymizes PII) immediately
  8. The user cannot sign in after soft-deletion
  9. After 30 days, the user is hard-deleted (scheduled function with clock mock)
  10. Data export returns a JSON of all user-owned data (issues, comments, activities, etc.)
  11. Auth events emit `activities` rows (sign-in, sign-out, password change, email change)
  12. Session is bound to the IP-hash and UA-hash from sign-in time
  13. New IP / UA triggers a "new sign-in" email
  14. Email change requires confirmation of both old and new email
  15. Email change invalidates all sessions on the old email
  16. Account deletion is reversible for 30 days (re-sign-in restores the account)

**E2E tests added in 3G:**
- `e2e/hardening/rate-limit.spec.ts`:
  1. 5 wrong passwords in a row trigger a rate-limit error
- `e2e/hardening/delete-account.spec.ts`:
  1. User clicks "Delete account"
  2. User is signed out
  3. User cannot sign in with the same password
  4. After 30 days (mocked), user is hard-deleted

**Verification at end of 3G:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 70 + 16 = 86 tests
npm run test:e2e -- --grep "rate-limit|delete"      # 2 E2E tests
```

---

## 3H — Account settings UI

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
- `apps/web/components/settings/sessions-list.tsx`
- `apps/web/components/settings/two-factor-settings.tsx` (reuses 3D)
- `apps/web/components/settings/data-export-button.tsx`
- `apps/web/components/settings/delete-account-button.tsx` (with confirmation modal)

**Files to edit:**
- `apps/web/app/(workspace)/settings/page.tsx` — add navigation cards for the new sub-pages

**Tests added in 3H:**
- `convex/_tests/settings.test.ts`:
  1. Profile update writes a new `name` and `image`
  2. Email change creates a pending change with a verification token
  3. Both emails must be confirmed before the change applies
  4. Password change requires the old password
  5. Password change invalidates other sessions (configurable: "sign out other devices")
  6. Sessions list shows last-active, IP-hash, UA-hash
  7. Revoking a session signs out that device
  8. Revoking all sessions signs out every device

**E2E tests added in 3H:**
- `e2e/settings/profile.spec.ts`:
  1. User can update their name and avatar color
- `e2e/settings/security.spec.ts`:
  1. User can change their password
  2. User can enable 2FA
  3. User can view active sessions
  4. User can revoke a session

**Verification at end of 3H:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 86 + 8 = 94 tests
npm run test:e2e -- --grep "settings"               # 4 E2E tests
```

---

## 3I — App integration (swap demo session → real auth)

**Why:** This is the cutover. The app stops reading `ME_ID` and starts reading `useSession().userId`. Every business query is workspace-scoped via `requireWorkspace` which now reads the real session.

**Files to create:**
- `apps/web/hooks/useSession.ts` — Better Auth's `useSession` wrapper
- `apps/web/hooks/useUser.ts` — current user
- `apps/web/hooks/useMembership.ts` — current user's membership in the active workspace
- `apps/web/components/auth/require-auth.tsx` — `<RequireAuth>` wrapper
- `apps/web/components/auth/session-loading-skeleton.tsx` — Suspense fallback
- `apps/web/middleware.ts` — protect all routes except `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/auth/*`, `/invite/[token]`, `/`

**Files to edit (find/replace `ME_ID` and `ME_EXTERNAL_ID`):**
- `apps/web/lib/mock/users.ts` — `ME_ID` deleted
- `apps/web/components/**` — every `userById(ME_ID)` → `useUser().id`
- `apps/web/hooks/useViewQuery.ts` — uses real user for "my issues" filter
- `apps/web/components/views/issue-row.tsx` — assignee / creator lookups use real users
- `apps/web/components/inbox/inbox-item.tsx` — same
- `apps/web/app/(workspace)/layout.tsx` — `<RequireAuth>` wraps children; reads `useWorkspace()`
- `apps/web/app/(workspace)/home/page.tsx` — replaces the hard-coded "Aria" greeting
- All 8 protected pages

**Files to delete:**
- `apps/web/lib/auth/demo-session.ts`
- `apps/web/lib/mock/users.ts` `ME_ID` re-export (keep the data fixtures for tests)

**Tests added in 3I:**
- `convex/_tests/cutover.test.ts`:
  1. `requireWorkspace` no longer accepts the `ME_EXTERNAL_ID` lookup
  2. `requireWorkspace` reads `getAuthUserId(ctx)` and looks up membership
  3. `requireWorkspace` works for any user with a valid session + membership
  4. `requireWorkspace` throws `unauthenticated()` for users without a session
  5. `requireWorkspace` throws `forbidden()` for users with a session but no membership
  6. The seed inserts a `u_aria` user via the Better Auth sign-up action (so the demo workspace works during dev)
  7. Every `convex/_tests/*.test.ts` test that uses `ME_EXTERNAL_ID` is updated to use a real `getAuthUserId` flow

**E2E tests added in 3I:**
- `e2e/app/protected-routes.spec.ts`:
  1. Unauthenticated user is redirected to `/sign-in?next=/...`
  2. After sign-in, user is redirected back to the original `next`
  3. The home view shows the real user's name
  4. The "My issues" filter uses the real user's ID
  5. Sign out clears the session cookie and redirects to `/sign-in`

**Verification at end of 3I:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 94 + 7 = 101 tests
npm run test:e2e                                     # full E2E suite
npx convex dev --once                                # schema compiles
```

**This is the cutover.** Once 3I is green, the app is fully on Better Auth. The Phase 1 demo session is gone forever.

---

## 3J — Internationalization + accessibility (parallelizable after 3I)

**Why:** Global teams need locale-aware emails and strings. B2B procurement requires WCAG 2.2 AA.

**Files to create:**
- `apps/web/lib/i18n/dictionaries/{en,es,fr,de,ja,zh}.json`
- `apps/web/lib/i18n/dict.ts` — `getDict(locale)`
- `apps/web/hooks/useLocale.ts`
- `apps/web/middleware.ts` — detect locale from `Accept-Language` header
- `apps/web/lib/email/templates/_locales/{en,es,fr,de,ja,zh}.json` — email strings
- `apps/web/tests/a11y/axe.spec.ts` — Playwright + axe-core

**Files to edit:**
- All auth pages and components use `t("key")` from `useLocale()`
- `apps/web/app/layout.tsx` — `<html lang={locale}>`
- Email rendering pipeline uses the user's `locale` to pick the template strings

**Tests added in 3J:**
- `e2e/i18n/sign-in.spec.ts` — sign in works in each of 6 locales
- `e2e/a11y/auth.spec.ts` — every auth page passes axe-core WCAG 2.2 AA
- `e2e/a11y/keyboard.spec.ts` — sign-up and sign-in are keyboard-only completable

**Verification at end of 3J:**
```bash
npm run typecheck
npm run build
npm run convex:test                                  # 101 (no new)
npm run test:e2e                                     # full E2E
npm run test:a11y                                    # axe + keyboard
```

---

## 3K — Observability + email deliverability (parallelizable after 3I)

**Why:** When something breaks in production, you need logs. When an email bounces, you need to know. When a user reports "I can't sign in", you need traces.

**Files to create:**
- `apps/web/lib/observability/sentry.ts` — Sentry initialization (server + edge + browser)
- `apps/web/lib/observability/posthog.ts` — PostHog init (events, not pageviews for now)
- `apps/web/lib/observability/auth-events.ts` — emits structured events for sign-in, sign-up, sign-out, password change, email change, 2FA events, account deletion
- `apps/web/lib/email/bounce-handler.ts` — Resend webhook handler
- `apps/web/app/api/email/webhook/route.ts` — webhook receiver
- `convex/observability/audit-queries.ts` — admin-only query to read auth event history

**Files to edit:**
- `apps/web/lib/auth/server.ts` — emit events at every sign-in/sign-up/sign-out
- `apps/web/next.config.ts` — Sentry plugin
- `.env.example` — add `SENTRY_DSN`, `POSTHOG_API_KEY`, `RESEND_WEBHOOK_SECRET`

**Tests added in 3K:**
- `convex/_tests/observability.test.ts`:
  1. Sign-in event is emitted with `{ userId, ipHash, uaHash, timestamp }`
  2. Failed sign-in event is emitted (for brute-force detection)
  3. Password change event is emitted
  4. Email change event is emitted with both old and new email hashes
  5. Account deletion event is emitted
  6. 2FA enrollment event is emitted
  7. The audit query is admin-only

**Manual verification at end of 3K:**
```bash
# Email deliverability
- Send a sign-up email to a Gmail address → arrives in inbox (not spam)
- Check SPF/DKIM/DMARC pass on mail-tester.com (score ≥ 9/10)
- Send a sign-up email to an Outlook address → arrives in inbox
- Trigger a bounce → Resend webhook fires → `emailBounces` table updated

# Observability
- Open Sentry → no auth-related errors
- Open PostHog → sign-in events appear
- Force a sign-in failure → event appears in PostHog with the right shape
```

---

## File-level change summary

| File / surface | Sub-phase | Type |
| --- | --- | --- |
| `package.json` (root) | 3A, 3B, 3C, 3J, 3K | edit (deps + scripts) |
| `.env.example` (root + `apps/web/`) | 3A, 3B, 3C, 3G, 3K | edit |
| `.github/workflows/ci.yml` | 3I | edit (add Playwright) |
| `convex/schema.ts` | 3A | edit (add Better Auth tables) |
| `convex/auth.ts` | 3A | new |
| `convex/_lib/auth_helpers.ts` | 3A | new |
| `convex/seed.ts` | 3A, 3F | edit (use Better Auth sign-up) |
| `convex/_lib/tenancy.ts` | 3A, 3I | edit (real auth) |
| `convex/_lib/errors.ts` | 3A | edit (new factories) |
| `convex/memberships.ts` | 3E | new |
| `convex/workspaces.ts` | 3F | new |
| `convex/crons.ts` | 3G | new |
| `convex/observability/audit-queries.ts` | 3K | new |
| `convex/_tests/auth.test.ts` | 3A | new (9 tests) |
| `convex/_tests/email.test.ts` | 3B | new (10 tests) |
| `convex/_tests/oauth.test.ts` | 3C | new (8 tests) |
| `convex/_tests/two-factor.test.ts` | 3D | new (10 tests) |
| `convex/_tests/invites.test.ts` | 3E | new (12 tests) |
| `convex/_tests/workspaces.test.ts` | 3F | new (10 tests) |
| `convex/_tests/hardening.test.ts` | 3G | new (16 tests) |
| `convex/_tests/settings.test.ts` | 3H | new (8 tests) |
| `convex/_tests/cutover.test.ts` | 3I | new (7 tests) |
| `convex/_tests/observability.test.ts` | 3K | new (7 tests) |
| `convex/_tests/{seed,tenancy,indexes}.test.ts` | 3I | edit (use real auth) |
| `apps/web/lib/auth/server.ts` | 3A | new |
| `apps/web/lib/auth/client.ts` | 3A | new |
| `apps/web/lib/auth/email.ts` | 3A | new |
| `apps/web/lib/auth/oauth-config.ts` | 3C | new |
| `apps/web/lib/auth/account-linking.ts` | 3C | new |
| `apps/web/lib/auth/two-factor.ts` | 3D | new |
| `apps/web/lib/auth/backup-codes.ts` | 3D | new |
| `apps/web/lib/auth/invites.ts` | 3E | new |
| `apps/web/lib/auth/rate-limit.ts` | 3G | new |
| `apps/web/lib/auth/breach-check.ts` | 3G | new |
| `apps/web/lib/auth/password-policy.ts` | 3G | new |
| `apps/web/lib/auth/audit.ts` | 3G | new |
| `apps/web/lib/auth/account-deletion.ts` | 3G | new |
| `apps/web/lib/auth/data-export.ts` | 3G | new |
| `apps/web/lib/auth/session-binding.ts` | 3G | new |
| `apps/web/lib/auth/index.ts` | 3A | new |
| `apps/web/lib/auth/demo-session.ts` | 3A | **delete** |
| `apps/web/lib/email/transport.ts` | 3B | new |
| `apps/web/lib/email/render.ts` | 3B | new |
| `apps/web/lib/email/templates/*.tsx` | 3B, 3C, 3E | new (5+ templates) |
| `apps/web/lib/observability/*.ts` | 3K | new (4 files) |
| `apps/web/lib/i18n/*` | 3J | new |
| `apps/web/app/api/auth/[...all]/route.ts` | 3A | new |
| `apps/web/app/api/email/webhook/route.ts` | 3K | new |
| `apps/web/app/(auth)/*` | 3B, 3D | new (5 pages) |
| `apps/web/app/(workspace)/settings/account/*` | 3H | new (5 pages) |
| `apps/web/app/(workspace)/onboarding/page.tsx` | 3F | new |
| `apps/web/app/(workspace)/settings/members/page.tsx` | 3E | new |
| `apps/web/app/invite/[token]/page.tsx` | 3E | new |
| `apps/web/middleware.ts` | 3I, 3J | new |
| `apps/web/components/auth/*` | 3A–3I | new (15+ components) |
| `apps/web/components/team/*` | 3E, 3F | new (5+ components) |
| `apps/web/components/settings/*` | 3H | new (8+ components) |
| `apps/web/components/onboarding/*` | 3F | new (1+ components) |
| `apps/web/hooks/useSession.ts` | 3I | new |
| `apps/web/hooks/useUser.ts` | 3I | new |
| `apps/web/hooks/useMembership.ts` | 3I | new |
| `apps/web/hooks/useWorkspace.ts` | 3F | new |
| `apps/web/hooks/useWorkspaceList.ts` | 3F | new |
| `apps/web/hooks/useDefaultWorkspace.ts` | 3F | new |
| `apps/web/hooks/useLocale.ts` | 3J | new |
| `apps/web/app/globals.css` | 3B, 3J | edit |
| `apps/web/app/layout.tsx` | 3J | edit (lang) |
| `apps/web/app/(workspace)/layout.tsx` | 3I | edit (RequireAuth) |
| `apps/web/components/**` (Phase 1 components reading `ME_ID`) | 3I | edit (find/replace) |
| `e2e/auth/*.spec.ts` | 3B, 3C, 3D | new (5+ specs) |
| `e2e/team/*.spec.ts` | 3E, 3F | new (2+ specs) |
| `e2e/onboarding/*.spec.ts` | 3F | new (1+ spec) |
| `e2e/hardening/*.spec.ts` | 3G | new (2+ specs) |
| `e2e/settings/*.spec.ts` | 3H | new (2+ specs) |
| `e2e/app/*.spec.ts` | 3I | new (1+ spec) |
| `e2e/i18n/*.spec.ts` | 3J | new (1+ spec) |
| `e2e/a11y/*.spec.ts` | 3J | new (2+ specs) |
| `playwright.config.ts` | 3B | new |
| `package.json` (root) `scripts.test:e2e` | 3B | new script |
| `package.json` (root) `scripts.test:a11y` | 3J | new script |
| `PHASE_3_PLAN.md` | — | this file |

---

## Test coverage summary at end of Phase 3

| Layer | Test count | Tooling |
| --- | --- | --- |
| Convex unit + integration | 101 | vitest + convex-test |
| E2E (Playwright) | ~30 | Playwright + MSW for OAuth mocks |
| A11y (axe + keyboard) | ~10 | Playwright + axe-core |
| **Total** | **~141 tests** | |

Every test is run on every PR via the CI workflow updated in 3I. The CI matrix:
- Node 22
- Ubuntu latest
- `npm ci`
- `npm run typecheck`
- `npm run convex:test`
- `npx convex dev --once` (schema compile smoke)
- `npm run build`
- `npm run test:e2e`
- `npm run test:a11y`

---

## Migration plan from Phase 2 to Phase 3

This is a one-way door. The Phase 2 `users` table is dropped, and `ME_ID` is deleted. To preserve the dev experience during the cutover:

1. **3A** keeps the dev seed inserting `u_aria` via Better Auth's sign-up action with `emailVerified: true` and password `password-demo`. The dev can still sign in as Aria.
2. **3I** removes the seed's special handling for `u_aria`; instead, the dev clicks "Sign up" with `aria@acme.dev` to create the demo owner. The seed creates the workspace + projects + cycles + issues + labels for the first sign-up.
3. **3G** removes the hard-coded `password-demo`; the dev uses real password reset flow.

---

## Forward-compat with Phases 4–8

- **Phase 4 (queries):** `requireWorkspace` is now the canonical guard. Every business query takes `{ workspaceId }` and calls `requireWorkspace(ctx, workspaceId)` first. The Convex auth helpers (`getAuthUserId`, `requireUser`) are in `convex/_lib/auth_helpers.ts`.
- **Phase 5 (mutations):** every mutation writes an `activities` row via the `audit` helper from 3G. The `actorId` is `getAuthUserId(ctx)`.
- **Phase 6 (realtime):** Convex's reactive queries already provide realtime; the only auth concern is the initial subscription, which uses the session cookie.
- **Phase 7 (storage + AI):** file uploads go through `convex/files.ts`; the `userId` is from the session, not a hard-coded constant. Vector search is workspace-scoped via `workspaceId` on the index.
- **Phase 8 (e2e + perf + deploy):** the Playwright suite from 3B–3J is the foundation. The OAuth + 2FA flows are the hardest E2E tests in the suite; we add performance tests using the seeded data.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Better Auth's Convex adapter might not expose a particular function we need | Wrap the adapter in `convex/auth.ts`; if something is missing, fork the adapter locally and pin a fork. |
| Email deliverability to corporate inboxes is hard | Use Resend; verify the domain; publish SPF/DKIM/DMARC; provide a `ConsoleTransport` for local dev. |
| 2FA recovery is a footgun | Generate 10 backup codes at enrollment; require the user to download/print them; show a "you haven't saved your backup codes" warning. |
| Account deletion is irreversible | 30-day grace period with a "restore" path; email a reminder at 7, 3, 1, and 0 days. |
| Workspace invite links leak | Tokens are 256-bit, single-use, expire in 7 days, hashed at rest. |
| Rate limiting can lock out legitimate users | Exponentially-backoff cap; admin override; "unlock account" via email link. |
| OAuth provider changes its API | Pin the Better Auth version; upgrade deliberately. |
| Session theft via cookie | httpOnly, secure, sameSite=lax, `__Host-` prefix in prod; IP + UA binding configurable. |
| GDPR right-to-be-forgotten | Soft-delete + 30-day hard-delete; data export; clear "what we delete" UI. |
| Convex subscription cost for auth events | Use the `activities` table for audit; rate-limit audit events to N/minute. |

---

## Acceptance criteria for Phase 3 completion

The phase is **DONE** when all of the following are true:

- [ ] All 11 sub-phases (3A–3K) have their DoD checklists met
- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run convex:test` passes 101 tests
- [ ] `npm run test:e2e` passes all Playwright specs
- [ ] `npm run test:a11y` passes axe-core + keyboard walkthrough
- [ ] `npx convex dev --once` exits 0 in CI
- [ ] `apps/web/lib/auth/demo-session.ts` is deleted
- [ ] `ME_ID` is not referenced anywhere in the codebase (`grep -r "ME_ID" apps/ convex/` returns nothing)
- [ ] The dev seed creates `u_aria` via Better Auth's sign-up action (or is removed entirely; the dev clicks "Sign up" to create the demo owner)
- [ ] A new contributor can clone, `npm install`, `npx convex dev --once`, `npm run dev`, sign up, create a workspace, invite a teammate, and sign in as the teammate
- [ ] `PHASE_3_PLAN.md` is updated to mark all sub-phases done
- [ ] `README.md` "First-time setup" section reflects the new sign-up flow
- [ ] A `CHANGELOG.md` entry summarizes what Phase 3 changed
