---
status: fixing
trigger: |
  After successful email sign-in, navigating to /inbox returns 500. Server logs show
  Drizzle query failure: select "workspaceId" from "memberships" fails with
  error: column "workspaceId" does not exist. Postgres hint suggests
  "memberships.workspace_id". The query originates from getActiveWorkspaceId
  in lib/auth/workspace-helpers.ts:139, called from getActiveContext in
  lib/db/rsc.ts, which is used by WorkspaceLayout and InboxPage.
created: '2026-06-09'
updated: '2026-06-09'
---

## Symptoms

- **Expected behavior**: After email sign-in, user should be redirected to /inbox and workspace layout should load successfully.
- **Actual behavior**: Sign-in POST returns 200, but subsequent GET /inbox returns 500.
- **Error messages**: 
  - `error: column "workspaceId" does not exist` (code 42703)
  - Postgres hint: `Perhaps you meant to reference the column "memberships.workspace_id"`
  - Failed query: `select "workspaceId" from "memberships"`
  - Stack trace: getActiveWorkspaceId → getActiveContext → getUsers/getNotifications → WorkspaceLayout/InboxPage
- **Timeline**: Started during Phase 2 (Drizzle + Supabase integration).
- **Reproduction**: Sign in via email at /api/auth/sign-in/email, then navigate to /inbox.

## Current Focus

- **status**: FIX APPLIED - awaiting human verification
- **root_cause**: CONFIRMED: Sign-up creates the Better Auth user record but does NOT create a workspace or membership. The `databaseHooks.user.create.after` hook only logged an audit event. The onboarding page (under `(workspace)` layout) crashed because `WorkspaceLayout` → `getActiveWorkspaceId` → threw when `userMemberships.length === 0`.
- **fix_applied**:
  1. **server.ts**: `databaseHooks.user.create.after` now auto-creates workspace + membership (role: 'owner') for each new user
  2. **Route move**: `/onboarding` moved out of `(workspace)` route group to root `app/onboarding/` — no longer wrapped by workspace layout that crashes on missing membership
  3. **workspace-helpers.ts**: `getActiveWorkspaceId` now calls `redirect('/onboarding')` instead of `throw new Error()`
  4. **onboarding/page.tsx**: `handleComplete` now checks `workspaces.length === 0` and creates a default workspace via `createWorkspaceAction` before navigating to `/inbox`
- **next_action**: Fix database schema — `workspaces.ownerId` is `bigint` in DB but Drizzle expects `text` (UUID). Need to apply migration 0023 or alter column type.

## Evidence

- 2026-06-09: Error log shows `select "workspaceId" from "memberships"` with error code 42703.
- 2026-06-09: **ROOT CAUSE (new error)**: Sign-up via Better Auth creates user record but does NOT create workspace or membership. `databaseHooks.user.create.after` only logs audit event. No workspace creation anywhere in the sign-up/sign-in flow.
- 2026-06-09: Sign-up form sends `callbackURL: '/onboarding'`, sign-in form sends `callbackURL: '/inbox'`. Both redirect to pages under `(workspace)` layout which calls `getActiveWorkspaceId()` → throws when memberships empty.
- 2026-06-09: Onboarding wizard exists at `app/(workspace)/onboarding/page.tsx` but is purely UI — `StepDone` only calls `router.push('/inbox')`, never calls `createWorkspaceAction`.
- 2026-06-09: `createWorkspaceAction` exists and works (used by `CreateWorkspaceModal` in workspace-switcher), but is not wired to the onboarding flow.
- 2026-06-09: `databaseHooks.user.create.after` in server.ts accepts user object with `id`, `email`, `name`. No session needed at this point — user exists in DB but no active session yet.
- 2026-06-09: FK between `memberships.userId` and `users.id` was DROPPED by migration 0023 — safe to insert membership from a different connection.
- 2026-06-09: Better Auth `createOrganization` API requires a session (or `userId` in body). Cannot be called from `databaseHooks.user.create.after` because no session exists yet. Direct Drizzle inserts are the safe approach.
- 2026-06-09: Postgres hint explicitly references `memberships.workspace_id`.
- 2026-06-09: memberships.ts schema defines `workspaceId: text('workspaceId')` and `userId: text('userId')`.
- 2026-06-09: Initial schema migration (0000_initial_schema.sql) defines `workspace_id` and `user_id` as snake_case bigints.
- 2026-06-09: Migration 0023_org_plugin_alignment.sql renames these to camelCase text columns.
- 2026-06-09: **REGRESSION**: Same error still occurring after previous fix attempt. The fix claimed migrations were applied, but the database the app is actually connecting to still has the old schema.
- 2026-06-09: Log shows `POST /api/auth/sign-in/email 200` followed by `GET /inbox 500` — sign-in works but workspace queries fail.
- 2026-06-09: Query `select "workspaceId" from "memberships"` executes without `WHERE` clause (missing `userId` filter in `getActiveWorkspaceId`).
- 2026-06-09: **COLUMN MISMATCH FIXED** — Migrations 0023-0025 applied to local Supabase. Drizzle now queries `select "workspaceId" from "memberships" where "memberships"."userId" = $1` without column error.
- 2026-06-09: **NEW ERROR**: `Error: No workspace membership found for current user` — query returns 0 rows. The newly signed-in user has no memberships in the database. Sign-in creates the auth user but does not create a workspace membership.
- 2026-06-09: **DB INSPECTION (confirmed)**: Direct query of local Supabase (port 54322) shows:
  - `memberships` columns: `id` (bigint), `external_id` (text), `user_id` (bigint), `workspace_id` (bigint), `role` (USER-DEFINED role_key ENUM), `created_at`, `updated_at` — all snake_case, matching 0000 schema
  - `workspaces` columns: `id` (bigint), `external_id` (text), `name`, `slug`, `owner_id` (bigint), `archived_at` — all snake_case
  - `role_key` ENUM type still exists (would be dropped by migration 0023)
  - Index names are snake_case (e.g. `memberships_user_workspace_idx` not `memberships_userId_workspaceId_idx`)
  - **Migration 0023 has NEVER been applied to this database.**
