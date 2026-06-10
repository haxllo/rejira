-- Migration 0027: Fix function column references after 0023 camelCase rename
--
-- Migration 0023 renamed columns from snake_case to camelCase on
-- workspaces, memberships, invitations, teams, and all child tables,
-- but did NOT update five stored functions that reference the old
-- column names (workspace_id, user_id) and types (bigint → text).
--
-- This migration:
--   0. Drop storage RLS policies that depend on old function signatures
--   1. Rewrites current_user_id() to return text from Better Auth's "user" table
--   2. Changes activities.actor_id from bigint to text, drops/recreates FK
--   3. Rewrites tg_emit_activity() to use "workspaceId", text types
--   4. Rewrites is_admin() with text param, correct column names
--   5. Rewrites current_role() with text param, correct column names
--   6. Rewrites current_workspace_ids() to return SETOF text
--   7. Fixes audit_log RLS policy cast (drops and recreates)
--   8. Recreates storage RLS policies with updated types
--
-- Idempotent: all CREATE OR REPLACE FUNCTION, all DROP POLICY IF EXISTS,
-- all ALTER TABLE guarded by information_schema checks.

-- ─── 0. Drop storage policies that depend on old function signatures ───────
-- These must be dropped BEFORE the functions are recreated with new types.
-- They are recreated at the end of this migration.

DROP POLICY IF EXISTS avatar_write ON storage.objects;
DROP POLICY IF EXISTS avatar_update ON storage.objects;
DROP POLICY IF EXISTS avatar_delete ON storage.objects;
DROP POLICY IF EXISTS attachment_read ON storage.objects;
DROP POLICY IF EXISTS attachment_write ON storage.objects;

-- ─── 0b. Drop functions that change return type or parameter type ──────────
-- CREATE OR REPLACE FUNCTION cannot change return type; must use DROP first.
-- CASCADE is needed because the old functions had dependencies (already dropped above).

DROP FUNCTION IF EXISTS public.current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_workspace_ids() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(workspace_id bigint);
DROP FUNCTION IF EXISTS public.current_role(workspace_id bigint);

-- ─── 1. Fix current_user_id() — return text from Better Auth "user" table ──
-- The old function looked up `users.id` (bigint) via external_id. Better Auth
-- stores users in `public."user"` with text PKs. The JWT 'sub' claim IS the
-- user's id in the "user" table.
--
-- All callers: tg_emit_activity(), is_admin(), current_role(),
-- current_workspace_ids(), and audit_log / storage RLS policies.
-- The return type was changed from bigint to text.

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM "user" WHERE id = auth.jwt() ->> 'sub'
$function$;

-- ─── 2. Migrate activities.actor_id and object_id from bigint to text ──────
-- The old FK on actor_id referenced users(id) which is bigint. Better Auth uses
-- "user"(id) which is text. We drop the FK, alter the column, and re-add
-- a FK to the Better Auth "user" table.
-- object_id is also changed to text because some source tables (memberships)
-- now have text IDs while others (issues, projects) still have bigint IDs.

ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_actor_id_users_id_fk;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities'
      AND column_name = 'actor_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE activities ALTER COLUMN actor_id TYPE text
      USING actor_id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities'
      AND column_name = 'object_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE activities ALTER COLUMN object_id TYPE text
      USING object_id::text;
  END IF;
END $$;

-- Re-add FK to Better Auth "user" table (text PK)
ALTER TABLE activities
  ADD CONSTRAINT activities_actor_id_user_id_fk
  FOREIGN KEY (actor_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- ─── 3. Fix tg_emit_activity() — "workspaceId" + text types ────────────────
-- Changes:
--   - workspace_id references → "workspaceId"
--   - v_ws_id BIGINT → v_ws_id TEXT
--   - INSERT INTO activities (..., workspace_id, ...) → "workspaceId"
--   - current_user_id() now returns text (matches actor_id)

CREATE OR REPLACE FUNCTION public.tg_emit_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_verb TEXT;
  v_before JSONB;
  v_after JSONB;
  v_ws_id TEXT;
  v_obj_type TEXT;
BEGIN
  v_obj_type := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_verb := 'created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.updated_at = NEW.updated_at THEN
      RETURN NULL;
    END IF;
    v_verb := 'updated';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_verb := 'deleted';
    v_before := to_jsonb(OLD);
    v_after := NULL;
  END IF;

  v_ws_id := COALESCE(NEW."workspaceId", OLD."workspaceId");

  INSERT INTO activities (external_id, "workspaceId", actor_id, verb, object_type, object_id, before, after)
  VALUES (
    'act_' || gen_random_uuid()::TEXT,
    v_ws_id,
    public.current_user_id(),
    v_verb::activity_verb,
    v_obj_type,
    COALESCE(NEW.id::text, OLD.id::text),
    v_before,
    v_after
  );

  RETURN NULL;
END;
$function$;

-- ─── 4. Fix is_admin() — text param, correct column names ─────────────────
-- The old function took `workspace_id bigint` and referenced `user_id`/`workspace_id`.
-- Now takes text workspaceId and uses "userId"/"workspaceId".

CREATE OR REPLACE FUNCTION public.is_admin(workspace_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role IN ('owner', 'admin') FROM public.memberships
  WHERE "userId" = public.current_user_id() AND "workspaceId" = $1
$function$;

-- ─── 5. Fix current_role() — text param, correct column names ─────────────
CREATE OR REPLACE FUNCTION public.current_role(workspace_id text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role::TEXT FROM public.memberships
  WHERE "userId" = public.current_user_id() AND "workspaceId" = $1
$function$;

-- ─── 6. Fix current_workspace_ids() — SETOF text, correct column names ─────
CREATE OR REPLACE FUNCTION public.current_workspace_ids()
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT "workspaceId" FROM public.memberships WHERE "userId" = public.current_user_id()
$function$;

-- ─── 7. Fix audit_log RLS policy — remove bigint cast ──────────────────────
-- The old policy did: is_admin(("actorWorkspaceId")::bigint)
-- which breaks because "actorWorkspaceId" is text (nanoid), not bigint.
-- is_admin() now takes text, so the cast is unnecessary.

DROP POLICY IF EXISTS audit_log_select ON audit_log;

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT
  USING (
    (actor_id = current_user_id()) OR
    ("actorWorkspaceId" IS NOT NULL AND is_admin("actorWorkspaceId"))
  );

-- ─── 8. Recreate storage RLS policies with updated types ───────────────────
-- Avatar policies: current_user_id() now returns text, so ::text cast is
-- harmless (it's a no-op cast). The policies are functionally identical.
-- Attachment policies: current_workspace_ids() now returns SETOF text,
-- so the ::bigint cast on foldername is replaced with ::text.

CREATE POLICY avatar_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY avatar_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY avatar_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY attachment_read ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] IN (SELECT current_workspace_ids())
  );

CREATE POLICY attachment_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] IN (SELECT current_workspace_ids()) AND
    owner = auth.uid()
  );

-- ─── 9. Cleanup: remove orphan tg_user_mirror_sync function ─────────────────
-- The mirror sync function exists but has no trigger attached. It was meant
-- to sync from auth.users → public.users, but Better Auth now owns user
-- management. The function is dead code. We drop it to avoid confusion.
DROP FUNCTION IF EXISTS public.tg_user_mirror_sync;
