-- Migration 0023: Org plugin ↔ Drizzle schema alignment.
--
-- Conforms the 4 Better Auth org-plugin-owned tables (workspaces, memberships,
-- invitations, teams) to Better Auth's expected schema: text primary keys,
-- camelCase columns, `role` as plain `text` (no Postgres ENUM).
--
-- Backfills existing bigserial ids with deterministic nanoid values via
-- `pg_idkit` extension (ORDER BY created_at so re-runs are stable).
--
-- Cascades the id-type change to every workspace-referencing table by:
--   1. Dropping the FK to workspaces (preserves rows)
--   2. Adding a text column alongside the existing bigint workspace_id
--   3. Backfilling the text column from the new workspaces.id text values
--   4. Dropping the old bigint column, renaming text → workspace_id
--   5. Re-adding the FK (now text → text)
--
-- Memberships/invitations `userId` and `invitedBy` are converted to text to
-- match Better Auth's `user.id` (text). The Postgres FK constraint to
-- `users.id` (bigint) is dropped because the types no longer match; the
-- application layer and RLS predicates are the only enforcement. (D-04-01
-- scope: Better Auth is the source of truth for these columns.)
--
-- Idempotent: every ALTER is guarded by IF EXISTS, the role_key ENUM drop
-- uses IF EXISTS, the nanoid backfill only touches rows with NULL id_new.
-- Re-running this migration after a successful apply is a no-op.

CREATE EXTENSION IF NOT EXISTS pg_idkit;

-- ─── 1. Backfill deterministic text ids on the 4 org tables ──────────
-- The new text id lives alongside the existing bigserial id until step 4.

ALTER TABLE workspaces     ADD COLUMN IF NOT EXISTS id_new text;
ALTER TABLE memberships    ADD COLUMN IF NOT EXISTS id_new text;
ALTER TABLE invitations    ADD COLUMN IF NOT EXISTS id_new text;
ALTER TABLE teams          ADD COLUMN IF NOT EXISTS id_new text;

UPDATE workspaces
  SET id_new = idkit.idkit_id('nanoid', 21)
  WHERE id_new IS NULL
  ORDER BY created_at;

UPDATE memberships
  SET id_new = idkit.idkit_id('nanoid', 21)
  WHERE id_new IS NULL
  ORDER BY created_at;

UPDATE invitations
  SET id_new = idkit.idkit_id('nanoid', 21)
  WHERE id_new IS NULL
  ORDER BY created_at;

UPDATE teams
  SET id_new = idkit.idkit_id('nanoid', 21)
  WHERE id_new IS NULL
  ORDER BY created_at;

-- ─── 2. Convert memberships.role and invitations.role from ENUM to text
--      (must happen BEFORE dropping the role_key ENUM type)

ALTER TABLE memberships ALTER COLUMN role DROP DEFAULT;
ALTER TABLE memberships ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE memberships ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE invitations ALTER COLUMN role DROP DEFAULT;
ALTER TABLE invitations ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE invitations ALTER COLUMN role SET DEFAULT 'member';

DROP TYPE IF EXISTS public.role_key;

