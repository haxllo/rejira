# Dev Environment Setup Flow Audit

**Phase:** 09 — Dev Env & Onboarding Flow Audit
**Plan:** 09-01 — Audit dev environment setup flow
**Date:** 2026-06-08
**Auditor:** GSD executor (Plan 09-01)
**Scope:** git clone → first workspace sign-in

---

## Summary

This audit traces the full developer experience from cloning the rejira repository to seeing a workspace after sign-in. Five paths are evaluated: first-time setup (clone → running app), sign-up and auth flow, first workspace experience, magic link flow, and OAuth flow.

**11 friction points** were identified, including **3 critical** issues that block the developer from reaching a usable workspace. The most significant finding is that the **onboarding wizard is purely cosmetic** — it presents a 5-step flow that collects workspace/project/invite data in local state but never actually creates any resources. The second critical issue is that **no post-sign-in redirect to onboarding exists** — signed-in users land at `/inbox` where Drizzle queries fail because they have no workspace memberships.

---

## Complete Flow Map

### Path A: First-time setup (git clone → running app)

```
Step 1: git clone <repo>
  │
  ▼
Step 2: npm install
  │  installs workspace root deps + apps/web deps
  │  ~45s-2min depending on network
  ▼
Step 3: Copy .env.example → .env.local
  │  TWO .env.example files exist (root + apps/web)
  │  Must configure:
  │    • BETTER_AUTH_SECRET (no default — needs openssl rand -base64 32)
  │    • DATABASE_URL, DIRECT_URL, DATABASE_URL_SESSION (3 Supabase connection strings)
  │    • NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  │    • Optional: GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET
  │    • Optional: RESEND_API_KEY (ConsoleTransport works without it)
  │    • Optional: UPSTASH_REDIS vars (in-memory fallback)
  │  ~5-15 min for first-time setup (figuring out which vars are required)
  ▼
Step 4: supabase start
  │  Requires Docker + Supabase CLI
  │  First run: downloads Docker images (~2-5 min)
  │  Subsequent runs: ~30s
  ▼
Step 5: supabase db reset
  │  Applies all migrations
  │  Resets local Postgres to clean state
  ▼
Step 6: npm run db:seed
  │  Seeds demo data (workspace, users, issues, etc.)
  │  Only works AFTER supabase db reset
  ▼
Step 7: npm run dev
  │  next dev -p 3000
  │  ~10-30s to compile
  ▼
Step 8: Navigate to localhost:3000
  │  → redirects to /inbox
  │  → middleware checks session cookie
  │  → no cookie → redirects to /sign-in?next=/inbox
  │  → sees sign-in page
  ▼
Step 9: Click "Sign up" → /sign-up
```

### Path B: Sign-up and auth flow

```
Sign-up page (/sign-up)
  │
  ├─ Fill: name, email, password (min 12 chars)
  │
  ▼
Submit → signUp.email({ name, email, password, callbackURL: '/inbox' })
  │
  │  Server-side: HIBP breach check, rate limit (5/hr), password policy
  │
  ├─ SUCCESS → form shows "Account created!" + "Sign in →" link
  │  │  Verification email sent (sendOnSignUp: true)
  │  │  ConsoleTransport prints email to terminal
  │  │
  │  ▼
  │  Dev checks terminal output for verification URL
  │  │  URL format: http://localhost:3000/verify-email?token=<token>
  │  │  (BuildVerificationPageUrl rewrites the API URL to the app URL)
  │  │
  │  ▼
  │  Open verification URL
  │  │  → verify-email page shows "Verifying your email"
  │  │  → calls verifyEmail({ query: { token } })
  │  │  → autoSignInAfterVerification creates session
  │  │  → "Email verified" shown with 1.8s delay
  │  │  → auto-redirect to /sign-in?verified=1
  │  │
  │  ⚠ FRICTION: autoSignInAfterVerification creates a session,
  │    BUT the UI redirects to /sign-in (not /inbox).
  │    The sign-in page shows "Email verified" banner.
  │    User must manually sign in AGAIN or navigate to /inbox.
  │    This is a double hop — the session already exists!
  │
  ▼
Sign in with credentials
  │  → "Signed in!" state (manual click to /inbox)
  │  → middleware checks session → passes
  │  → workspace layout renders
  │
  ▼
  ⚠ CRITICAL: User lands at /inbox with NO workspace membership
  │  Drizzle queries call getActiveWorkspaceId() → throws
  │  No redirect to /onboarding exists
  │  The onboarding wizard (at /onboarding) is unreachable
  │  unless the user knows to visit it manually
  │
  ▼
  Onboarding wizard (if user navigates to /onboarding)
  │  Only reachable if: user knows URL, already has session
  │  5 steps: Welcome → Create Workspace → Invite Team → Create Project → Done
  │
  │  ⚠ CRITICAL: The onboarding wizard is UI-ONLY
  │  • Step 2 collects workspace name/slug → never calls createOrganization()
  │  • Step 3 collects invites → never sends invitations
  │  • Step 4 collects project name/key → never creates project
  │  • Step 5 shows summary of local state → redirects to /inbox
  │  • Nothing is persisted. No workspace, project, or member is created.
```

