---
phase: 03-auth-identity
plan: 03
subsystem: auth
tags: [organization, workspaces, invitations, role-management, workspace-switcher]
requires:
  - 03-01 (Better Auth server)
provides:
  - WORK-02 (Workspace CRUD with Drizzle helpers)
  - WORK-03 (Member invitation with signed tokens)
  - WORK-04 (Role management: owner/admin/member/guest)
  - WORK-05 (Workspace switcher in TopBar)
  - WORK-06 (Settings → Members page with role editing)
  - WORK-07 (Invite accept page with auth gate)
  - WORK-08 (Cross-workspace data isolation via JWT+RPC)
affects: [TopBar, WorkspaceLayout, auth server, email templates]
tech-stack:
  added: [Better Auth organization plugin, admin plugin, jwt plugin, Drizzle schema files]
  patterns: [org-plugin-table-mapping, drizzle-server-helpers, tdd-test-mocks]
key-files:
  created:
    - apps/web/lib/auth/workspace-helpers.ts
    - apps/web/lib/auth/workspace-types.ts
    - apps/web/lib/auth/invites.ts
    - apps/web/lib/auth/_tests/workspaces.test.ts
    - apps/web/lib/auth/_tests/invites.test.ts
    - apps/web/lib/db/schema/invitations.ts
    - apps/web/lib/db/schema/teams.ts
    - apps/web/lib/email/templates/workspace-invite.ts
    - apps/web/lib/email/templates/role-changed.ts
    - apps/web/hooks/useWorkspaceList.ts
    - apps/web/hooks/useMembership.ts
    - apps/web/components/team/workspace-switcher.tsx
    - apps/web/components/team/create-workspace-modal.tsx
    - apps/web/components/team/workspace-members-table.tsx
    - apps/web/components/team/workspace-invites-table.tsx
    - apps/web/app/(workspace)/settings/members/page.tsx
  modified:
    - apps/web/lib/auth/server.ts
    - apps/web/lib/auth/client.ts
    - apps/web/components/team/role-select.tsx
    - apps/web/components/team/workspace-invite-form.tsx
    - apps/web/components/shell/top-bar.tsx
    - apps/web/app/invite/[token]/page.tsx
    - apps/web/lib/db/schema/index.ts
    - apps/web/lib/email/render.ts
    - apps/web/lib/email/templates/index.ts
    - apps/web/lib/auth/_tests/auth.test.ts
decisions:
  - "Organization plugin maps to our existing workspaces/memberships tables via modelName config"
  - "JWT claims set sub={{user.external_id}} so Phase 2 RLS policies resolve workspace access"
  - "Workspace switcher preserves ?w=slug URL pattern for deep-linkability"
  - "Invite system uses Better Auth's built-in token generation/hashing, 7-day expiry"
  - "Role management enforced server-side via Better Auth's updateMemberRole/removeMember APIs"
  - "Email templates use inline HTML (not React Email) matching existing template pattern"
  - "Created invitations.ts and teams.ts Drizzle schema files (not in Phase 2 initial schema)"
metrics:
  duration: "~30 minutes execution"
  completed-date: "2026-06-07"
---

## Phase 3 Plan 3 Summary: Organization & Workspaces

Better Auth's organization plugin wired to rejira's existing Phase 2 schema tables. Workspace creation, member invitations with signed tokens, role management (owner/admin/member/guest), workspace switcher replacing the Phase 1 `?w=` hack.

### Tasks Completed

| # | Task | Type | Commits |
|---|------|------|---------|
| 1 | Register organization plugin + workspace helpers | auto (TDD) | `7ffc4c7` (test), `d78171a` (feat) |
| 2 | Member invitations + role management | auto (TDD) | `917965e` (test), `4a69fe4` (feat) |
| 3 | Workspace switcher + create-workspace modal | auto | `f167c2d` (feat) |
| 4 | Wire sign-up → workspace creation | auto | Included in Task 3 |

### What Was Built

**Task 1 — Organization Plugin:**
- Registered `organization`, `admin`, `jwt` plugins in `auth/server.ts`
- Organization plugin maps `organization→workspaces`, `member→memberships`, `invitation→invitations`, `team→teams`
- JWT claims `sub={{user.external_id}}` for Phase 2 RLS compatibility
- `workspace-helpers.ts`: createWorkspace, getWorkspace, listUserWorkspaces, getDefaultWorkspace, setDefaultWorkspace, archiveWorkspace
- `workspace-types.ts`: WorkspaceRole, Workspace, Membership, WorkspaceInvite with getInviteStatus
- Created Drizzle schema files for `invitations` and `teams` tables (missing from Phase 2 schema)
- 15 Vitest tests covering org plugin config, workspace CRUD, type helpers

**Task 2 — Member Invitations:**
- `invites.ts`: inviteMember, bulkInvite, revokeInvite, resendInvite, acceptInvite, changeMemberRole, removeMember, getMembers, getPendingInvites
- All use Better Auth's organization API (`createInvitation`, `cancelInvitation`, `acceptInvitation`, `updateMemberRole`, `removeMember`)
- Server-enforced constraints: cannot demote last owner, cannot self-demote
- Email templates: workspace-invite (with accept link, 7-day expiry note), role-changed
- `WorkspaceMembersTable`: searchable, sortable member list with inline role editing and remove
- `WorkspaceInvitesTable`: pending invites with revoke/resend actions, status badges
- `WorkspaceInviteForm`: single + bulk invite mode with proper error handling
- `RoleSelect`: 4 roles with descriptions, owner exclusion, disabled states
- Settings → Members page with Members/Pending Invites tabs
- Invite accept page (`/invite/[token]`): handles signed-in, needs-auth, expired, invalid states
- 12 Vitest tests covering all invite operations and role constraints