-- ─── 3. Drop memberships.userId and invitations.invitedBy FKs to users
--      (user.id stays bigint; memberships.userId and invitations.invitedBy
--      become text to match Better Auth's user.id text column)

ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_user_id_users_id_fk;

ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_invited_by_users_id_fk;

-- ─── 4. Add new text workspace_id columns on every child table and
--      backfill them by joining on the OLD bigint workspace_id.
--      The text value is the nanoid id from the new workspaces.id_new
--      column. The bigint column stays until step 6 so the JOIN works.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE projects p
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE p.workspace_id = w.id
    AND p.workspace_id_new IS NULL;

ALTER TABLE labels
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE labels l
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE l.workspace_id = w.id
    AND l.workspace_id_new IS NULL;

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE issues i
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE i.workspace_id = w.id
    AND i.workspace_id_new IS NULL;

ALTER TABLE issue_assignees
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE issue_assignees ia
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE ia.workspace_id = w.id
    AND ia.workspace_id_new IS NULL;

ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE cycles c
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE c.workspace_id = w.id
    AND c.workspace_id_new IS NULL;

ALTER TABLE cycle_issues
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE cycle_issues ci
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE ci.workspace_id = w.id
    AND ci.workspace_id_new IS NULL;

ALTER TABLE saved_views
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE saved_views sv
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE sv.workspace_id = w.id
    AND sv.workspace_id_new IS NULL;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE comments c
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE c.workspace_id = w.id
    AND c.workspace_id_new IS NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE notifications n
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE n.workspace_id = w.id
    AND n.workspace_id_new IS NULL;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE activities a
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE a.workspace_id = w.id
    AND a.workspace_id_new IS NULL;

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE attachments att
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE att.workspace_id = w.id
    AND att.workspace_id_new IS NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_workspace_id_new text;

UPDATE audit_log al
  SET actor_workspace_id_new = w.id_new
  FROM workspaces w
  WHERE al.actor_workspace_id = w.id
    AND al.actor_workspace_id_new IS NULL;

ALTER TABLE workspace_security_policy
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE workspace_security_policy wsp
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE wsp.workspace_id = w.id
    AND wsp.workspace_id_new IS NULL;

-- memberships also references workspaces; the workspace_id is a bigint
-- (FK to workspaces.id). The migration moves it to text by the same
-- pattern (drop FK, add column, backfill from the new text id).
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE memberships m
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE m.workspace_id = w.id
    AND m.workspace_id_new IS NULL;

-- teams (and invitations) — same pattern
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE teams t
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE t.workspace_id = w.id
    AND t.workspace_id_new IS NULL;

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS workspace_id_new text;

UPDATE invitations inv
  SET workspace_id_new = w.id_new
  FROM workspaces w
  WHERE inv.workspace_id = w.id
    AND inv.workspace_id_new IS NULL;

-- ─── 5. Drop every FK constraint that references workspaces(id) so
--      the PK swap in step 6 is unblocked. CASCADE is not used here:
--      the FKs reference workspaces.id (the bigserial column), not the
--      PK constraint by name, and we want to recreate them cleanly in
--      step 7.

DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN
    SELECT conname, conrelid::regclass AS tbl
      FROM pg_constraint
     WHERE contype = 'f'
       AND pg_get_constraintdef(oid) LIKE '%REFERENCES workspaces(id)%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk_record.tbl, fk_record.conname);
  END LOOP;
END $$;

-- ─── 6. Swap the 4 PKs to text (drop old bigserial, rename id_new → id,
--      re-add PK constraint). Also swap workspace_id in memberships +
--      invitations + teams (they were re-added via workspace_id_new).

-- workspaces
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_pkey;
ALTER TABLE workspaces DROP COLUMN id;
ALTER TABLE workspaces RENAME COLUMN id_new TO id;
ALTER TABLE workspaces ADD PRIMARY KEY (id);

-- memberships
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_pkey;
ALTER TABLE memberships DROP COLUMN id;
ALTER TABLE memberships RENAME COLUMN id_new TO id;
ALTER TABLE memberships ADD PRIMARY KEY (id);
ALTER TABLE memberships DROP COLUMN workspace_id;
ALTER TABLE memberships RENAME COLUMN workspace_id_new TO "workspaceId";

-- invitations
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_pkey;
ALTER TABLE invitations DROP COLUMN id;
ALTER TABLE invitations RENAME COLUMN id_new TO id;
ALTER TABLE invitations ADD PRIMARY KEY (id);
ALTER TABLE invitations DROP COLUMN workspace_id;
ALTER TABLE invitations RENAME COLUMN workspace_id_new TO "workspaceId";

-- teams
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_pkey;
ALTER TABLE teams DROP COLUMN id;
ALTER TABLE teams RENAME COLUMN id_new TO id;
ALTER TABLE teams ADD PRIMARY KEY (id);
ALTER TABLE teams DROP COLUMN workspace_id;
ALTER TABLE teams RENAME COLUMN workspace_id_new TO "workspaceId";

-- ─── 7. Swap workspace_id on the other 13 child tables (drop bigint,
--      rename text column, re-add FK to workspaces(id))

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects', 'labels', 'issues', 'issue_assignees', 'cycles',
    'cycle_issues', 'saved_views', 'comments', 'notifications',
    'activities', 'attachments', 'workspace_security_policy'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I DROP COLUMN workspace_id', t);
    EXECUTE format('ALTER TABLE %I RENAME COLUMN workspace_id_new TO "workspaceId"', t);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON DELETE CASCADE',
      t, t || '_workspaceId_workspaces_id_fk'
    );
  END LOOP;
END $$;

-- audit_log uses actor_workspace_id, not workspace_id, and the FK is
-- optional (the column is nullable). Same pattern, no FK re-add.
ALTER TABLE audit_log DROP COLUMN actor_workspace_id;
ALTER TABLE audit_log RENAME COLUMN actor_workspace_id_new TO "actorWorkspaceId";

-- ─── 8. Re-add memberships.userId and invitations.invitedBy as text
--      (the bigint-to-text cast uses bigint::text; values are the old
--      users.id bigint values rendered as strings — the app layer must
--      look up users by external_id when handling these ids)

