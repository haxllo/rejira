# Onboarding Flow UI/UX Review

**Plan:** 09-03 — Onboarding UI/UX Clarity Review
**Reviewer:** Execution agent (Plan 09-03)
**Date:** 2026-06-08
**Scope:** 5-step onboarding wizard + auth flow routing

---

## Critical Issues

Issues that block or prevent users from completing onboarding.

| # | Issue | Location | Severity | Description | Proposed Fix |
|---|-------|----------|----------|-------------|-------------|
| 1 | **No post-sign-in redirect to `/onboarding` for new users** | `signUp.email({ callbackURL: '/inbox' })` in `sign-up-form.tsx:20`, `signIn.email({ callbackURL: '/inbox' })` in `sign-in-form.tsx:32`, middleware `PUBLIC` list, workspace layout | **Critical** | After sign-up → email verification → sign-in, the user lands on `/inbox`. There is zero code that checks if the user is new or has zero workspaces and redirects to `/onboarding`. The onboarding wizard is entirely unreachable through the natural sign-up flow. Only reachable by manually typing `/onboarding` in the URL bar. | After sign-in, check if user has any workspaces (via `useDefaultWorkspace` or a server-side session check). If zero workspaces, redirect to `/onboarding` instead of `/inbox`. This could be a middleware check (cookie-based flag), a server action in the workspace layout, or a client-side check in the workspace layout. |
| 2 | **Wizard state is purely local — lost on refresh** | `workspace-setup-wizard.tsx:35-40` — `useState<WizardState>` | **Critical** | If a user refreshes mid-wizard (step 2, 3, or 4), ALL state is lost — step resets to 1, workspace name/slug cleared, invites cleared, project cleared. User must restart from step 1. | Persist wizard state to `sessionStorage` (not `localStorage` — no reason to retain after completion). On mount, read from `sessionStorage` and restore. Clear on completion. Alternatively, use URL search params (`?step=2`) for at least the step number. |
| 3 | **All data operations are stubbed — API failures silently succeed** | `step-create-workspace.tsx:50-54` — slug check always returns `true`; no actual API calls made for any step | **Critical** | The entire wizard collects data but does NOT send it anywhere. When real API calls are wired, failures (workspace creation fails, invite email bounces, slug taken) will have zero error handling UX. User will be stuck or misled. | Wire real API calls in Plan 09-04 (or Phase 4). At minimum, add error states, retry buttons, and inline error messages for each mutation step. Until then, add a comment noting the stub. |

---

## High Issues

Significant confusion or friction that degrades the experience.

| # | Step | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 4 | All steps — Progress indicator | **No step numbers or labels on progress pills** | **High** | The 5 horizontal pills show step position (filled/active/inactive) but have NO numbers, labels, or tooltips. User cannot tell "Step 2 of 5" or what step 3 is about without advancing. | Add numeric labels inside each pill (1, 2, 3, 4, 5) or below. Add small text label or tooltip. At minimum, show "Step 2 of 5" text above or below the pills. |
| 5 | Step 2 (Create Workspace) | **Slug "availability check" always returns true — fake UX** | **High** | The debounced check (`setTimeout` → `setSlugAvailable(true)`) always reports "Available" regardless of actual state. When real validation is wired, the existing UX pattern will work, but currently it's misleading — user may assume the system checked server-side. | Wire real slug uniqueness API call, or disable the check display until real validation exists. If keeping as placeholder, add a visual indicator that it's a preview (e.g., "… estimated availability"). |
| 6 | Step 2 (Create Workspace) | **"Invalid format" message is insufficiently helpful** | **High** | When the slug has invalid characters, the only feedback is "Invalid format" in red. Doesn't tell the user *what* is valid (only shown before they type: "3-32 characters, lowercase letters, numbers, and hyphens"). Once the error state is triggered, the format hint disappears. | Keep the format hint visible even when showing the error, or combine them: "Invalid format — use 3-32 lowercase letters, numbers, and hyphens". |
| 7 | Step 3 (Invite Team) | **Email validation is too permissive** | **High** | Only checks `trimmed.includes('@')` — no domain validation, no TLD check. `user@` would pass. No feedback on what valid email looks like if user mistypes. | Validate against a proper email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Show error inline on the Add button or the input. Provide an example in the hint text. |
| 8 | Step 5 (Done) | **No actual data persisted — summary shows things that didn't happen** | **High** | The done step shows "Workspace 'X' created" and "Project 'Y' created" but no server mutations have occurred. This is fine for Phase 3 (stubbed), but without any indication that these are *pending* or *will happen on confirmation*, it's misleading. | Either show a spinner during submission, or add a "Saving…" intermediate state. If keeping as wizard-only, change language to "Your workspace will be configured" instead of "created". The current wording implies completion. |

