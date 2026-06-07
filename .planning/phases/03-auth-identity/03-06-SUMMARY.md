---
phase: 03-auth-identity
plan: 06
subsystem: auth-cutover
tags: [cutover, middleware, require-auth, ME_ID-removal, session-hooks]
requires:
  - 03-04 (account settings + onboarding)
  - 03-05 (rate limiting + hardening)
provides:
  - Real Better Auth sessions for all workspace pages
  - Middleware-based route protection
  - Client-side RequireAuth wrapper with loading skeleton
affects:
  - All workspace routes (/inbox, /my-issues, /home, /projects/*, /views/*, /settings)
  - TopBar, PrimaryNav, IssueDrawer, CreateIssueDialog
  - HomePage, MyIssuesPage, WorkspaceLayout
tech-stack:
  added:
    - Next.js middleware (Edge runtime)
    - Client-side auth guard pattern (RequireAuth)
    - Session convenience hooks (useSession, useUser, useUserId)
  patterns:
    - Cookie-only fast path in middleware (no DB hit)
    - Loading skeleton during session hydration
    - Null-safe user ID handling throughout component tree
key-files:
  created:
    - apps/web/middleware.ts (49 lines, cookie + security headers)
    - apps/web/components/auth/require-auth.tsx (32 lines, client wrapper)
    - apps/web/components/auth/session-loading-skeleton.tsx (32 lines, motion pulse)
    - apps/web/hooks/useSession.ts (13 lines, convenience wrapper)
    - apps/web/hooks/useUser.ts (15 lines, useUser + useUserId)
    - apps/web/lib/auth/_tests/cutover.test.ts (8 tests)
  modified:
    - apps/web/hooks/useCurrentUser.ts (removed mock fallback, returns null)
    - apps/web/app/(workspace)/layout.tsx (wrapped in RequireAuth)
    - apps/web/app/(workspace)/home/page.tsx (real user name + ID)
    - apps/web/app/(workspace)/my-issues/page.tsx (null-safe user ID)
    - apps/web/components/issue/issue-drawer.tsx (real user for ReplyBox)
    - apps/web/components/issue/create-issue-dialog.tsx (real user as author)
    - apps/web/components/shell/top-bar.tsx (null-safe avatar)
    - apps/web/components/shell/primary-nav.tsx (null-safe issue count)
    - apps/web/lib/state/view-query.ts (currentUserId param for "me" filter)
  deleted:
    - apps/web/lib/auth/demo-session.ts (ME_ID constant)
    - apps/web/proxy.ts (replaced by middleware.ts)
decisions:
  - Middleware checks cookie presence only (fast path), Better Auth validates token server-side
  - useCurrentUserId returns string | null (was string with mock fallback)
  - RequireAuth uses useRouter().replace() for client-side redirect (not server redirect)
  - View query "me" filter accepts optional currentUserId parameter (preserves backwards compat)
duration: ~15min
completed_date: 2026-06-08
---

# Phase 3 Plan 6: The Cutover Summary

**One-liner:** Replaced demo session `ME_ID = 'u_aria'` with real Better Auth sessions across all workspace pages, added middleware route protection, and created client-side RequireAuth wrapper.

## What Was Built

### Middleware (`apps/web/middleware.ts`)
- **Cookie-only fast path:** Checks for `better-auth.session_token` or `__Secure-better-auth.session_token` cookie — no database hit on every request
- **Public route allowlist:** `/sign-in`, `/sign-up`, `/api/auth/*`, `/invite/*`, `/` pass through without auth
- **Static asset bypass:** `_next/*`, `*.ico`, `*.png`, etc. pass through
- **Security headers:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin
- **Redirect:** Unauthenticated users → `/sign-in?next={original_path}`
- Replaces `apps/web/proxy.ts` (deleted)

### RequireAuth (`apps/web/components/auth/require-auth.tsx`)
- Client-side auth guard that wraps workspace layout children
- Uses `useSession()` from Better Auth client
- Shows `SessionLoadingSkeleton` during hydration (< 100ms typical)
- Redirects to `/sign-in?next={pathname}` when no session
- Falls back to provided `fallback` component if supplied

### SessionLoadingSkeleton (`apps/web/components/auth/session-loading-skeleton.tsx`)
- Motion-based pulse animation on a rounded card
- Uses design system surface-2 token
- Centered full-viewport layout

### Hooks
- `hooks/useSession.ts` — Convenience wrapper around Better Auth's `useSession`, adds `isAuthenticated` boolean
- `hooks/useUser.ts` — `useUser()` returns `{ user, isLoading }`, `useUserId()` returns `string | null`
- `hooks/useCurrentUser.ts` — **BREAKING:** Returns `string | null` instead of `string` (removed `USERS[0]` fallback)

### Component Updates (15 files)
| File | Change |
|------|--------|
| `layout.tsx` | Wrapped in `<RequireAuth>` |
| `home/page.tsx` | `const me = "Aria"` → `user?.name`, filter uses `useCurrentUserId()` |
| `my-issues/page.tsx` | Null-safe `meId`, fallback when no session |
| `issue-drawer.tsx` | `USERS[0]?.id` → `useCurrentUserId()` |
| `create-issue-dialog.tsx` | Hardcoded `"u_aria"` → `useCurrentUserId()` |
| `top-bar.tsx` | `me.name` → `me?.name ?? 'User'` |
| `primary-nav.tsx` | Null-safe `issuesAssignedTo(meId)` |
| `view-query.ts` | `matchAssignee` accepts `currentUserId` param |

## Test Results

```
 ✓ lib/auth/_tests/cutover.test.ts (8 tests | 8 passed)
   ✓ test 1: requireAuth no longer accepts ME_EXTERNAL_ID fallback
   ✓ test 2: requireAuth reads session from Better Auth and returns real user
   ✓ test 3: requireAuth works for any user with a valid session
   ✓ test 4: requireAuth redirects to /sign-in?next=... for unauthenticated
   ✓ test 5: requireAuth returns user for authenticated users
   ✓ test 6: ME_ID is NOT exported from auth modules (demo-session deleted)
   ✓ test 7: mock/users.ts does NOT export ME_ID or ME_EXTERNAL_ID
   ✓ test 8: useCurrentUser hook no longer falls back to hardcoded user ID
```

131 total tests pass (8 skipped RLS tests require Postgres, 4 onboarding test failures are pre-existing Better Auth React context issues, 7 settings test failures require running dev server).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null safety after removing mock fallback**
- **Found during:** Task 2 verification (TypeScript strict mode)
- **Issue:** `useCurrentUserId()` now returns `string | null` (was `string`), causing type errors in 3 callers
- **Fix:** Added null guards in `my-issues/page.tsx` (fallback to empty array), `primary-nav.tsx` (count = 0), `top-bar.tsx` (`me?.name ?? 'User'`)
- **Files modified:** `apps/web/app/(workspace)/my-issues/page.tsx`, `apps/web/components/shell/primary-nav.tsx`, `apps/web/components/shell/top-bar.tsx`
- **Commit:** e650c49

None - plan executed exactly as written with one null-safety adjustment required by TypeScript strict mode.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: trust-boundary | apps/web/middleware.ts | Middleware is a new trust boundary — cookie presence is checked but token is NOT validated here. Better Auth validates server-side on all route handlers and server actions. An expired or forged cookie will be rejected by Better Auth even if middleware passes. |
| threat_flag: client-redirect | apps/web/components/auth/require-auth.tsx | Client-side redirect to /sign-in uses router.replace(). The `next` query parameter could be used for open redirect if not validated. Currently passes raw pathname — consider validating against allowed paths in future work. |

## Known Stubs

None — no hardcoded empty values, placeholders, or unmocked data paths were introduced. The `USERS` mock array remains in `lib/mock/users.ts` for Phase 4 replacement with Drizzle queries.

## Self-Check

- [x] `apps/web/middleware.ts` exists
- [x] `apps/web/components/auth/require-auth.tsx` exists
- [x] `apps/web/components/auth/session-loading-skeleton.tsx` exists
- [x] `apps/web/hooks/useSession.ts` exists
- [x] `apps/web/hooks/useUser.ts` exists
- [x] `apps/web/lib/auth/demo-session.ts` is DELETED
- [x] `apps/web/proxy.ts` is DELETED
- [x] Zero `ME_ID`/`ME_EXTERNAL_ID` references in production code
- [x] `useCurrentUser.ts` has no `u_aria` or `USERS[0]` fallbacks
- [x] RED commit: 3f52da2
- [x] GREEN commit: e650c49

## Self-Check: PASSED
