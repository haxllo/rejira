-- Migration 0037: Recreate RLS policies for the 13 application tables
-- that were dropped by 0023 step 5b and not recreated by 0024.
--
-- Context:
--   0023 step 5b dropped every RLS policy on every table. 0024 recreated
--   only the 4 org-plugin tables (workspaces, memberships, invitations,
--   teams). 0025 recreated audit_log_select. 0027 recreated storage
--   policies. Everything else has been unprotected since 0023 ran.
--
-- This migration:
--   1. Re-enables RLS on the 13 tables that already have it enabled
--      (no-op, but documents the intent and serves as a CI sanity check).
--   2. Recreates the workspace-scoped policies from 0003 against the
--      post-0023 column names ("workspaceId", "userId" on memberships,
--      "userId" on notifications is still bigint referencing legacy users).
--   3. Uses public.current_user_external_id() (0024) for identity, which
--      reads auth.jwt() ->> 'sub' and matches the value set by the
--      withTransaction() helper in apps/web/lib/db/transaction.ts.
--
-- Identity-bridge caveat (documented, not fixed here):
--   notifications.user_id is bigint referencing the legacy public.users.id.
--   The policy joins via users.external_id = current_user_external_id().
--   This works for the seed population (external_ids like 'u_aria') but
--   will not work for real Better Auth users until the notifications
--   model is migrated to use text user_id matching the Better Auth
--   public."user".id. Out of scope for this security fix.
--
-- Idempotent: every CREATE POLICY preceded by DROP POLICY IF EXISTS.
-- Re-running this migration is a no-op once applied.

-- ─── 0. ENABLE ROW LEVEL SECURITY (idempotent) ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users' AND rowsecurity=true) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projects')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='projects' AND rowsecurity=true) THEN
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='project_members' AND rowsecurity=true) THEN
    ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='labels')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='labels' AND rowsecurity=true) THEN
    ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='issues')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='issues' AND rowsecurity=true) THEN
    ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='issue_assignees')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='issue_assignees' AND rowsecurity=true) THEN
    ALTER TABLE issue_assignees ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cycles')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cycles' AND rowsecurity=true) THEN
    ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cycle_issues')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cycle_issues' AND rowsecurity=true) THEN
    ALTER TABLE cycle_issues ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_views')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='saved_views' AND rowsecurity=true) THEN
    ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comments')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='comments' AND rowsecurity=true) THEN
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='notifications' AND rowsecurity=true) THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activities')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='activities' AND rowsecurity=true) THEN
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attachments')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='attachments' AND rowsecurity=true) THEN
    ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ─── 1. users ──────────────────────────────────────────────────────────────
-- The legacy public.users table is the app-side mirror of Better Auth.
-- - SELECT is open so other tables can join on it.
-- - UPDATE is restricted to the row matching the current user (by id,
--   which is bigint in this legacy table; for real Better Auth users
--   the legacy row is absent and the policy is a no-op — same caveat
--   as notifications below).
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users
  FOR UPDATE
  USING (id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id()))
  WITH CHECK (id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id()));

-- ─── 2. projects ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = projects."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = projects."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = projects."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = projects."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = projects."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── 3. project_members ───────────────────────────────────────────────────
DROP POLICY IF EXISTS project_members_select ON project_members;
CREATE POLICY project_members_select ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN memberships m ON m."workspaceId" = p."workspaceId"
      WHERE p.id = project_members.project_id
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS project_members_insert ON project_members;
CREATE POLICY project_members_insert ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN memberships m ON m."workspaceId" = p."workspaceId"
      WHERE p.id = project_members.project_id
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS project_members_update ON project_members;
CREATE POLICY project_members_update ON project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN memberships m ON m."workspaceId" = p."workspaceId"
      WHERE p.id = project_members.project_id
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS project_members_delete ON project_members;
CREATE POLICY project_members_delete ON project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN memberships m ON m."workspaceId" = p."workspaceId"
      WHERE p.id = project_members.project_id
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── 4. labels ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS labels_select ON labels;
CREATE POLICY labels_select ON labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = labels."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS labels_insert ON labels;
CREATE POLICY labels_insert ON labels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = labels."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS labels_update ON labels;
CREATE POLICY labels_update ON labels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = labels."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS labels_delete ON labels;
CREATE POLICY labels_delete ON labels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = labels."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── 5. issues ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS issues_select ON issues;
CREATE POLICY issues_select ON issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issues_insert ON issues;
CREATE POLICY issues_insert ON issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issues_update ON issues;
CREATE POLICY issues_update ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issues_delete ON issues;
CREATE POLICY issues_delete ON issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND (m.role IN ('owner', 'admin') OR EXISTS (
          SELECT 1 FROM issues i
          WHERE i.id = issues.id AND i.author_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
        ))
    )
  );

