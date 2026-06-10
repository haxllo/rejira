-- Migration 0025: Fix audit_log columns and add jwks table for Better Auth
--
-- 1. Changes audit_log.actor_id from bigint → text (Drizzle schema expects text)
-- 2. Renames audit_log.actor_workspace_id → "actorWorkspaceId" and changes type to text
-- 3. Adds missing values to the audit_event enum that AuditEventType/emitAuditEvent relies on
-- 4. Creates the jwks table for Better Auth's jwt() plugin
--
-- Runs on top of 0022 (0023 and 0024 are unrelated org-alignment migrations that
-- also touch audit_log — this migration is independent of those).
-- Idempotent: safe to re-run.

-- ─── 0. Drop RLS policy referencing columns we're altering ────────────────
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;

-- ─── 1. Fix audit_log columns ─────────────────────────────────────────────

-- Drop the index referencing the old column name first
DROP INDEX IF EXISTS audit_log_actor_workspace_created_idx;

-- Change actor_id type: bigint → text (column name stays the same)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_log' AND column_name='actor_id' AND data_type='bigint'
  ) THEN
    ALTER TABLE audit_log ALTER COLUMN actor_id TYPE text USING actor_id::text;
  END IF;
END $$;

-- Rename actor_workspace_id → "actorWorkspaceId" (if the old name still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_log' AND column_name='actor_workspace_id'
  ) THEN
    ALTER TABLE audit_log RENAME COLUMN actor_workspace_id TO "actorWorkspaceId";
  END IF;
END $$;

-- Change "actorWorkspaceId" type: bigint → text (if still bigint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_log' AND column_name='actorWorkspaceId' AND data_type='bigint'
  ) THEN
    ALTER TABLE audit_log ALTER COLUMN "actorWorkspaceId" TYPE text USING "actorWorkspaceId"::text;
  END IF;
END $$;

-- Recreate the index on the renamed column
CREATE INDEX IF NOT EXISTS audit_log_actor_workspace_created_idx
  ON audit_log USING btree ("actorWorkspaceId", created_at DESC NULLS LAST);

-- ─── 2. Recreate RLS policy with type casts ───────────────────────────────
-- current_user_id() returns BIGINT; actor_id is now TEXT.
-- is_admin() expects BIGINT; "actorWorkspaceId" is now TEXT.
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT
  USING (
    (actor_id = current_user_id()::text) OR
    (("actorWorkspaceId" IS NOT NULL) AND is_admin("actorWorkspaceId"::bigint))
  );

-- ─── 3. Extend audit_event enum ───────────────────────────────────────────
-- Code (audit.ts AuditEventType, server.ts emitAuditEvent calls) uses values
-- like auth_password_change, auth_email_change, auth_2fa_enabled etc. that
-- were added to the type union but never added to the Postgres enum.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_password_change' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_password_change';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_email_change' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_email_change';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_2fa_enabled' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_2fa_enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_2fa_disabled' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_2fa_disabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_backup_code_used' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_backup_code_used';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_account_deleted' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_account_deleted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_account_restored' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_account_restored';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_passkey_enrolled' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_passkey_enrolled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auth_passkey_removed' AND enumtypid = 'audit_event'::regtype) THEN
    ALTER TYPE audit_event ADD VALUE 'auth_passkey_removed';
  END IF;
END $$;

-- ─── 4. Create jwks table for Better Auth JWT plugin ──────────────────────
-- The jwt() plugin (configured in server.ts) stores JWKS key pairs in this
-- table. Schema from better-auth/dist/plugins/jwt/schema.mjs.

CREATE TABLE IF NOT EXISTS public.jwks (
    id text NOT NULL PRIMARY KEY,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "expiresAt" timestamp with time zone
);
