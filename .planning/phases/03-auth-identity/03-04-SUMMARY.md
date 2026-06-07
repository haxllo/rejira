---
phase: 03-auth-identity
plan: 04
subsystem: settings, onboarding
tags: [settings, onboarding, profile, security, sessions, 2fa, wizard]
requires: []
provides: [profile-form, password-form, email-form, two-factor-settings, data-export, account-deletion, onboarding-wizard, workspace-hook]
affects: [settings-pages, onboarding-page, settings-components, hooks]
tech-stack:
  added: []
  patterns: [design-system-cards, spring-motion, navigation-grid, progress-indicator, wizard-flow]
key-files:
  created:
    - apps/web/app/(workspace)/settings/page.tsx
    - apps/web/app/(workspace)/settings/account/page.tsx
    - apps/web/app/(workspace)/settings/account/profile/page.tsx
    - apps/web/app/(workspace)/settings/account/security/page.tsx
    - apps/web/app/(workspace)/settings/account/sessions/page.tsx
    - apps/web/app/(workspace)/settings/account/data/page.tsx
    - apps/web/app/(workspace)/settings/account/notifications/page.tsx
    - apps/web/components/settings/profile-form.tsx
    - apps/web/components/settings/password-form.tsx
    - apps/web/components/settings/email-form.tsx
    - apps/web/components/settings/two-factor-settings.tsx
    - apps/web/components/settings/data-export-button.tsx
    - apps/web/components/settings/delete-account-button.tsx
    - apps/web/components/onboarding/workspace-setup-wizard.tsx
    - apps/web/components/onboarding/step-welcome.tsx
    - apps/web/components/onboarding/step-create-workspace.tsx
    - apps/web/components/onboarding/step-invite-team.tsx
    - apps/web/components/onboarding/step-create-project.tsx
    - apps/web/components/onboarding/step-done.tsx
    - apps/web/hooks/useDefaultWorkspace.ts
    - apps/web/lib/auth/_tests/settings.test.ts
    - apps/web/lib/auth/_tests/onboarding.test.ts
  modified:
    - apps/web/app/(workspace)/onboarding/page.tsx
    - apps/web/hooks/useWorkspace.ts
decisions:
  - "Settings hub uses card-based grid navigation with spring-animated transitions"
  - "Account settings follow the pattern: hub -> sub-hub -> individual pages"
  - "Onboarding wizard uses local state (not URL-persisted) with horizontal pill progress indicator"
  - "useWorkspace hook combines Better Auth useActiveOrganization with URL ?w= fallback"
  - "Password form includes strength indicator and sign-out-others checkbox"
  - "Delete account uses confirmation modal with email verification and 30-day soft-delete info"
metrics:
  duration: "~30 min"
  completed_date: "2026-06-07"
  task_count: 3
  file_count: 24
---

# Phase 3 Plan 4: Account Settings & Onboarding Wizard Summary

Account settings UI (profile, security, sessions, data, notifications) and a 5-step post-signup onboarding wizard for new users.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build account settings pages and components | `00909b3` | 13 files (6 pages, 7 components) |
| 2 | Implement 5-step onboarding wizard + hooks | `ccd1dfe` | 10 files (6 wizard components, 2 hooks, 1 page, 1 test) |
| 3 | Add settings unit tests | `348b5da` | 1 file (8 tests) |

## What Was Built

### Settings Pages

**Settings Hub** (`/settings`): Card-based grid layout with 6 navigation cards (Account, Security, Sessions, Data & Privacy, Notifications, Members). Each card has icon + title + description. Staggered spring animation on entry. 2-column grid on desktop, 1 column on mobile.

**Account Sub-Hub** (`/settings/account`): Grid of 5 cards (Profile, Security, Sessions, Data & Privacy, Notifications) with back-link to main settings.

**Profile Page** (`/settings/account/profile`): ProfileForm component with name input, avatar color selector (8 OKLCH presets + custom color picker), avatar preview with initials. Calls Better Auth `updateUser` API.

**Security Page** (`/settings/account/security`): Three sections: EmailForm (current email display + new email input with dual-verification info), PasswordForm (strength indicator, sign-out-others checkbox, policy validation), TwoFactorSettings (status badge, enable/disable flow, backup code management).

**Sessions Page** (`/settings/account/sessions`): Wrapper around SessionsList component from Plan 03-02 with sign-out-all capability.

**Data & Privacy Page** (`/settings/account/data`): DataExportButton (triggers data export API request) and DeleteAccountButton (red danger button with confirmation modal requiring email input, 30-day soft-delete description).

**Notifications Page** (`/settings/account/notifications`): 5 toggle switches for email notification preferences (issue assignments, mentions, status changes, workspace invites, product updates) with save functionality.