---

## Medium Issues

Noticeable but not blocking. Affects polish, clarity, or edge cases.

| # | Step | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 9 | Step 1 (Welcome) | **Session loading flash — brief "Hi !" possible** | **Medium** | `useSession()` may be pending when `StepWelcome` renders. `displayName` falls back to email, then 'there'. If session hasn't loaded yet, it briefly shows "Hi there!" then re-renders. Not broken, but a tiny flash is possible. | Add a brief loading skeleton or use `isPending` from `useSession()` to show a minimal state while session resolves. |
| 10 | Step 2 (Create Workspace) | **Auto-generated slug can produce empty string** | **Medium** | `generateSlug` runs `.replace(/[^a-z0-9]+/g, '-')` then trims leading/trailing hyphens. Input like "!!!@@@" produces "". This would fail `isValidSlug` (length < 3), but the user sees no auto-generated slug and may not know why. | Fallback: if `generateSlug` produces empty or < 3 chars, use a default prefix like "workspace-" + random string. Or disable the auto-slug when input is all-special-chars. |
| 11 | Step 4 (Create Project) | **Auto-generated key can produce empty string** | **Medium** | If project name is "1234!!!" — no uppercase letters — `generateKey` returns 'PROJ' (fallback). But if name is "AB" (2 chars), it works. The fallback is reasonable, but the auto-generation boundary cases aren't communicated to the user. | Add a helper text note: "Project key is auto-generated from the name. Can be 2-5 uppercase letters." Show the generated key preview. |
| 12 | Step 4 (Create Project) | **Placeholder "Engineering" assumes a specific use case** | **Medium** | Placeholder text "Engineering" biases toward engineering teams. A marketing team or design team might not relate. | Use a more generic placeholder like "My Project" or "Product" — neutral across team types. |
| 13 | Step 3 (Invite Team) | **No visual feedback when Enter adds an invite** | **Medium** | Pressing Enter adds the invite (via `handleKeyDown`) but there's no animation or highlight — the email chip just appears. Could feel unresponsive. | Add a brief spring-animated entry for new chips (Motion `AnimatePresence` with `layout`). A subtle scale-up from 0.95 → 1 on entry. |
| 14 | Workspace onboarding page | **"Skip to workspace" banner shows when user has workspaces but doesn't explain what happens to wizard data** | **Medium** | The banner says "You already have N workspace(s). [Skip to workspace]". It doesn't clarify whether skipping discards all wizard input (it does — state resets). User might skip, then return, find no workspace was created. | Add a confirmation: "Navigating away will discard your current setup. Proceed?" or show a tooltip on the skip button. |
| 15 | Step 5 (Done) | **Generic "Your workspace is ready" when everything was skipped** | **Medium** | If user skipped steps 2 (workspace) and 4 (project) and added no invites, the only summary item is "Your workspace is ready" — but no workspace was actually created (in the stubbed flow). Contradiction. | Only show "Your workspace is ready" if a workspace was actually created. If user skipped everything, show "You skipped setup. You can set up your workspace later." Or better, if workspace wasn't created, don't let them reach done without one. |
| 16 | Global | **No step indicator showing progress as fraction** | **Medium** | Only colored pills — no "Step 2/5" text anywhere. User must count pills to know how far along they are. | Add small "Step 2 of 5" text centered below the pills or beside them. |

