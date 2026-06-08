-- RLS Policies: Per-table SELECT, INSERT, UPDATE, DELETE rules.
-- All business table policies gate access by workspace membership via current_workspace_ids().
-- audit_log uses a different pattern (actor-self or workspace_admin).

-- ─── workspaces ────────────────────────────────────────────────
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (public.is_admin(id));

CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE USING (public.is_admin(id));

-- ─── users ─────────────────────────────────────────────────────
CREATE POLICY "users_select" ON users
  FOR SELECT USING (TRUE);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (id = public.current_user_id());

-- ─── memberships ───────────────────────────────────────────────
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT WITH CHECK (public.is_admin(workspace_id));

CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE USING (public.is_admin(workspace_id));

CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE USING (public.is_admin(workspace_id));

-- ─── projects ──────────────────────────────────────────────────
CREATE POLICY "projects_all" ON projects
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── project_members ───────────────────────────────────────────
CREATE POLICY "project_members_all" ON project_members
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE workspace_id IN (SELECT public.current_workspace_ids()))
  );

-- ─── labels ────────────────────────────────────────────────────
CREATE POLICY "labels_all" ON labels
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── issues ─────────────────────────────────────────────────────
CREATE POLICY "issues_select" ON issues
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "issues_insert" ON issues
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "issues_update" ON issues
  FOR UPDATE USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "issues_delete" ON issues
  FOR DELETE USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── issue_assignees ───────────────────────────────────────────
CREATE POLICY "issue_assignees_all" ON issue_assignees
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── cycles ────────────────────────────────────────────────────
CREATE POLICY "cycles_all" ON cycles
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── cycle_issues ──────────────────────────────────────────────
CREATE POLICY "cycle_issues_all" ON cycle_issues
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── saved_views ───────────────────────────────────────────────
CREATE POLICY "saved_views_select" ON saved_views
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "saved_views_modify" ON saved_views
  FOR UPDATE USING (owner_id = public.current_user_id());

CREATE POLICY "saved_views_insert" ON saved_views
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "saved_views_delete" ON saved_views
  FOR DELETE USING (owner_id = public.current_user_id());

-- ─── comments ──────────────────────────────────────────────────
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT public.current_workspace_ids())
    AND author_id = public.current_user_id()
  );

CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (author_id = public.current_user_id());

CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (author_id = public.current_user_id() OR public.is_admin(workspace_id));

-- ─── notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = public.current_user_id());

-- ─── activities ────────────────────────────────────────────────
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

-- ─── attachments ───────────────────────────────────────────────
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.current_workspace_ids()));

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (uploader_id = public.current_user_id() OR public.is_admin(workspace_id));

-- ─── audit_log ─────────────────────────────────────────────────
-- No workspace_id; gated by actor self or workspace admin
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (
    actor_id = public.current_user_id()
    OR (actor_workspace_id IS NOT NULL AND public.is_admin(actor_workspace_id))
  );