### Path C: First workspace experience (detailed)

```
After sign-in → /inbox
  │
  ├─ middleware.ts:
  │     /inbox NOT in PUBLIC list → checks session cookie
  │     Has session cookie → passes through
  │
  ▼
  workspace layout (server component):
  │     getUsers() → requireAuth() → getSession() → auth.api.getSession()
  │          → workspaceId from getActiveWorkspaceId()
  │          → memberships query returns empty (no workspace!)
  │          → throws "No workspace membership found for current user"
  │
  ⚠ NEW USER IS BLOCKED. Can't proceed without a workspace.

  What SHOULD happen:
  │     After sign-in: check workspace membership
  │     If none: redirect to /onboarding
  │     Onboarding: ACTUALLY creates workspace via auth.api.createOrganization()
  │     Then: redirect to /inbox with workspace context
```

### Path D: Magic link flow

```
Sign-in page → "Send magic link" sub-form
  │
  ▼
Enter email → signIn.magicLink({ email, callbackURL: '/inbox' })
  │
  ├─ SUCCESS: "Magic link sent! Check your email for a sign-in link."
  │  ConsoleTransport prints link to terminal
  │
  ▼
Click magic link
  │
  ⚠ FRICTION: requireEmailVerification: true may block magic link
  │  If the email isn't verified first, magic link errors with
  │  "Email not verified" — user must sign up first
  │  The sign-in page doesn't explain this requirement
  │
  ├─ Verified user → session created → redirect to /inbox
  │  Same workspace issue as Path B
  │
  ├─ Unverified user → error state in magic link form
```

### Path E: OAuth flow

```
Sign-in page → Click Google/GitHub button
  │
  ▼
OAuth redirect → provider consent → callback
  │
  ⚠ Only visible if GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID are configured
  │  OAuthButtons returns null if neither env var is set
  │
  ▼
Better Auth processes OAuth callback
  │  requireEmailVerification: trusted provider emails are auto-verified
  │  Session created → redirect to /inbox (callbackURL)
  │
  ▼
Same workspace issue as Path B — no workspace exists
```

---

## Flow Diagram

```
                    ┌─────────────────────────────┐
                    │      git clone + install     │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  Configure .env.local        │
                    │  (3 DB strings + auth secret)│
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  supabase start              │
                    │  supabase db reset           │
                    │  npm run db:seed             │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  npm run dev → localhost     │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  / → /inbox → middleware     │
                    │  No session → /sign-in       │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐  ┌────▼────┐  ┌───────▼──────┐
     │ Sign up        │  │Sign in  │  │  Magic link  │
     │ (email/pass)   │  │(email)  │  │  / OAuth     │
     └────────┬───────┘  └────┬────┘  └───────┬──────┘
              │               │               │
     ┌────────▼───────┐      │               │
     │ Verify email   │      │               │
     │ (check console)│      │               │
     └────────┬───────┘      │               │
              │               │               │
              └───────┬───────┘──────────────┘
                      │
             ┌────────▼────────┐
             │  /inbox (signed │
             │  in, auth'd)    │
             └────────┬────────┘
                      │
             ┌────────▼────────┐
             │  No workspace   │← CRITICAL BLOCKER
             │  Drizzle throws  │   "No workspace membership found"
             └────────┬────────┘
                      │
             ┌────────▼────────┐
             │  /onboarding    │← Only reachable if user knows URL
             │  (5-step wizard)│   AND has session
             └────────┬────────┘
                      │
             ┌────────▼────────┐
             │  Wizard is      │← CRITICAL BLOCKER
             │  UI-only        │   Nothing is persisted
             │  (no API calls) │
             └────────┬────────┘
                      │
             ┌────────▼────────┐
             │  Redirect to    │
             │  /inbox again   │← Same error state
             └─────────────────┘
```