---

## Low Issues

Polish, nice-to-have, or minor edge cases.

| # | Step | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 17 | All steps | **No `aria-live` region for step changes** | **Low** | When AnimatePresence switches steps, screen readers may not announce the new step content automatically. | Add `role="region"` with `aria-live="polite"` around the animated wrapper, or `aria-label` on each step container identifying the step. |
| 18 | All steps | **Progress pills have no accessible semantics** | **Low** | The pill indicators are plain `<div>` elements with no `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, or `aria-label`. Screen readers see 5 generic divs. | Add `role="progressbar"` with `aria-valuenow={step}` and `aria-valuemax={5}` to the container. Or add `aria-label="Step X of 5"` to each pill. |
| 19 | Workspace URL input | **Prefix "rejira.app/" is hardcoded** | **Low** | The URL preview shows "rejira.app/" before the slug input. This is fine for production but may not match local dev or preview domains. | Make the domain prefix configurable (env var `NEXT_PUBLIC_APP_URL` or detect from `window.location`). |
| 20 | Step 3 (Invite Team) | **Role selector default "member" may not be obvious** | **Low** | The role dropdown defaults to "Member". No tooltip or help text explains the difference between Member and Admin. A first-time user may not know which to choose. | Add a brief description: "Members can view and create issues. Admins can manage workspace settings and billing." Or show it on hover/select. |
| 21 | Step 2 (Create Workspace) | **autoFocus may not work on mobile (keyboard opens)** | **Low** | `autoFocus` on the workspace name input opens the keyboard immediately on mobile. This may obscure the welcome message and feel jarring. | Remove `autoFocus` from step 2 (user just navigated from step 1 — they're already engaged). Keep it only for steps that begin a new input task. |
| 22 | All steps | **No keyboard shortcut for Continue (Enter) / Back (Escape)** | **Low** | The wizard responds to individual input Enter keys (step 3's invite), but there's no global keyboard shortcut for Continue/Back at the step level. Power users would benefit. | Add `onKeyDown` on the step container: Enter triggers Continue, Escape triggers Back. |

---

## Flow Completeness & Routing (Deep Trace)

### Full Path: Sign Up → Onboarding (intended vs. actual)

```
SIGN UP (/sign-up)
  → SignUpForm: signUp.email({ callbackURL: '/inbox' })
  → Displays "Account created! Sign in →" link
  → User clicks → navigated to /sign-in

SIGN IN (/sign-in)
  → SignInForm: signIn.email({ callbackURL: '/inbox' })
  → OR OAuth / Magic Link — callbackURL also '/inbox'
  → On success, Better Auth redirects to /inbox

MIDDLEWARE (middleware.ts)
  → /inbox is NOT in PUBLIC list
  → Checks for better-auth.session_token cookie
  → Cookie present → session valid → passes through
  → Non-PUBLIC path with valid session → NextResponse.next()

WORKSPACE LAYOUT ((workspace)/layout.tsx)
  → Requires authentication (RequireAuth component)
  → Renders TopBar, PrimaryNav, children
  → NO code checks if user has 0 workspaces
  → NO redirect to /onboarding

