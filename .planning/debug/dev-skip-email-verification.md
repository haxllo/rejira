---
slug: dev-skip-email-verification
status: awaiting_human_verify
trigger: user-reported
created: 2026-06-09
updated: 2026-06-09
goal: find_and_fix
tdd: false
---

## Current Focus

reasoning_checkpoint:
  hypothesis: requireAuth() in lib/auth/require-auth.ts unconditionally checks session.user.emailVerified and redirects to /verify-email without consulting DEV_SKIP_EMAIL_VERIFICATION env var
  confirming_evidence:
    - "require-auth.ts lines 14-16 have `if (!session.user.emailVerified) { redirect('/verify-email'); }` with no env var check"
    - "server.ts lines 29-31 correctly compute skipEmailVerification and use it in Better Auth config"
    - "middleware.ts only checks session cookie existence — no email verification logic"
    - "Grep of entire codebase confirms require-auth.ts is the ONLY file performing an independent email verification redirect"
  falsification_test: "If DEV_SKIP_EMAIL_VERIFICATION was already referenced in require-auth.ts, this hypothesis would be wrong"
  fix_rationale: "Adding the same skipEmailVerification guard (DEV_SKIP_EMAIL_VERIFICATION === 'true' && NODE_ENV !== 'production') to the emailVerified check in requireAuth() makes the server-side auth guard consistent with Better Auth's own config. Both paths use the same env var logic."
  blind_spots: "No blind spots remain — the full redirect chain has been traced: middleware (cookie check only) → workspace layout (calls requireAuth()) → requireAuth() (the bug location). No other code intercepts before requireAuth."

## Symptoms

- **Expected behavior:** After sign-in with `DEV_SKIP_EMAIL_VERIFICATION=true`, user should land on inbox or onboarding, not /verify-email
- **Actual behavior:** POST /api/auth/sign-in/email returns 200, but GET /inbox returns 307 (redirect) to /verify-email
- **Error messages:** No visible error - just a redirect chain: sign-in success → attempt to load inbox → 307 redirect to /verify-email
- **Environment:** Local dev, DEV_SKIP_EMAIL_VERIFICATION=true set in .env.local
- **Reproduction:** Create new account via sign-up, sign in with credentials, observe redirect to /verify-email instead of landing page

## Eliminated

- hypothesis: middleware.ts blocks unverified users
  evidence: middleware.ts only checks for session cookie existence. No email verification logic at all.
  timestamp: 2026-06-09
- hypothesis: Better Auth config ignores DEV_SKIP_EMAIL_VERIFICATION
  evidence: server.ts lines 29-31 compute skipEmailVerification, and it's correctly used in requireEmailVerification (line 45) and sendOnSignUp (line 58).
  timestamp: 2026-06-09
- hypothesis: Client-side RequireAuth component checks email verification
  evidence: Read the client component at components/auth/require-auth.tsx. It only checks for session existence, not emailVerified.
  timestamp: 2026-06-09

## Evidence

- timestamp: 2026-06-09
  checked: apps/web/lib/auth/require-auth.ts
  found: Lines 14-16 unconditionally check session.user.emailVerified and redirect to /verify-email. No reference to DEV_SKIP_EMAIL_VERIFICATION exists in this file.
  implication: The server-side auth guard is the independent check that bypasses the dev flag
- timestamp: 2026-06-09
  checked: apps/web/lib/auth/server.ts
  found: Lines 29-31 correctly compute skipEmailVerification from DEV_SKIP_EMAIL_VERIFICATION env var. Used at line 45 (requireEmailVerification: !skipEmailVerification) and line 58 (sendOnSignUp: !skipEmailVerification).
  implication: Better Auth config is correct — the problem is the app's own auth guard
- timestamp: 2026-06-09
  checked: Full codebase grep for emailVerified and verify-email
  found: Only require-auth.ts has an independent email verification check that causes redirects. All other references are in tests, email templates, the verify-email page itself, or the middleware's public path list.
  implication: require-auth.ts is the sole root cause with no other independent checks
- timestamp: 2026-06-09
  checked: apps/web/middleware.ts
  found: Only checks for session cookie existence (/sign-in redirect). No email verification logic.
  implication: Middleware is not involved in the redirect loop
- timestamp: 2026-06-09
  checked: apps/web/components/auth/require-auth.tsx
  found: Client component only checks for session existence. Does not check emailVerified.
  implication: Not a contributor to the bug

## Resolution

root_cause: require-auth.ts unconditionally checks session.user.emailVerified and redirects unverified users to /verify-email, ignoring the DEV_SKIP_EMAIL_VERIFICATION env var. The Better Auth config correctly skips email verification in dev, but the app's own server-side auth guard (requireAuth()) independently enforces the check without consulting the env var.

fix: Added `skipEmailVerification` constant at module scope (same logic as server.ts) and added `&& !skipEmailVerification` to the email verification check on line 18. When DEV_SKIP_EMAIL_VERIFICATION=true and NODE_ENV != 'production', the redirect is skipped.

verification: Code review — fix is consistent with how server.ts handles the same env var. The redirect chain is: middleware (cookie only) → layout/page calls requireAuth() → requireAuth() now checks skipEmailVerification. All existing pre-auth email verification is handled by Better Auth config (requireEmailVerification: !skipEmailVerification), so there's no security gap — Better Auth already allows unverified sign-ins in dev mode; requireAuth() was the only thing blocking them afterwards.

files_changed: [apps/web/lib/auth/require-auth.ts]