-- ─── 6. issue_assignees ───────────────────────────────────────────────────
DROP POLICY IF EXISTS issue_assignees_select ON issue_assignees;
CREATE POLICY issue_assignees_select ON issue_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issue_assignees."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issue_assignees_insert ON issue_assignees;
CREATE POLICY issue_assignees_insert ON issue_assignees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issue_assignees."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issue_assignees_update ON issue_assignees;
CREATE POLICY issue_assignees_update ON issue_assignees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issue_assignees."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS issue_assignees_delete ON issue_assignees;
CREATE POLICY issue_assignees_delete ON issue_assignees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = issue_assignees."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

-- ─── 7. cycles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS cycles_select ON cycles;
CREATE POLICY cycles_select ON cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycles."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS cycles_insert ON cycles;
CREATE POLICY cycles_insert ON cycles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycles."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS cycles_update ON cycles;
CREATE POLICY cycles_update ON cycles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycles."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS cycles_delete ON cycles;
CREATE POLICY cycles_delete ON cycles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycles."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── 8. cycle_issues ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS cycle_issues_select ON cycle_issues;
CREATE POLICY cycle_issues_select ON cycle_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycle_issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS cycle_issues_insert ON cycle_issues;
CREATE POLICY cycle_issues_insert ON cycle_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycle_issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS cycle_issues_update ON cycle_issues;
CREATE POLICY cycle_issues_update ON cycle_issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycle_issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS cycle_issues_delete ON cycle_issues;
CREATE POLICY cycle_issues_delete ON cycle_issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = cycle_issues."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

-- ─── 9. saved_views ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS saved_views_select ON saved_views;
CREATE POLICY saved_views_select ON saved_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = saved_views."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS saved_views_insert ON saved_views;
CREATE POLICY saved_views_insert ON saved_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = saved_views."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS saved_views_update ON saved_views;
CREATE POLICY saved_views_update ON saved_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = saved_views."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS saved_views_delete ON saved_views;
CREATE POLICY saved_views_delete ON saved_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = saved_views."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

-- ─── 10. comments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS comments_select ON comments;
CREATE POLICY comments_select ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = comments."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS comments_insert ON comments;
CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = comments."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS comments_update ON comments;
CREATE POLICY comments_update ON comments FOR UPDATE
  USING (
    author_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
  )
  WITH CHECK (
    author_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
  );

DROP POLICY IF EXISTS comments_delete ON comments;
CREATE POLICY comments_delete ON comments FOR DELETE
  USING (
    author_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = comments."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── 11. notifications ────────────────────────────────────────────────────
-- Identity bridge: notifications.user_id is bigint (legacy users.id).
-- Policy resolves the current Better Auth user → legacy users row via
-- external_id. Works for seeded demo identities; real Better Auth users
-- with no legacy users row get 0 rows (documented limitation, not a
-- security regression — the alternative is "open by default" which is
-- strictly worse).
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    user_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
  );

DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (
    user_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
  );

-- ─── 12. activities ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS activities_select ON activities;
CREATE POLICY activities_select ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = activities."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

-- ─── 13. attachments ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS attachments_select ON attachments;
CREATE POLICY attachments_select ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = attachments."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS attachments_insert ON attachments;
CREATE POLICY attachments_insert ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = attachments."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS attachments_delete ON attachments;
CREATE POLICY attachments_delete ON attachments FOR DELETE
  USING (
    uploader_id = (SELECT id FROM public.users WHERE external_id = public.current_user_external_id())
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = attachments."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );
