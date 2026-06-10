---
slug: missing-db-tables-jwks-auditlog
status: resolved
trigger: user-reported
created: 2026-06-09
goal: find_and_fix
tdd: false
---

## Symptoms

- **Expected behavior:** App should load sign-in and inbox pages without errors
- **Actual behavior:** Two Postgres errors on server startup and sign-in:
  1. `column "actorWorkspaceId" of relation "audit_log" does not exist` (code 42703) — emitted by `emitAuditEvent` in `lib/auth/audit.ts:43` during POST /api/auth/sign-in/email
  2. `relation "jwks" does not exist` (code 42P01) — emitted by `getSession` in `lib/auth/get-session.ts:9` during auth.api.getSession call, causes GET /inbox to return 500
- **Environment:** Local dev with Supabase local stack or connected Supabase project

## Current Focus

**Hypothesis:** Database schema mismatch — `audit_log` column `actor_workspace_id` (bigint, snake_case) was never renamed/ret typed to `actorWorkspaceId` (text, camelCase), and Better Auth's `jwks` table was never created. A secondary enum mismatch exists between `AuditEventType` values and the DB `audit_event` enum.

**Test:** ✅ Verified — DB now has correct columns and jwks table.

**Next action:** Awaiting human verification — start the app and test

- **timestamp:** 2026-06-09
  **checked:** User confirmation
  **found:** Confirmed fixed — app loads without errors
  **implication:** Both root causes resolved and verified.

## Evidence

- **timestamp:** 2026-06-09
  **checked:** DB `audit_log` columns (live query)
  **found:** `actor_id` (bigint), `actor_workspace_id` (bigint) — both snake_case, bigint
  **implication:** Column `actorWorkspaceId` does NOT exist. The current Drizzle schema (`audit_log.ts`) defines `actorWorkspaceId: text('actorWorkspaceId')` which generates SQL with column name `actorWorkspaceId`, but the DB only has `actor_workspace_id`. The schema was updated post-migration-0000.

- **timestamp:** 2026-06-09
  **checked:** DB `public` tables (live query)
  **found:** `jwks` table does not exist in the database
  **implication:** Better Auth's `jwt()` plugin (enabled in `server.ts` line 132) requires a `jwks` table to store JWKS key pairs. The hand-authored migration `0022_better_auth_schema.sql` created standard BA tables (`user`, `session`, `account`, `verification`, `rateLimit`, `twoFactor`) but did not include `jwks`.

- **timestamp:** 2026-06-09
  **checked:** Supabase migration tracking table
  **found:** Migrations `0000` through `0022` are applied. `0023_org_plugin_alignment.sql` and `0024_org_rls_rewrite.sql` are NOT applied. The `0023` migration contains logic to rename `actor_workspace_id` → `"actorWorkspaceId"` but has not been executed.
  **implication:** Two unapplied migrations exist; `0025` must apply on top of `0022` without depending on `0023` or `0024`.

- **timestamp:** 2026-06-09
  **checked:** Drizzle schema `audit_log.ts` + migration snapshot `0000_snapshot.json`
  **found:** Snapshot shows `actor_workspace_id` (bigint), current schema has `actorWorkspaceId` (text). Drizzle schema was modified after migration `0000` was generated. The column name AND type both changed — two differences from the applied schema.
  **implication:** A new Drizzle migration must be generated to sync the Drizzle migration journal, or `drizzle-kit push` must be used.

- **timestamp:** 2026-06-09
  **checked:** Better Auth JWT plugin schema (`node_modules/better-auth/dist/plugins/jwt/schema.mjs`)
  **found:** `jwks` table requires fields: `id` (text PK), `publicKey` (string), `privateKey` (string), `createdAt` (date), `expiresAt` (date, optional)
  **implication:** Hand-authored CREATE TABLE is sufficient.

- **timestamp:** 2026-06-09
  **checked:** `AuditEventType` in `audit.ts` vs `auditEventEnum` in `enums.ts` vs DB enum
  **found:** Code's `AuditEventType` contains values like `auth_2fa_enabled`, `auth_account_deleted` that don't match the DB enum (`two_factor_enabled`, `account_deleted`). `auth_password_change` and `auth_email_change` are also missing from DB enum but emitted by `server.ts` hooks.
  **implication:** After fixing the column error, enum constraint violations would surface when those events are emitted. Need to extend the DB enum and update the Drizzle schema enum.

## Eliminated

- hypothesis: Applying migration 0023 would fix the audit_log column
  evidence: 0023 failed because `invitations` table doesn't exist (Better Auth org plugin creates it at runtime via Pool, not auto-generated). Supabase db push cannot proceed through 0023 to reach later migrations.
  timestamp: 2026-06-09

## Resolution

root_cause: >
  Two related issues:
  1. audit_log.actorWorkspaceId column doesn't exist — the Drizzle schema was updated to camelCase/text after migration 0000 was generated, but a new migration was never produced to ALTER the table. The DB still has the original actor_workspace_id (snake_case, bigint) column. When emitAuditEvent tries to insert, Drizzle generates SQL referencing `actorWorkspaceId` which doesn't exist.
  2. The jwks table was never created — Better Auth's jwt() plugin needs it but the BA schema migration (0022) omitted it. When getSession calls auth.api.getSession, Better Auth tries to read from the jwks table and fails.

fix: >
  1. Created supabase/migrations/0025_fix_audit_log_and_add_jwks.sql with:
     - ALTER audit_log: rename actor_workspace_id → "actorWorkspaceId", change both columns to text
     - Drop & recreate RLS policy with type casts (current_user_id() returns bigint)
     - Extend audit_event enum with 9 missing values matching AuditEventType
     - CREATE TABLE jwks for Better Auth JWT plugin
  2. Applied SQL directly to local DB (0023 & 0024 block supabase db push)
  3. Updated Drizzle schema enums.ts to include all enum values (23 total)
  4. Updated Drizzle migration snapshot (0000_snapshot.json) to reflect new column names/types

verification: self-verified (7/7 checks pass: actorWorkspaceId column, actor_id type, jwks table, jwks columns, audit_event enum values, index, RLS policy) — need user to confirm app loads without errors

files_changed:
  - supabase/migrations/0025_fix_audit_log_and_add_jwks.sql (new, idempotent)
  - apps/web/lib/db/schema/enums.ts (updated auditEventEnum)
  - apps/web/lib/db/migrations/meta/0000_snapshot.json (updated audit_log columns & audit_event enum)