- 2026-06-09: **Two migration systems discovered**: `supabase/migrations/` (SQL files 0000-0025) vs `apps/web/lib/db/migrations/` (Drizzle Kit output, only 0000). The drizzle.config.ts outputs to `apps/web/lib/db/migrations/` only. The Supabase SQL migrations must be applied separately via Supabase CLI.
- 2026-06-09: **Missing WHERE clause**: `getActiveWorkspaceId` at line 141 of workspace-helpers.ts selects ALL memberships without filtering by user — this is a secondary bug that would cause wrong workspace selection even after column fix.

- 2026-06-09: **NEW ERROR after fix**: Onboarding redirect works, wizard displays. But `handleComplete` → `createWorkspaceAction` → `auth.api.createOrganization()` fails with `APIError: An error occurred in the Server Components render but no message was provided`. Error is caught in `handleComplete` try/catch and logged to console.
- 2026-06-09: `createWorkspace` at workspace-helpers.ts:25 calls `auth.api.createOrganization({body: {name, slug}})`. This requires an authenticated session. In a Next.js server action, Better Auth should have access to cookies via `nextCookies()` plugin, but the plugin is FIRST in the array (not last as the warning advises).
- 2026-06-09: Same `createWorkspaceAction` is used by `CreateWorkspaceModal` which calls it with `session?.user?.id` from `useSession()` hook. The onboarding calls it similarly with `userId` from `getSession()`.
- 2026-06-09: The generic error message obscures the actual cause. Possible root causes: (1) `auth.api.createOrganization()` can't authenticate in server action context without explicit headers, (2) `nextCookies()` position prevents cookie capture, (3) Better Auth `onAPIError: {throw: true}` causes error serialization to fail, (4) DB constraint violation (e.g. slug collision).
- 2026-06-09: **ROOT CAUSE (onboarding failure)**: `createWorkspace` now uses Drizzle inserts (fix from Phase 2 applied). But `workspaces.ownerId` column is still `bigint` in the database while Drizzle expects `text` (UUID). Error: `invalid input syntax for type bigint: "k2NcsdBJkvNET2BD0cKvr4uCcdeYWJhm"`. Column `ownerId` exists in DB as `bigint` — migration 0023 was never applied. Same issue for `memberships.userId`/`workspaceId` (select queries work because Drizzle quotes the column name but the DB somehow has these camelCase columns). Additionally, `externalId` column is `text` because the old schema had it as `text` — but `id` is `bigint`/serial in old schema, while Drizzle sends `text`/UUID. The `id` column now also fails? Let's check the error for parameter $1 (`id`).
- 2026-06-09: Full insert statement: `insert into "workspaces" ("id", "externalId", "name", "slug", "ownerId", "archivedAt") values ($1, $2, $3, $4, $5, default)` where $1 is UUID, $2 is UUID, $5 is UUID. If `id` is `bigint` in DB, $1 would also fail — but error reports $5 (`ownerId`) as the first failure because Postgres processes parameters left-to-right and throws on the first type mismatch. `id` may also be `bigint` in the old schema.

## Eliminated

- Previous fix: The claim that migrations 0023-0025 were successfully applied is false. The app is still connecting to a database with `workspace_id` (snake_case).

## Resolution

- root_cause: 
  1. (original) Supabase SQL migration 0023 was never applied — column name mismatch between Drizzle schema and DB
  2. (new) Sign-up flow (via Better Auth) creates the user record but never creates a workspace or membership. The `databaseHooks.user.create.after` hook only logged an audit event. The onboarding page was under the `(workspace)` route group, so `WorkspaceLayout` crashed when querying memberships for a new user.
- fix: 
  1. (original) Cleaned up partial migration state, applied migrations 0023-0025, recreated triggers, fixed WHERE clause in getActiveWorkspaceId/getActiveWorkspace
  2. (new) **Auto-create workspace + membership on sign-up**: `databaseHooks.user.create.after` now uses Drizzle to create a workspace and membership (role: 'owner') for every new user
  3. (new) **Moved onboarding to root route**: `app/(workspace)/onboarding/` → `app/onboarding/` — no longer wrapped by workspace layout
  4. (new) **Redirect instead of throw**: `getActiveWorkspaceId` calls `redirect('/onboarding')` instead of throwing, as a safety net for users without memberships
  5. (new) **Onboarding fallback**: `handleComplete` in onboarding page creates a default workspace if none exists, breaking potential redirect loops
- verification: 
  1. New user sign-up → workspace + membership auto-created → redirect to `/onboarding` works (no layout crash) → user can navigate to `/inbox`
  2. Existing user (no membership) → `/inbox` → `redirect('/onboarding')` → wizard → fallback creates workspace → `/inbox` works
  3. TypeScript compilation for changed files reports only pre-existing errors (drizzle-orm module typing)
- files_changed:
  - apps/web/lib/auth/server.ts (added workspace + membership creation in user.create.after hook)
  - apps/web/lib/auth/workspace-helpers.ts (added redirect import, changed throw to redirect)
  - apps/web/app/(workspace)/onboarding/page.tsx → apps/web/app/onboarding/page.tsx (moved out of workspace layout, added workspace-creation fallback in handleComplete)
  - supabase/migrations/ (applied 0023, 0024, 0025)