---

## Friction Points (Priority-Ordered)

| # | Step | Friction | Severity | Impact | Recommendation |
|---|------|----------|----------|--------|---------------|
| 1 | Post sign-in → workspace | **No workspace created on sign-up.** New user lands at `/inbox` after sign-in, but Drizzle queries in workspace layout call `getActiveWorkspaceId()` which throws because user has no workspace memberships. | **CRITICAL** | User cannot use the app — error state shown on every page. The app is unusable after completing the auth flow. | Create a default workspace automatically on sign-up, OR detect "no workspace" state at the workspace layout level and redirect to `/onboarding`. |
| 2 | Onboarding wizard | **Wizard is purely cosmetic (UI-only).** Step 2 collects workspace name/slug but never calls `createOrganization()`. Step 3 collects invites but never sends invitations. Step 4 collects project name/key but never creates a project. Step 5 shows a fictional summary. Clicking "Go to workspace" just redirects to `/inbox`. Nothing is persisted. | **CRITICAL** | Wizard is a deceptive UX — user believes they've created a workspace but nothing happened. Either wire the wizard to actual API calls or remove it. |
| 3 | Post-sign-in → onboarding | **No redirect to onboarding for new users.** There's no check after sign-in for "does user have 0 workspaces → redirect to onboarding." User must know to manually navigate to `/onboarding`. | **CRITICAL** | New users never see the onboarding flow. Combined with #1, they're stuck in an error state with no path forward. | Add "first login → workspace check → redirect" logic to the sign-in handler or workspace layout. |
| 4 | Email verification flow | **autoSignInAfterVerification creates session, but UI redirects to sign-in page (not the app).** The user has a valid session but sees the sign-in form with a "verified" banner. Must manually sign in again or navigate to `/inbox`. | **HIGH** | Wasted step after verification. Adds confusion ("I was auto-signed-in but the app wants me to sign in again"). | After verification succeeds, check for existing session and redirect to `/inbox` instead of `/sign-in?verified=1`. |
| 5 | Post sign-in | **Sign-in completion requires manual click.** After successful credentials, form shows "Signed in!" state instead of auto-redirecting to `/inbox`. | **MEDIUM** | Extra click on every sign-in. Minor but noticeable friction for repeated logins. | Auto-redirect on successful sign-in (after short delay or immediately). |
| 6 | Dev env setup | **Two `.env.example` files with discrepancies.** Root `.env.example` is missing `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`. Apps/web version is more complete. Developer doesn't know which to use. | **MEDIUM** | First-time setup confusion. Developer might copy the wrong file or miss required vars. | Consolidate to one `.env.example` at root. Remove `apps/web/.env.example` or make it a symlink. Ensure all required vars are documented with gen commands. |
| 7 | Email verification in dev | **Developer must find verification URL in terminal output.** ConsoleTransport prints to stdout among Next.js HMR logs, build output, and other noise. URL includes a token parameter — not obviously clickable. | **MEDIUM** | Slows down auth testing. Dev must scroll through terminal to find URL, manually copy and open. Linear's dev flow has a "Click to verify" link in terminal. | Print the verification URL in a clearly delimited box with emoji markers (e.g., `┌── EMAIL ──┐ ... └──────────┘`). Better yet, add a dev-only `/dev/magic-verify?email=` page that auto-verifies without checking the console. |
| 8 | Magic link for unverified users | **requireEmailVerification blocks magic link for new users.** To use magic link, user must first sign up (with password) and verify email. Magic link is only useful for returning users, not first-time users. | **LOW-MEDIUM** | Magic link appears as an option but errors for new users. Sign-in page doesn't explain the email verification requirement. | Add inline explanation: "First time? Sign up first to verify your email, then use magic link." Or defer email verification for magic link in dev mode. |
| 9 | Env var onboarding | **BETTER_AUTH_SECRET must be generated manually.** No script to bootstrap. Developer must know to run `openssl rand -base64 32`. Multiple connection strings (DATABASE_URL, DIRECT_URL, DATABASE_URL_SESSION) with subtle differences. | **LOW-MEDIUM** | Slow first-time setup. Connection string differences (transaction/pooler vs direct vs session-mode) are confusing. | Add a `npm run setup` script that generates `.env.local` with defaults, generates BETTER_AUTH_SECRET, and prints connection string guidance. Document the 3 connection string types clearly. |
| 10 | Supabase local dependencies | **Must have Docker running + Supabase CLI installed.** `supabase start` downloads images on first run (slow). If Docker isn't running, error messages are not helpful. | **LOW** | Friction for developers who don't have Docker. Slows initial setup. | Add prerequisite check in a setup script. Document Docker/Supabase CLI installation steps with links. |
| 11 | Aggressive sign-up rate limit | **Rate limit for /sign-up/email is 5 per hour.** During auth flow development/testing, 5 attempts per hour is restrictive. | **LOW** | Developer can get locked out of testing sign-up. | In dev mode (detected from connectionString or NODE_ENV), increase rate limits or disable them. |

