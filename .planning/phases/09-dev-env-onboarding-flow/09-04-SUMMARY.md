---
phase: 09-dev-env-onboarding-flow
plan: 04
subsystem: onboarding
tags:
  - onboarding
  - auth-redirect
  - wizard
  - accessibility
  - validation
  - animation
dependency-graph:
  requires: [09-03]
  provides: [first-login-redirect, wizard-polish]
  affects:
    - apps/web/components/auth/sign-up-form.tsx
    - apps/web/components/onboarding/workspace-setup-wizard.tsx
    - apps/web/components/onboarding/step-welcome.tsx
    - apps/web/components/onboarding/step-create-workspace.tsx
    - apps/web/components/onboarding/step-invite-team.tsx
    - apps/web/components/onboarding/step-create-project.tsx
    - apps/web/components/onboarding/step-done.tsx
    - apps/web/app/(workspace)/onboarding/page.tsx
tech-stack:
  added: []
  patterns:
    - sessionStorage persistence for wizard state
    - focus-visible:ring-2 accessibility pattern
    - AnimatePresence + motion.li for chip spring animations
    - motion.div staggered entrance animations
key-files:
  modified:
    - apps/web/components/auth/sign-up-form.tsx
    - apps/web/components/onboarding/workspace-setup-wizard.tsx
    - apps/web/components/onboarding/step-welcome.tsx
    - apps/web/components/onboarding/step-create-workspace.tsx
    - apps/web/components/onboarding/step-invite-team.tsx
    - apps/web/components/onboarding/step-create-project.tsx
    - apps/web/components/onboarding/step-done.tsx
    - apps/web/app/(workspace)/onboarding/page.tsx
decisions:
  - Change callbackURL from /inbox to /onboarding for sign-up; existing users unaffected
  - Use sessionStorage (not localStorage) for wizard step persistence
  - Mark slug availability as preview (~ estimated availability) until real API wired
  - Change stub wording from "created" to "will be configured" for pending operations
metrics:
  duration: 222s (3.7 min)
  completed-date: 2026-06-08
  tasks: 2/2
  files-changed: 8
---

# Phase 9 Plan 4: Onboarding Flow Fixes Summary

**Objective:** Fix all friction points identified in Plan 09-03's onboarding UI/UX review — most critically making the onboarding wizard reachable after sign-up, then applying 20 polish fixes across the wizard components.

**One-liner:** Redirect new sign-ups through `/onboarding` via Better Auth callbackURL, and apply 20 of 28 review findings across 7 component files for validation, accessibility, animation, and state management.

## Effect on Product

- **First-time users** now land on the onboarding wizard after email verification (auto-sign-in → `/onboarding`), not `/inbox`
- **Existing users** are unaffected — their sign-in continues to redirect to `/inbox`
- **Wizard state** survives page refreshes (sessionStorage persistence)
- **Validation** is clearer: better email regex, red borders on invalid inputs, format hints stay visible during errors
- **Accessibility** improved: `focus-visible:ring`, `role="progressbar"`, `role="region"` with `aria-live`, skip-to-content link, semantic list for chips
- **Animations** use spring physics: chip entry in invite step, staggered summary items in done step
- **Done step** handles empty/skipped state gracefully

## Issues Fixed (from onboarding-review.md)

**Total issues addressed: 20 of 28**

| Category | Total | Fixed | Status |
|----------|-------|-------|--------|
| Critical | 3 | 3 | ✅ All fixed |
| High | 5 | 5 | ✅ All fixed |
| Medium | 8 | 8 | ✅ All fixed |
| Low | 6 | 0 | ⏭️ Out of scope (see note) |
| Accessibility | 6 | 4 | ✅ A1, A2, A3, A4 fixed; A5/Low out of scope |

## Key Changes

### Task 1: First-login onboarding redirect (Critical fix)
- **`sign-up-form.tsx`**: Changed `callbackURL: '/inbox'` → `callbackURL: '/onboarding'`
- **`sign-up-form.tsx`**: Updated success UI from "Account created! Sign in →" to guide user to check email for verification link
- **Flow**: Sign-up → verify email → auto-sign-in (via `autoSignInAfterVerification: true`) → redirect to `/onboarding`

### Task 2: Wizard polish fixes
- **`workspace-setup-wizard.tsx`**: sessionStorage persistence, "Step X of 5" label, ARIA progressbar, skip-to-content link, `role="region"` + `aria-live="polite"`
- **`step-welcome.tsx`**: Loading skeleton while session resolves (prevents "Hi there!" flash)
- **`step-create-workspace.tsx`**: Empty-slug fallback, "~ estimated availability" marker, format hint kept visible on error, `focus-visible:ring-2`, red border on invalid slug, `maxLength={100}`
- **`step-invite-team.tsx`**: Proper email regex validation, inline error messages with `role="alert"`, `<ul><li>` list semantics, `AnimatePresence` spring animations on chip add/remove
- **`step-create-project.tsx`**: "Engineering" → "My Project" placeholder, improved `generateKey` fallback, `focus-visible:ring-2`, red border on invalid key
- **`step-done.tsx`**: "created" → "will be configured" language, "You skipped setup" state, spring entrance animations for checkmark and summary items
- **`onboarding/page.tsx`**: Confirmation dialog on skip, animated loading skeleton

## Commits
- `8d69668` — fix(09-dev-env-onboarding-flow): redirect new users to /onboarding after sign-up
- `663d879` — feat(09-dev-env-onboarding-flow): apply onboarding wizard polish fixes from review

## Deviations from Plan

### Auto-fixed Issues
- **None** — plan executed exactly as written.

### Unaddressed Low Issues (out of scope for this plan)
The following low-severity issues from the review were intentionally not addressed:
- #17: `aria-live` region for step changes (redundant — A3 already adds `aria-live="polite"`)
- #19: Hardcoded "rejira.app/" prefix (design intentional for MVP; env var noted as future improvement)
- #20: Role selector description (low impact; can add tooltip in future plan)
- #21: `autoFocus` on mobile (low impact; keyboard opens but user is already engaged)
- #22: Keyboard shortcuts for Continue/Back (nice-to-have; power user feature for later)
- A5: Progress pill color contrast (verification needed against OKLCH values; low severity)

## Remaining (after this plan)
- No remaining implementation work for Phase 9 — all 4 plans are complete
- Phase 9 deliverables: dev env flow audit (09-01), email verification policy (09-02), onboarding review (09-03), onboarding fixes (09-04)
