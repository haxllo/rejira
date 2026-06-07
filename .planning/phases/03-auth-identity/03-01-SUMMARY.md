---
phase: 03-auth-identity
plan: 01
subsystem: auth
tags: [better-auth, pg-pool, email-password, auth-ui, tdd]
requires: []
provides:
  - Better Auth server with pg.Pool session-mode pooler
  - Email/password authentication with verification and reset
  - Auth UI pages and form components
  - getSession() and requireAuth() server helpers
affects:
  - apps/web/lib/auth/*
  - apps/web/app/api/auth/[...all]/route.ts
  - apps/web/app/(auth)/*
  - apps/web/components/auth/*
  - apps/web/lib/email/*
tech-stack:
  added: []
  patterns: [better-auth-1.6-core-config, tdd-red-green]
key-files:
  created:
    - apps/web/lib/auth/get-session.ts
    - apps/web/lib/auth/require-auth.ts
    - apps/web/lib/auth/_tests/auth.test.ts
    - apps/web/lib/auth/_tests/email.test.ts
    - apps/web/lib/email/templates/password-changed.ts
    - apps/web/app/(auth)/check-email/page.tsx
    - apps/web/components/auth/auth-shell.tsx
    - apps/web/vitest.config.ts
  modified:
    - apps/web/lib/auth/server.ts
    - apps/web/lib/auth/client.ts
    - apps/web/lib/auth/types.ts
    - apps/web/lib/auth/index.ts
    - apps/web/lib/auth/email.ts
    - apps/web/lib/auth/password-policy.ts
    - apps/web/lib/email/render.ts
    - apps/web/app/api/auth/[...all]/route.ts
    - apps/web/app/(auth)/layout.tsx
    - apps/web/app/(auth)/verify-email/page.tsx
    - apps/web/components/auth/sign-in-form.tsx
    - apps/web/components/auth/sign-up-form.tsx
    - apps/web/components/auth/forgot-password-form.tsx
    - apps/web/package.json
    - drizzle.config.ts
decisions:
  - "Better Auth 1.6.14 uses emailAndPassword as a top-level option, not a plugin import"
  - "Client-side password validation via validatePassword() fed into sign-up-form; server enforces minPasswordLength=12"
  - "Email transport wired via sendEmail() helper with env-driven transport selection (ConsoleTransport dev, Resend prod)"
  - "Auth-shell component extracts card layout from layout.tsx for reuse; motion fadeUp entry"
  - "Unit tests use vi.mock for pg.Pool and next/headers to avoid database dependency"
metrics:
  duration: 54m
  completed-date: 2026-06-07
---

# Phase 03 Plan 01: Better Auth Core + Email/Password + Auth UI Summary

**One-liner:** Replaced placeholder `getAuthInstance()` with a real Better Auth 1.6.14 server connected to Supabase Postgres via session-mode pg.Pool, wired email/password authentication with verification and reset flows, and polished all 6 auth UI pages with dark-themed design tokens.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (auth files only) | PASS (0 auth-specific errors) |
| `npx vitest run lib/auth/_tests/` | PASS (22/22 tests) |
| `npm run lint` | Not run (pre-existing ESLint config missing) |
| `npm run build` | Not run (pre-existing motion/react dependency issue) |

**Test breakdown:** 10 auth server tests + 12 email/password policy tests = 22 total

## Completed Tasks

### Task 1: Wire Better Auth server with pg.Pool and route handler (TDD)

**RED commit:** `4bca4ce` — Added 10 failing tests for auth server, getSession, requireAuth
**GREEN commit:** `4694590` — Implemented full Better Auth server with pg.Pool
**Fix commit:** `2e486fb` — Removed invalid `emailAndPassword` plugin import (core feature in BA 1.6)

**What was built:**
- `apps/web/lib/auth/server.ts`: Real Better Auth singleton with pg.Pool → `DATABASE_URL_SESSION`, email/password config (min 12 chars, require verification), session config (7d expiry, 1d update, 5m JWE cache, 1h fresh), additional user fields (`avatarUrl`, `avatarColor`, `status`), rate limiting (30/min, database storage), nextCookies plugin
- `apps/web/lib/auth/get-session.ts`: Server-side session reader using `headers()` from next/headers
- `apps/web/lib/auth/require-auth.ts`: Auth guard with redirects for unauthenticated (/sign-in) and unverified (/verify-email)
- `apps/web/lib/auth/types.ts`: Inferred `AuthUser` and `AuthSession` from `auth.$Infer`
- `apps/web/lib/auth/index.ts`: Updated barrel exports
- `apps/web/app/api/auth/[...all]/route.ts`: Simplified to direct `toNextJsHandler(auth)` export — no lazy init
- `apps/web/lib/auth/client.ts`: Removed bulk `as any` casts, proper typed exports
- `apps/web/lib/auth/password-policy.ts`: Enhanced with ~50 common password blocklist, case/digit checks
- `drizzle.config.ts`: Added `'auth'` to schemaFilter

### Task 2: Build email transport + React Email templates + email/password flows (TDD)

**RED commit:** `311358b` — Added 12 tests for password policy, email templates, transport
**GREEN commit:** `f9b1800` — Wired email callbacks and password-changed template

**What was built:**
- Wired `sendVerificationEmail` callback in `emailVerification` config → calls `sendEmail()` with verify-email template
- Wired `sendResetPassword` callback in `emailAndPassword` config → calls `sendEmail()` with reset-password template
- Created `password-changed` email template with security notice
- Enhanced `render.ts` with template registry wrapping inline templates
- `sendEmail()` helper in `email.ts` picks transport by env (ConsoleTransport dev, Resend prod)
- Client-side password validation via `validatePassword()` in sign-up-form

### Task 3: Build auth UI pages and form components

**Commit:** `0f21dc8` — Polished all auth UI

**What was built:**
- Removed `as any` casts from `sign-in-form.tsx` and `sign-up-form.tsx` — use `'error' in res` type narrowing
- Updated `verify-email/page.tsx` to use `authClient.verifyEmail()` instead of raw fetch
- Created `check-email/page.tsx` with email parameter display from searchParams
- Created `auth-shell.tsx` component with motion fadeUp, centered card, rejira brand mark
- Refactored `(auth)/layout.tsx` to use `AuthShell` component
- Fixed `forgot-password-form.tsx` to use typed `forgetPassword` export
- All forms handle loading, error, and success states
- All auth pages use dark-themed design tokens from globals.css

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] emailAndPassword is not a plugin in Better Auth 1.6.14**
- **Found during:** Task 1 typecheck
- **Issue:** `import { emailAndPassword } from 'better-auth/plugins'` — no such export. BA 1.6.x uses `emailAndPassword` as a top-level configuration option.
- **Fix:** Removed plugin import; `emailAndPassword` config stays as a top-level option in `betterAuth()` call.
- **Files modified:** `apps/web/lib/auth/server.ts`
- **Commit:** `2e486fb`

**2. [Rule 1 - Bug] passwordValidator callback doesn't exist in Better Auth 1.6.14**
- **Found during:** Task 2 implementation
- **Issue:** `passwordValidator` callback in `emailAndPassword` config doesn't exist. BA 1.6 uses built-in `minPasswordLength`/`maxPasswordLength` only.
- **Fix:** Removed `passwordValidator` callback; client-side validation via `validatePassword()` in sign-up-form, server enforces `minPasswordLength: 12`.
- **Files modified:** `apps/web/lib/auth/server.ts`

**3. [Rule 3 - Blocking] authClient.forgetPassword not inferred from complex plugin union type**
- **Found during:** Task 1 typecheck
- **Issue:** TypeScript union of organization/magicLink/twoFactor client plugins prevents inference of `forgetPassword` method.
- **Fix:** Wrapped in typed function with `as unknown as Record<string, CallableFunction>` cast.
- **Files modified:** `apps/web/lib/auth/client.ts`

**4. [Rule 1 - Bug] TemplateFn type incompatibility**
- **Found during:** Task 2 typecheck
- **Issue:** Inline templates have specific prop types (`{ name: string }`) but registry uses `Record<string, string>`. TypeScript rejects the narrower types.
- **Fix:** Wrapped templates in adapter functions that accept `Record<string, string>` and destructure only needed props.
- **Files modified:** `apps/web/lib/email/render.ts`

**5. [Rule 3 - Blocking] @better-auth/cli version mismatch**
- **Found during:** Task 1 dependency install
- **Issue:** `^1.6.14` doesn't exist for `@better-auth/cli` (latest is `1.5.0-beta.13`).
- **Fix:** Changed to `^1.4.22`.
- **Files modified:** `apps/web/package.json`

## Known Stubs

| File | Line | Stub |
|------|------|------|
| `apps/web/lib/auth/password-policy.ts` | 53 | `checkBreach()` returns `Promise.resolve(false)` — HIBP integration deferred to Plan 03-05 |
| `apps/web/lib/auth/rate-limit.ts` | 15-31 | In-memory rate limiter — Better Auth database rate limiter is the authoritative ceiling |
| `apps/web/lib/auth/demo-session.ts` | 2 | `ME_ID = 'u_aria'` — preserved for Plan 03-06 transition |
| `apps/web/lib/email/transport.ts` | 30-60 | `ResendTransport` uses direct `fetch` to Resend API — functional but untested in integration |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: session-cookie | `apps/web/lib/auth/server.ts` | Session cookie configured with `cookieCache` JWE — verify httpOnly/secure/sameSite in prod deployment |
| threat_flag: email-callback | `apps/web/lib/auth/server.ts:26-32,41-47` | `sendVerificationEmail` and `sendResetPassword` callbacks receive raw request — HTML content rendered from user-controlled `user.name` should be sanitized if templates are user-customizable |

## Self-Check: PASSED

All created files verified existing on disk. All commit hashes verified in git log:
- `4bca4ce` — RED test commit
- `4694590` — GREEN implementation commit
- `2e486fb` — emailAndPassword fix
- `311358b` — email RED test
- `f9b1800` — email GREEN implementation
- `0f21dc8` — auth UI polish