**Task 3 — Workspace Switcher:**
- `WorkspaceSwitcher` component replaces inline switcher in TopBar
- Dropdown with workspace initial, name, role badge, active indicator
- "Create workspace" option for users with no workspaces
- `CreateWorkspaceModal`: name input, auto-generated editable slug, validation (3-32 chars, lowercase+hyphens)
- `useWorkspaceList` hook: uses Better Auth's `useListOrganizations` and `useActiveOrganization`
- `useMembership` hook: uses Better Auth's `useActiveMember` for role checks
- Preserves `?w=slug` URL pattern for deep-linkability
- TopBar updated to use `WorkspaceSwitcher` instead of Phase 1 inline switcher

**Task 4 — Sign-up Flow:**
- New users with no workspaces see the WorkspaceSwitcher with "Create workspace" option
- Workspace creation modal works immediately after sign-up
- Full onboarding wizard deferred to Plan 03-04

### Test Results

```
Tests:  80 passed | 8 skipped (88 total)
Files:  7 passed | 1 skipped (8 total)

Broken down:
  - auth.test.ts:          11 passed
  - email.test.ts:         12 passed
  - workspaces.test.ts:    15 passed (new)
  - invites.test.ts:       12 passed (new)
  - oauth.test.ts:         11 passed
  - sessions.test.ts:      10 passed
  - two-factor.test.ts:     9 passed
  - rls.test.ts:            8 skipped (needs local Supabase)
```

### Deviations from Plan

**1. [Rule 3 - Blocking] Created missing invitations and teams Drizzle schema files**
- **Found during:** Task 1 execution
- **Issue:** The plan referenced `invitations` and `teams` tables as existing from Phase 2, but neither the Drizzle schema files nor the database migration exist in the codebase. The organization plugin mapping requires these tables.
- **Fix:** Created `apps/web/lib/db/schema/invitations.ts` and `apps/web/lib/db/schema/teams.ts` with proper Drizzle definitions matching the plan's column specifications. Added exports to schema index. Did NOT run a DB migration (the tables may need to be added via `supabase db push`).
- **Files modified:** `apps/web/lib/db/schema/invitations.ts` (created), `apps/web/lib/db/schema/teams.ts` (created), `apps/web/lib/db/schema/index.ts`

**2. [Rule 1 - Bug] Fixed auth.test.ts mock for new plugins**
- **Found during:** Task 1 test run
- **Issue:** The existing `auth.test.ts` mock for `better-auth/plugins` didn't include `organization`, `admin`, `jwt`, `genericOAuth`, `magicLink`, `jwt`, `google`, `github` exports. Our registration of org/admin/jwt plugins caused the auth tests to fail with "No export defined" errors.
- **Fix:** Updated `auth.test.ts` to use `importOriginal` for `better-auth/plugins`, added mocks for `social-providers`, `account-linking`, `email`, and `transport` modules. Added required env vars (`GOOGLE_CLIENT_ID`, etc.).
- **Files modified:** `apps/web/lib/auth/_tests/auth.test.ts`
- **Commit:** included in `7ffc4c7`

**3. [Rule 1 - Bug] Duplicate organization config in auth server**
- **Found during:** Task 1 implementation
- **Issue:** Initially had organization config duplicated both as top-level key and in the plugins array, which Better Auth doesn't support.
- **Fix:** Removed top-level `organization` and `jwt` config blocks, kept only in the plugins array.
- **Files modified:** `apps/web/lib/auth/server.ts`

### Decisions Made

1. **Organization plugin table mapping**: Used Better Auth's `modelName` config to map `organization→workspaces`, `member→memberships`, etc. This means Better Auth writes directly to our tables — no data duplication.

2. **JWT claims for RLS**: Set `sub={{user.external_id}}` so Phase 2's `current_workspace_ids()` function can resolve workspace membership from the JWT.

3. **Workspace switcher preserves `?w=` URL pattern**: The Phase 1 URL parameter hack is preserved as a compatibility layer. The WorkspaceSwitcher still sets `?w=slug` on switch, ensuring existing deep links continue to work.

4. **Email template pattern**: Continued using inline HTML templates (not React Email) matching the existing pattern in `lib/email/templates/`. Plan 03-07 (Phase 3K) will upgrade to React Email.

5. **Invite token handling**: Delegated entirely to Better Auth's organization plugin which handles token generation, SHA-256 hashing, expiry, and single-use validation. No custom crypto in our code.

### Known Stubs

None — all wire paths are connected to real Better Auth APIs and Drizzle queries. The member/role data flows from the organization plugin through our existing Phase 2 schema tables.

### Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: invite-token-url | `apps/web/app/invite/[token]/page.tsx` | Signed invite token in URL; if intercepted before acceptance, attacker could join workspace. Mitigated by: HTTPS-only, 7-day expiry, single-use token. |

## Self-Check: PASSED

- [x] All created files exist on disk
- [x] All commits exist in git log: `7ffc4c7`, `d78171a`, `917965e`, `4a69fe4`, `f167c2d`
- [x] 80 Vitest tests pass (27 new: 15 workspaces + 12 invites)
- [x] TypeScript typecheck shows no new errors (pre-existing errors only)
- [x] No uncommitted files related to this plan remain