---

## Quick Wins (Easy fixes that improve flow)

1. **Auto-redirect on sign-in completion** — Change `setDone(true)` in `sign-in-form.tsx` to `router.push('/inbox')` after a 500ms delay. Saves one click per sign-in. (2 lines changed)

2. **Auto-redirect to app after email verification** — Instead of redirecting to `/sign-in?verified=1`, check if session exists and redirect to `/inbox`. Saves the "sign in again" step. (5 lines changed in `verify-email-form.tsx`)

3. **Consolidate .env.example files** — Remove `apps/web/.env.example`, keep root as source of truth. Add `NEXT_PUBLIC_BETTER_AUTH_URL` to root `.env.example`. (2 files changed)

4. **Print verification URL with visual delimiter in ConsoleTransport** — Add a prominent box/banner around verification URLs so they're easy to spot in terminal output. (1 file changed: `transport.ts`)

5. **Increase dev-mode rate limits** — Detect local connection string and increase `/sign-up/email` limit from 5/hr to 50/hr or disable entirely. (1 file changed: `server.ts`)

6. **Add "Create workspace" link in the UI for zero-workspace users** — Show a prompt/banner when user has no workspaces, pointing to `/onboarding`. Quick band-aid until proper redirect is implemented. (1 component)

---

## Environment Configuration Audit

### Are all env vars documented with examples?

| Env Var | Documented? | Example Value | Notes |
|---------|-------------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Both | `https://your-project-ref.supabase.co` | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Both | `your-anon-key` | Root also mentions `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` alias |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Both | `your-service-role-key` | — |
| `DATABASE_URL` | ✅ Both | Full example connection string | Port 6543 (transaction pooler) |
| `DIRECT_URL` | ✅ Both | Full example connection string | Port 5432 (direct) |
| `DATABASE_URL_SESSION` | ✅ Both | Full example connection string | Port 5432 (session mode) |
| `BETTER_AUTH_SECRET` | ✅ Both (empty example) | Empty (`=`) | Root has gen command comment; apps/web does NOT |
| `BETTER_AUTH_URL` | ✅ Both | `http://localhost:3000` | — |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | ❌ Root | Missing from root `.env.example` | Present in apps/web version |
| `GOOGLE_CLIENT_ID` | ✅ Both | Empty (`=`) | Optional |
| `GOOGLE_CLIENT_SECRET` | ✅ Both | Empty (`=`) | Optional |
| `GITHUB_CLIENT_ID` | ✅ Both | Empty (`=`) | Optional |
| `GITHUB_CLIENT_SECRET` | ✅ Both | Empty (`=`) | Optional |
| `RESEND_API_KEY` | ✅ Both | Empty (`=`) | ConsoleTransport used when absent |
| `RESEND_FROM` | ✅ Both | `Rejira <noreply@rejira.app>` | — |
| `RESEND_WEBHOOK_SECRET` | ✅ Both | Empty (`=`) | — |
| `UPSTASH_REDIS_REST_URL` | ✅ Both | Empty (`=`) | In-memory fallback in dev |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Both | Empty (`=`) | In-memory fallback in dev |
| `SENTRY_DSN` | ✅ Both | Empty (`=`) | Optional |
| `SENTRY_AUTH_TOKEN` | ✅ Both | Empty (`=`) | Optional |
| `POSTHOG_API_KEY` | ✅ Root, ❌ apps/web | Empty (`=`) | apps/web has `NEXT_PUBLIC_POSTHOG_KEY` instead |
| `POSTHOG_HOST` | ✅ Root, ❌ apps/web | `https://us.i.posthog.com` | apps/web has `NEXT_PUBLIC_POSTHOG_HOST` |
| `NEXT_PUBLIC_POSTHOG_KEY` | ❌ Root, ✅ apps/web | Empty (`=`) | Missing from root |
| `NEXT_PUBLIC_POSTHOG_HOST` | ❌ Root, ✅ apps/web | `https://us.i.posthog.com` | Missing from root |
| `NEXT_PUBLIC_SITE_URL` | ❌ Root, ✅ apps/web | `http://localhost:3000` | Missing from root |
| `NEXT_PUBLIC_APP_URL` | ❌ Root, ✅ apps/web | `http://localhost:3000` | Missing from root |
| `HIBP_API_KEY` | ✅ Both | Empty (`=`) | Optional |
| `BETTER_AUTH_API_KEY` | ✅ Both | Empty (`=`) | 🔴 NOT USED ANYWHERE in the codebase — likely stale |