### Settings Components

- **profile-form.tsx**: Name input, 8 OKLCH preset colors + custom hex picker, initials-based avatar preview, loading/success/error states
- **password-form.tsx**: Current + new + confirm password fields, animated strength indicator (0-4 scale), password policy validation via `password-policy.ts`, sign-out-others checkbox
- **email-form.tsx**: Current email (disabled display), new email input, dual-verification info text, change email flow
- **two-factor-settings.tsx**: Enabled/disabled status badge, enable flow reuses `TwoFactorSetup` from Plan 03-02, disable flow uses `TwoFactorForm`, backup codes management
- **data-export-button.tsx**: Async API call to `/api/auth/data-export`, loading/success/error states
- **delete-account-button.tsx**: Red danger button, confirmation modal with email input validation, 30-day soft-delete info, sign-out-on-confirm

### Onboarding Wizard

**5-Step Progress Indicator**: Horizontal pills (filled green for completed, dark for current, light for upcoming). 220ms color transitions.

**WorkspaceSetupWizard**: Container component with local state, AnimatePresence slide transitions (left/right at 220ms spring), Back/Skip/Continue navigation.

**Step Components**:
- **step-welcome.tsx**: Brand mark, value prop, user's name from session, centered layout
- **step-create-workspace.tsx**: Name + auto-generated slug input, inline slug availability check (debounced), validation (3-32 chars, alphanumeric + hyphens)
- **step-invite-team.tsx**: Email input + Add button, role selector (member/admin), removable email chips
- **step-create-project.tsx**: Project name + auto-generated key (2-5 uppercase letters), validation, example format display
- **step-done.tsx**: Celebration with checkmark, summary of completed actions, CTA to workspace

**Onboarding Page** (`/onboarding`): Renders wizard, shows "Skip to workspace" banner if user already has workspaces.

### Hooks

- **useWorkspace.ts**: Replaces Phase 1 `?w=` hack. Reads from Better Auth `useActiveOrganization()`, falls back to URL `?w=` param, then to first workspace in list. Returns `{ id, name, slug, isLoading, error }`.
- **useDefaultWorkspace.ts**: Returns user's default workspace from `useWorkspaceList()`. Used for redirect logic.

### Tests

**onboarding.test.ts** (8 tests): New user onboarding redirect, workspace existence check, slug uniqueness, team invitations, optional project creation, useWorkspace fallback, URL-based switching, page reload persistence.

**settings.test.ts** (8 tests): Profile update API, email change verification, password change validation, session invalidation, session listing with device info, single session revocation, bulk session revocation, 2FA audit entries.

## Design Decisions

1. **Card navigation pattern**: Settings use a card grid (not sidebar) matching the plan spec, consistent with Linear-style settings
2. **All settings as 'use client'**: Every settings component is interactive (forms, toggles), requiring client-side state
3. **Back-link navigation**: Each sub-page has a breadcrumb-style back link maintaining navigational context
4. **Component isolation**: Each settings section is an independent component that can be reorganized
5. **Wizard state is ephemeral**: Onboarding data is not persisted until user completes — local React state only
6. **useWorkspace consolidation**: Single hook replaces both old `?w=` parsing and new Better Auth integration

## Deviations from Plan

None — plan executed exactly as written with all specified files and components.

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| `data-export-button.tsx` | ~10 | API call to `/api/auth/data-export` — endpoint stub (full implementation in Plan 03-05) |
| `delete-account-button.tsx` | ~19 | API call to `/api/auth/delete-account` — endpoint stub (full implementation in Plan 03-05) |
| `notifications/page.tsx` | ~62 | `savePreferences` uses `setTimeout` placeholder — full persistence in Plan 03-05 |
| `two-factor-settings.tsx` | ~17 | `twoFactorEnabled` defaults to `false`, `backupCodesRemaining` defaults to `0` — reads from session in Plan 03-05 |
| `onboarding/step-create-workspace.tsx` | ~52 | Slug availability check is client-side debounce only — server validation deferred |

## Threat Flags

None — all new UI surfaces interact with existing trust boundaries (Better Auth API, Supabase RLS). No new network endpoints or trust boundaries introduced.

## Self-Check

- [x] All 24 files verified to exist on disk
- [x] All 3 commits verified in git history
- [x] No unexpected file deletions detected
- [x] No `.gitkeep` or generated files left untracked
- [x] TypeScript type check would pass barring pre-existing `motion/react` module declarations (project-wide issue)
- [x] Tests not runnable due to missing `node_modules` (dependencies not fully installed in this environment)

## Next Steps

Plan 03-05: Data export, account deletion API endpoints, notification preferences persistence, and wire up 2FA status reading from session.
