# 09-01-SUMMARY: Dev Environment Setup Flow Audit

**Status:** Complete
**Completed:** 2026-06-08

## Key Findings

1. **Onboarding wizard is purely cosmetic (CRITICAL)** — The 5-step wizard collects workspace name, invites, and project data in local React state but never calls any API. Nothing is persisted. The "Done" screen shows a fictional summary. This is the most significant finding — the wizard is a UI prototype, not a functional flow.

2. **New users have no path to a workspace after sign-in (CRITICAL)** — After sign-up + email verification + sign-in, the user lands at `/inbox` where Drizzle queries fail with "No workspace membership found." There is no redirect to `/onboarding`. No default workspace is created. The app is unusable.

3. **Email verification has a wasted double hop** — `autoSignInAfterVerification: true` creates a session on email verification, but the UI redirects to `/sign-in?verified=1` where the user must sign in again. The session already exists — the redirect should go to `/inbox`.

4. **Discrepant `.env.example` files** — Root `.env.example` is missing several `NEXT_PUBLIC_*` vars that `apps/web/.env.example` includes. `BETTER_AUTH_API_KEY` appears in both but is unused. No single authoritative source exists.

5. **ConsoleTransport makes verification URLs hard to find** — Email output is buried in Next.js HMR/build logs. Linear's dev flow has a "Click here to verify" terminal link; this project prints the URL without visual emphasis.

## Friction Points Found

| # | Step | Friction | Severity |
|---|------|----------|----------|
| 1 | Post sign-in → workspace | No workspace created on sign-up — Drizzle throws | CRITICAL |
| 2 | Onboarding wizard | Wizard is UI-only — nothing is persisted | CRITICAL |
| 3 | Post sign-in → onboarding | No redirect to onboarding for new users | CRITICAL |
| 4 | Email verification flow | autoSignIn creates session but UI redirects to sign-in again | HIGH |
| 5 | Post sign-in | Sign-in requires manual click to proceed | MEDIUM |
| 6 | Dev env setup | Two discrepant .env.example files | MEDIUM |
| 7 | Email verification | Verification URL hard to find in terminal noise | MEDIUM |
| 8 | Magic link | Blocked by email verification for new users | LOW-MEDIUM |
| 9 | Env var setup | BETTER_AUTH_SECRET must be generated manually | LOW-MEDIUM |
| 10 | Supabase local stack | Docker + Supabase CLI required; slow first start | LOW |
| 11 | Rate limits | Sign-up limit of 5/hr aggressive for dev testing | LOW |

## Key Recommendations

1. **Wire onboarding wizard to real API calls** (workspace creation via `createOrganization()`, invitation sending, project creation) or reduce to a single-step "Create workspace" page
2. **Add post-sign-in workspace detection** — redirect users with no workspace memberships to `/onboarding`
3. **Fix verify-email redirect** — go to `/inbox` instead of `/sign-in` when auto-sign-in session exists
4. **Consolidate `.env.example`** to one authoritative root file
5. **Improve ConsoleTransport** with visually delimited email output boxes
6. **Relax rate limits in dev mode** — detect local connection string and increase limits

## Files Modified

| File | Change |
|------|--------|
| `.planning/phases/09-dev-env-onboarding-flow/dev-env-audit.md` | Created (audit document, ~400 lines) |

## Paths Analyzed

- **Path A:** First-time setup (git clone → running app) — 9 steps, 1 friction point (#6, #9, #10)
- **Path B:** Sign-up and auth flow — 6 substeps, 3 friction points (#4, #5, #7)
- **Path C:** First workspace experience — 3 substeps, 3 critical friction points (#1, #2, #3)
- **Path D:** Magic link flow — 3 substeps, 1 friction point (#8)
- **Path E:** OAuth flow — 3 substeps, 0 unique friction points (shares workspace issues)