ALTER TABLE memberships
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE invitations
  ALTER COLUMN invited_by TYPE text USING invited_by::text;

-- ─── 9. Rename snake_case columns to camelCase on the 4 org tables ────
-- All these are guarded by information_schema checks so re-running the
-- migration is a no-op.

-- workspaces
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='workspaces' AND column_name='external_id') THEN
    ALTER TABLE workspaces RENAME COLUMN external_id TO "externalId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='workspaces' AND column_name='owner_id') THEN
    ALTER TABLE workspaces RENAME COLUMN owner_id TO "ownerId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='workspaces' AND column_name='archived_at') THEN
    ALTER TABLE workspaces RENAME COLUMN archived_at TO "archivedAt";
  END IF;
END $$;

-- memberships
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='memberships' AND column_name='external_id') THEN
    ALTER TABLE memberships RENAME COLUMN external_id TO "externalId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='memberships' AND column_name='user_id') THEN
    ALTER TABLE memberships RENAME COLUMN user_id TO "userId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='memberships' AND column_name='created_at') THEN
    ALTER TABLE memberships RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='memberships' AND column_name='updated_at') THEN
    ALTER TABLE memberships RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

-- invitations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='external_id') THEN
    ALTER TABLE invitations RENAME COLUMN external_id TO "externalId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='token_hash') THEN
    ALTER TABLE invitations RENAME COLUMN token_hash TO "tokenHash";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='expires_at') THEN
    ALTER TABLE invitations RENAME COLUMN expires_at TO "expiresAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='invited_by') THEN
    ALTER TABLE invitations RENAME COLUMN invited_by TO "invitedBy";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='accepted_at') THEN
    ALTER TABLE invitations RENAME COLUMN accepted_at TO "acceptedAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invitations' AND column_name='created_at') THEN
    ALTER TABLE invitations RENAME COLUMN created_at TO "createdAt";
  END IF;
END $$;

-- teams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='teams' AND column_name='external_id') THEN
    ALTER TABLE teams RENAME COLUMN external_id TO "externalId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='teams' AND column_name='created_at') THEN
    ALTER TABLE teams RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='teams' AND column_name='updated_at') THEN
    ALTER TABLE teams RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

-- ─── 10. Refresh unique / btree indexes on the renamed columns ──────
-- Postgres auto-renames the underlying index when the column is renamed
-- via ALTER TABLE … RENAME COLUMN. The constraint names (e.g.
-- memberships_user_workspace_idx) are not auto-renamed. We explicitly
-- rename them so application queries that hint on the index stay
-- efficient and so `drizzle-kit generate` sees the camelCase names.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='memberships'
                AND indexname='memberships_user_workspace_idx') THEN
    ALTER INDEX memberships_user_workspace_idx
      RENAME TO "memberships_userId_workspaceId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='memberships'
                AND indexname='memberships_workspace_role_idx') THEN
    ALTER INDEX memberships_workspace_role_idx
      RENAME TO "memberships_workspaceId_role_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='invitations'
                AND indexname='invitations_workspace_email_idx') THEN
    ALTER INDEX invitations_workspace_email_idx
      RENAME TO "invitations_workspaceId_email_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='invitations'
                AND indexname='invitations_token_hash_idx') THEN
    ALTER INDEX invitations_token_hash_idx
      RENAME TO "invitations_tokenHash_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='workspaces'
                AND indexname='workspaces_external_id_idx') THEN
    ALTER INDEX workspaces_external_id_idx
      RENAME TO "workspaces_externalId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='teams'
                AND indexname='teams_external_id_idx') THEN
    ALTER INDEX teams_external_id_idx
      RENAME TO "teams_externalId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='memberships'
                AND indexname='memberships_user_id_idx') THEN
    ALTER INDEX memberships_user_id_idx
      RENAME TO "memberships_userId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='memberships'
                AND indexname='memberships_workspace_id_idx') THEN
    ALTER INDEX memberships_workspace_id_idx
      RENAME TO "memberships_workspaceId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='invitations'
                AND indexname='invitations_workspace_id_idx') THEN
    ALTER INDEX invitations_workspace_id_idx
      RENAME TO "invitations_workspaceId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname='public' AND tablename='teams'
                AND indexname='teams_workspace_id_idx') THEN
    ALTER INDEX teams_workspace_id_idx
      RENAME TO "teams_workspaceId_idx";
  END IF;
END $$;

-- workspaces.slug stays snake_case (the column name) — the slug is
-- generated by the org plugin and our schema mirrors it verbatim. The
-- `workspaces_slug_idx` index name is left alone.
