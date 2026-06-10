-- Migration 0026: Fix workspaces.ownerId type (bigint → text).
--
-- Migration 0023 renamed owner_id → "ownerId" but left the type as bigint.
-- Drizzle schema expects text() to match Better Auth's user.id (text UUID).
-- This migration changes the column type so Drizzle inserts of UUID values
-- into ownerId no longer fail with "invalid input syntax for type bigint".
--
-- Idempotent: guarded by information_schema type check.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'ownerId'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE workspaces ALTER COLUMN "ownerId" TYPE text USING "ownerId"::text;
  END IF;
END $$;