### Is the .env.example accurate?

**Root `.env.example` (`.env.example`):**
- Missing: `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- Contains `BETTER_AUTH_API_KEY` which is unused in source

**Apps/web `.env.example` (`apps/web/.env.example`):**
- More complete — includes all `NEXT_PUBLIC_*` vars
- Missing gen command comment for `BETTER_AUTH_SECRET` (root version has it)
- Contains `BETTER_AUTH_API_KEY` which is unused in source

### Are there hardcoded dev-only values?

- `server.ts:26-27` — Detects local Supabase via connection string:
  ```ts
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('::1');
  ```
  This controls SSL settings but doesn't affect rate limits or other dev-specific behavior.

- Sign-up rate limit `/sign-up/email`: 5 per hour — same for dev and prod. No dev-mode relaxation.

---

## Recommendations

### Critical (Must Fix)

1. **Wire the onboarding wizard to actual API calls** or remove it. The 5-step wizard collects workspace name, invites, and project details in local state but never persists anything. After completion, the user is redirected to `/inbox` where they still have no workspace. Either:
   - Call `createOrganization()` in the StepCreateWorkspace `onContinue` handler
   - Send actual invitation emails in StepInviteTeam `onContinue`
   - Call the project creation API in StepCreateProject `onContinue`
   - OR cut the wizard to a single "Create your first workspace" step that does one thing

2. **Add post-sign-in workspace detection and redirect.** The workspace layout (`(workspace)/layout.tsx`) should detect when a user has zero workspace memberships and redirect to `/onboarding`. This can be done via:
   - Server-side: check membership count in `getActiveContext()` before fetching data
   - Client-side: after sign-in, redirect to `/onboarding` if no workspace exists

3. **Fix the verify-email → sign-in redirect loop.** After `autoSignInAfterVerification` creates a session, the verification success page should redirect to `/inbox` (not `/sign-in`). This saves a wasted sign-in step.

### High Priority

4. **Consolidate `.env.example`.** Keep one authoritative file at project root. Remove `apps/web/.env.example`. Add all `NEXT_PUBLIC_*` vars to root. Add generation commands for secrets. Remove stale `BETTER_AUTH_API_KEY`.

5. **Add `npm run setup` bootstrap script.** Generates `.env.local` from `.env.example`, runs `openssl rand -base64 32` for `BETTER_AUTH_SECRET`, validates Docker/Supabase CLI are installed, prints connection string guidance.

### Medium Priority

6. **Auto-redirect on successful sign-in.** Replace the static "Signed in!" state with a 500ms delayed redirect to the callback URL.

7. **Improve ConsoleTransport output for emails.** Print verification URLs in a clearly delimited box so they're easy to find in noisy terminal output.

8. **Relax rate limits in dev mode.** When `connectionString` is local, increase `/sign-up/email` limit from 5/hr to 50/hr or disable entirely.

### Low Priority

9. **Add inline documentation for magic link + email verification requirement.** Explain on the sign-in page that first-time users need to sign up and verify before using magic link.

10. **Document the three connection string types clearly.** Add a comment or doc section explaining transaction-mode (6543, app queries), direct (5432, migrations), and session-mode (5432, Better Auth).

---

## Files Examined

| File | Purpose | Findings |
|------|---------|----------|
| `middleware.ts` | Auth route protection | PUBLIC list doesn't include `/onboarding`; session cookie check is cookie-only (no server validation) |
| `lib/auth/server.ts` | Better Auth config | `requireEmailVerification: true`, `autoSignInAfterVerification: true`, rate limits, HIBP check |
| `lib/auth/client.ts` | Auth client | Re-exports auth methods; has `as any` casts for organization methods |
| `lib/auth/get-session.ts` | Server session retrieval | Calls `auth.api.getSession` |
| `lib/auth/require-auth.ts` | Server auth guard | Redirects to `/verify-email` if email not verified |
| `lib/auth/workspace-helpers.ts` | Workspace CRUD | `getActiveWorkspaceId()` throws if no memberships |
| `lib/auth/email-url.ts` | Verification URL builder | Rewrites API URLs to app URLs for the verify page |
| `lib/auth/email.ts` | Email sender | Delegates to transport.render |
| `lib/auth/oauth-config.ts` | OAuth provider config | Returns null if env vars not set |
| `app/(auth)/sign-up/page.tsx` | Sign-up page | Renders SignUpForm + OAuthButtons |
| `components/auth/sign-up-form.tsx` | Sign-up form | On success: shows "Account created!" state (no auto-redirect) |
| `app/(auth)/sign-in/page.tsx` | Sign-in page | Renders SignInForm + MagicLinkForm + OAuthButtons |
| `components/auth/sign-in-form.tsx` | Sign-in form | On success: shows "Signed in!" state (no auto-redirect); has resend verification flow |
| `components/auth/magic-link-form.tsx` | Magic link form | On success: shows "Magic link sent!" state |
| `components/auth/oauth-buttons.tsx` | OAuth buttons | Hidden if env vars not configured |
| `app/(auth)/verify-email/page.tsx` | Verify email page | Renders VerifyEmailForm |
| `app/(auth)/verify-email/verify-email-form.tsx` | Verify email form | After success: redirects to `/sign-in?verified=1` (should redirect to `/inbox`) |
| `app/(auth)/check-email/page.tsx` | Check email page | Shows "We sent a verification link to <email>" |
| `app/(auth)/layout.tsx` | Auth layout | Centered card via AuthShell |
| `components/auth/auth-shell.tsx` | Auth shell wrapper | Branded card container with accent gradient |
| `app/(workspace)/layout.tsx` | Workspace layout | Loads workspace data server-side; requires workspace membership |
| `app/(workspace)/onboarding/page.tsx` | Onboarding page | Renders WorkspaceSetupWizard; has skip-to-workspace for existing users |
| `components/onboarding/workspace-setup-wizard.tsx` | 5-step wizard container | Animated step transitions; state is purely local |
| `components/onboarding/step-welcome.tsx` | Step 1 | Shows name, calls onContinue |
| `components/onboarding/step-create-workspace.tsx` | Step 2 | Collects name/slug, validates, no persistence |
| `components/onboarding/step-invite-team.tsx` | Step 3 | Collects email/role pairs, no persistence |
| `components/onboarding/step-create-project.tsx` | Step 4 | Collects name/key, no persistence |
| `components/onboarding/step-done.tsx` | Step 5 | Shows summary from local state only |
| `.env.example` | Root env template | Missing some NEXT_PUBLIC_* vars; has gen commands |
| `apps/web/.env.example` | App env template | More complete but missing gen commands |
| `lib/email/transport.ts` | Email transport | ConsoleTransport in dev; ResendTransport in prod |
| `lib/email/render.ts` | Email template renderer | Maps template names to render functions |
| `lib/db/rsc.ts` | Server-side Drizzle queries | Uses getActiveContext() which requires workspace membership |
| `hooks/useWorkspaceList.ts` | Client workspace detection | Uses Better Auth organization list client API |
| `components/auth/require-auth.tsx` | Client auth gate | Shows loading skeleton while checking session |
| `app/api/auth/[...all]/route.ts` | Auth route handler | Node runtime; delegates to Better Auth handler |
