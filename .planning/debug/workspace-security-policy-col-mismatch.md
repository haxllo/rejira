---
status: resolved
trigger: Onboarding workspace creation fails with 500 - user redirected back to /onboarding
created: 2026-06-09
updated: 2026-06-10
tdd_checkpoint: false
cascade_errors: true
---

## Current Focus

**ALL ISSUES RESOLVED.** Onboarding successfully creates workspace and redirects to `/inbox` (POST /onboarding 200).

**Three cascading issues were identified and fixed:**

1. **Migration gap** — 5 stored functions referenced old snake_case columns after 0023's camelCase rename → fixed by pushing migration 0027
2. **Drizzle v1 API incompatibility** — `drizzle(pool, ...)` created unconfigured second pool → fixed by using `drizzle({ client: pool }, ...)`
3. **GUC context missing** — `current_user_id()` returned NULL on direct DB connections (no JWT) → fixed by setting `request.jwt.claims` in transaction

**next_action:** none (all issues resolved)

## Symptoms

**Expected behavior:** Onboarding successfully creates a default workspace and redirects to the app.

**Actual behavior:** POST /onboarding returns 500 with error: `column "workspace_id" of relation "workspace_security_policy" does not exist`. User is redirected back to /onboarding.

**Error messages:**
```
error: column "workspace_id" of relation "workspace_security_policy" does not exist
internalQuery: 'INSERT INTO workspace_security_policy (workspace_id)\n  VALUES (NEW.id)'
where: 'PL/pgSQL function create_default_workspace_security_policy() line 3 at SQL statement'
```

**Timeline:** Never worked before - first time testing onboarding flow.

**Reproduction:** Complete the onboarding form that triggers workspace creation.

## Evidence

- timestamp: 2026-06-09
  source: git diff HEAD~1 supabase/migrations/0021_workspace_security_policy.sql
  finding: The commit changed 0021 in-place from `workspace_id` to `"workspaceId"`. The original buggy version used `workspace_id BIGINT PRIMARY KEY REFERENCES workspaces(id)` and `INSERT INTO workspace_security_policy (workspace_id)`.
  
- timestamp: 2026-06-09
  source: supabase/migrations/0022_fix_security_policy_trigger_column.sql
  finding: Migration 0022 exists as a `CREATE OR REPLACE FUNCTION` with `"workspaceId"` - the intended fix. But it was never applied to the database.

- timestamp: 2026-06-09
  source: supabase/migrations/0021_workspace_security_policy.sql (current)
  finding: Current file on disk shows the corrected version with `"workspaceId"` - this is misleading because the database has the old version.

- timestamp: 2026-06-09
  source: POST /onboarding error (after trigger fix applied)
  finding: Downstream error at `lib/auth/workspace-helpers.ts:38` — `INSERT INTO "memberships" ("id", "externalId", "userId", "workspaceId", "role", "createdAt", "updatedAt")` fails because the actual database table has snake_case columns (`external_id`, `user_id`, `workspace_id`, `created_at`, `updated_at`) from migration 0000. Migration 0023 which renames these to camelCase was never applied.

- timestamp: 2026-06-09
  source: supabase/migrations/0023_org_plugin_alignment.sql (migration file on disk)
  finding: Migration 0023 renames all 4 org tables (workspaces, memberships, invitations, teams) from snake_case to camelCase and converts PKs to text. This was in the same batch as 0022 but was never applied to the database.

- timestamp: 2026-06-10
  source: apps/web/lib/db/client.ts (runtime error reproduction)
  finding: Drizzle ORM v1 ^1.0.0-rc.4 changed its `drizzle()` API — passing a Pool instance directly (`drizzle(pool, ...)`) causes the function to destructure the Pool looking for `client` or `connection` keys; neither exists, so it creates `new Pool(undefined)` (no connection string), producing ECONNREFUSED on all queries. Verified via direct script reproduction.

- timestamp: 2026-06-10
  source: apps/web/lib/auth/workspace-helpers.ts (activity trigger crash)
  finding: After fixing DB connection, `INSERT INTO memberships` triggers `tg_emit_activity()` which calls `current_user_id()` reading `auth.jwt() ->> 'sub'`. On direct Postgres connections (no Kong/Supabase API gateway), `auth.jwt()` returns NULL → `actor_id` is NULL → violates NOT NULL constraint. The existing `withTransaction` helper pattern uses `set_config('request.jwt.claims', ...)` to provide JWT context; `createWorkspace` was not using it.

## Eliminated

- hypothesis: "Multiple drizzle-orm versions (0.45 and 1) installed cause the ECONNREFUSED error." Eliminated: only `drizzle-orm@^1.0.0-rc.4-5d5b77c` is installed; no version conflict exists. The real issue was drizzle v1 API change.

## Resolution

root_cause: "Three independent but cascading issues blocked onboarding: (1) Migration 0027 existed on disk but was never pushed — 5 stored functions referenced old snake_case columns after 0023's camelCase rename. (2) Drizzle ORM v1 (`^1.0.0-rc.4`) changed its `drizzle()` API — passing a Pool instance directly caused it to destructure and create `new Pool(undefined)`, returning ECONNREFUSED. (3) `current_user_id()` uses `auth.jwt()` which returns NULL on direct Postgres connections; the `tg_emit_activity()` trigger on memberships insert violated `activities.actor_id NOT NULL`."

fix: "(1) Migration 0027 pushed via `supabase db push` — rewrites 5 functions with camelCase refs and text types. (2) `apps/web/lib/db/client.ts:93` — changed `drizzle(pool, ...)` to `drizzle({ client: pool }, ...)`. (3) `apps/web/lib/auth/workspace-helpers.ts` — wrapped `createWorkspace` in `db.transaction()` with `set_config('request.jwt.claims', JSON.stringify({ sub: userId }), true)` so `auth.jwt()` resolves userId in triggers."

verification: "(1) All 28 migrations in sync via `supabase migration list --local`. (2) `pg_get_functiondef()` confirms all 5 functions use correct camelCase refs and text types. (3) Direct pool.query test via node confirms `drizzle({ client: pool }, ...)` resolves ECONNREFUSED. (4) POST /onboarding returns 200 — workspace created, user redirected to /inbox successfully."

files_changed:
- supabase/migrations/0027_fix_column_refs_after_camelcase_rename.sql (pushed to DB)
- apps/web/lib/db/client.ts (drizzle v1 API: pool passed as `client` property)
- apps/web/lib/auth/workspace-helpers.ts (GUC context: wrapped in transaction with `set_config`)