RESULT: User lands on /inbox. Onboarding is unreachable.
```

**No redirect mechanism exists anywhere:**

| Location | What it does | Onboarding redirect? |
|----------|-------------|---------------------|
| `sign-up-form.tsx` | `callbackURL: '/inbox'` | ❌ |
| `sign-in-form.tsx` | `callbackURL: '/inbox'` | ❌ |
| `middleware.ts` | Session check + locale + security headers | ❌ No new-user detection |
| `(workspace)/layout.tsx` | RequireAuth + data hydration | ❌ No onboarding check |
| `require-auth.tsx` | Redirects to /sign-in if no session | ❌ Only auth check, no onboarding redirect |
| `useDefaultWorkspace.ts` | Returns first workspace or null | Exists but **never called** for onboarding redirect |

### What would need to change:

To make onboarding reachable, one of:
1. **Workspace Layout server action**: After `RequireAuth`, check if user has zero memberships → redirect to `/onboarding` before rendering children. `useDefaultWorkspace()` would return null → check that.
2. **Better Auth callback**: Change `callbackURL` to something the middleware can intercept based on user's workspace count (but middleware can't easily do this without a DB call).
3. **Client-side redirect in the workspace layout**: A small `'use client'` component that checks `useWorkspaceList()` and redirects to `/onboarding` if `workspaces.length === 0` and `!isLoading`.

---

## Edge Cases

| # | Scenario | Current Behavior | Expected Behavior |
|---|----------|-----------------|-------------------|
| 1 | **Refresh mid-wizard (step 3)** | All local state lost. Step resets to 1. User must re-enter workspace name, slug, and invites. | Restore wizard state from `sessionStorage`. Persist step number, workspace name/slug, invites, and project name/key after each action. |
| 2 | **API call fails when wired (workspace creation)** | No error handling exists — currently all stubbed. When real API calls land, user will see nothing happen or a crash. | Show inline error message below the Continue button with the specific error. Provide retry button. Log full error to console. |
| 3 | **Slug already taken (real API)** | Slug "check" always returns available. When wired, user may submit, wait, then get "slug taken" on final submit — confusing. | Check slug availability asynchronously on blur (already designed). Show inline error "Slug is taken" with suggestions. Don't block Continue but warn. |
| 4 | **User has 0 workspaces + visits `/onboarding` directly** | Page renders wizard. "Skip to workspace" banner doesn't show (correct — `workspaces.length > 0` check). Wizard works normally. | Correct already. No fix needed. |
| 5 | **User has 1+ workspaces + visits `/onboarding` directly** | Banner shows "You already have N workspace(s). Skip to workspace." Wizard renders below. | Improve banner wording: "You already have N workspace(s). Creating another will add to your existing workspaces." |
| 6 | **Email invite bounces or user doesn't exist** | Not handled — invites are only collected, never sent. When wired, there should be per-email error feedback. | Show inline error on individual email chips that failed. "Invitation failed for user@example.com — check the email address." |
| 7 | **Extremely long workspace name (>100 chars)** | Input has no `maxLength`. Slug truncates at 32 chars. Name could overflow layout. | Add `maxLength={100}` on workspace name input. Truncate display with ellipsis if needed. |
| 8 | **User navigates away mid-wizard (browser back/forward)** | Browser back from step 2 goes to previous page (sign-in, inbox, etc.) not to step 1. Wizard state is lost. | Either persist state in sessionStorage (handles back navigation) or use URL search params for step state. |
| 9 | **Step email verification required between sign-up and sign-in** | Sign-up creates account, shows "Account created! Sign in →". Sign-in may fail with "Email not verified" (handled by `looksLikeUnverified` + resend flow). | Already handled adequately. The resend verification flow works. |
| 10 | **OAuth sign-up (Google/GitHub) — no password** | OAuth buttons exist but the post-OAuth flow redirects to `/inbox` via callbackURL. Same missing onboarding redirect issue. | Same fix needed — detect first-time OAuth user and redirect to `/onboarding`. |

---

## Accessibility Issues (WCAG 2.2 AA)

| # | Step | Issue | WCAG Criterion | Severity | Fix |
|---|------|-------|---------------|----------|-----|
| A1 | All | **Focus indicators rely solely on color change** (`focus:border-[var(--color-border-strong)]`) — `outline-none` removes default focus ring | 2.4.7 Focus Visible | **High** | Replace `outline-none` with proper focus ring using `focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2`. Color-only changes fail for users with low vision or color blindness. |
| A2 | All | **Progress pills are plain `<div>`s with no ARIA semantics** | 4.1.2 Name, Role, Value | **Medium** | Add `role="progressbar"` to the container with `aria-valuenow={step}` and `aria-valuemax={5}`. Alternatively, make each pill a `<button>` with `aria-label="Step 2: Create your workspace"`. |
| A3 | All | **Step transitions not announced by screen readers** (AnimatePresence `mode="wait"`) | 4.1.3 Status Messages | **Medium** | Add `role="region"` with `aria-live="polite"` and `aria-label="Step X of Y: Step Name"` on each step container. The `mode="wait"` helps but doesn't guarantee announcement. |
| A4 | Step 3 | **Email chip remove buttons have `aria-label` — but no `role="list"` on the chip container** | 1.3.1 Info and Relationships | **Low** | Wrap the chip list in `<ul>` with `role="list"` and each chip as `<li>`. Currently a flat `<div>` with `flex-wrap`. |
| A5 | All | **Color contrast on progress pills** — "completed" uses accent color, "current" uses text color, "upcoming" uses surface-2. Completed vs. upcoming contrast ratio should be verified. | 1.4.3 Contrast (Minimum) | **Low** | Verify pills meet 3:1 (non-text) and 4.5:1 (text if labels added) contrast. The green/success colors should be tested with OKLCH values. |
| A6 | All | **No skip-to-content or landmark navigation** within the wizard | 2.4.1 Bypass Blocks | **Low** | Add a "Skip to content" link at the top of the wizard for keyboard users who may want to bypass the progress indicator. |

---

## Summary of Findings

| Category | Count |
|----------|-------|
| **Total issues** | **28** |
| **Critical** | 3 |
| **High** | 5 |
| **Medium** | 8 |
| **Low** | 6 |
| **Accessibility (cross-cutting)** | 6 |

### Issue Distribution

| Issue Type | Count | Key Pattern |
|------------|-------|-------------|
| Flow / Routing | 1 | C1: No onboarding redirect (Critical) |
| State Management | 1 | C2: State lost on refresh (Critical) |
| Data / API | 2 | C3: Stubbed operations (Critical), H5: Fake availability check (High) |
| UX Clarity | 6 | Progress indicator, validation messages, placeholder text, step descriptions |
| Edge Cases | 10 | Refresh, no workspaces, API failure, long names, back navigation |
| Accessibility | 6 | Focus ring, ARIA semantics, live regions, contrast |
| Polish / Visual | 2 | Motion feedback, keyboard shortcuts |

### Most Critical Findings

1. **🟥 [Critical] No post-sign-in redirect to `/onboarding`** — The onboarding wizard is entirely unreachable through the natural sign-up flow. After sign-up → verify email → sign-in, the user lands on `/inbox` with zero indication that setup steps exist. This is the single most important finding.

2. **🟥 [Critical] Wizard state lost on refresh** — All local React state is ephemeral. A browser refresh mid-wizard resets everything.

3. **🟥 [Critical] All data operations are stubbed with no error handling** — When real API calls are wired, mutation failures (workspace creation, slug taken, invite errors) have zero error UX.

4. **🟧 [High] Progress indicator has no step numbers or labels** — User cannot determine "Step 2 of 5" or what each step represents.

5. **🟧 [High] Focus indicators rely solely on color change** — `outline-none` strips the default focus ring; replacement `focus:border` color change fails WCAG 2.4.7 Focus Visible.

### Quick Wins (Low effort, High impact)

- Add "Step X of 5" text to the progress indicator
- Keep format hint visible even when showing validation errors
- Use proper `focus-visible:ring-2` instead of `outline-none`
- Show generic placeholder (not "Engineering") for project name
- Add brief description to Member vs. Admin role selector
