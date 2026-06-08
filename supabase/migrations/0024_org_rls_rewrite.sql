-- Migration 0024: RLS policy rewrite for the 4 org-plugin-owned tables.
--
-- Drops every RLS policy on `workspaces`, `memberships`, `invitations`,
-- `teams` and re-creates them using the new camelCase columns
-- (`workspaceId`, `userId`, `role` as text).
--
-- The membership-first predicate (D-04-03) is preserved: every workspace
-- check goes through `EXISTS (SELECT 1 FROM memberships WHERE "userId" = …)`.
-- The identity source is the `request.jwt.claims` GUC set by
-- `public.set_user(text)` (per 0002) — RLS never reads `auth.jwt()`
-- directly. This is what the test harness in
-- `apps/web/lib/db/_tests/rls.org.test.ts` exercises.
--
-- The 0002 `current_user_id()` helper returns the internal `users.id`
-- bigint (lookup by external_id). After 0023, `memberships."userId"` is
-- text (matches Better Auth's `user.id` text), so the policies below use
-- a new helper `public.current_user_external_id()` that returns the
-- text external_id directly from the JWT sub. The original bigint
-- helper stays in place for the 0003 policies on other tables.
--
-- Role-gated mutations (memberships insert/update/delete, invitations
-- create/update) require the actor to be `owner` or `admin` in the
-- target workspace. The check uses a subquery on the same memberships
-- table to keep the helper signature simple (no `is_admin(text)` form
-- required).
--
-- Other tables (issues, projects, labels, …) keep their 0003 policies.
-- Those policies reference `workspaces.id` and `memberships.workspace_id`
-- by name; after 0023 those columns are text, but the policies' USING
-- clauses compare values not types, so they survive the column-type
-- change without modification. (Verified by the existing
-- `rls.test.ts` suite.)
--
-- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
-- Helper is CREATE OR REPLACE.

-- ─── Helper: returns the current user's external_id (text) ──────────
-- Better Auth sets `auth.jwt() ->> 'sub'` to the user's external_id
-- (matches `public.users.external_id` and `memberships."userId"`).
-- The 0002 `set_user(text)` helper writes the same value to the
-- `request.jwt.claims` GUC, so the test harness can impersonate users
-- without an actual JWT.
CREATE OR REPLACE FUNCTION public.current_user_external_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.jwt() ->> 'sub'
$$;

-- ─── workspaces ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = workspaces.id
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = workspaces.id
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = workspaces.id
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── memberships ────────────────────────────────────────────────────
-- SELECT: a user sees memberships of workspaces they belong to, plus
-- their own membership rows in any workspace (so they can detect an
-- invite-pending state).
DROP POLICY IF EXISTS "memberships_select" ON memberships;
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT
  USING (
    "userId" = public.current_user_external_id()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = memberships."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

-- INSERT: only owner/admin can add a member to a workspace.
DROP POLICY IF EXISTS "memberships_insert" ON memberships;
CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = memberships."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- UPDATE: only owner/admin can change a member's role.
DROP POLICY IF EXISTS "memberships_update" ON memberships;
CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = memberships."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- DELETE: only owner/admin can remove a member.
DROP POLICY IF EXISTS "memberships_delete" ON memberships;
CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = memberships."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── invitations ────────────────────────────────────────────────────
-- SELECT: workspace admins/owners can see every invitation; non-admins
-- can see invitations addressed to their email. (The accept-by-token
-- flow is handled by the Better Auth plugin, not by RLS.)
DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select" ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = invitations."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
    OR email = (SELECT email FROM users WHERE external_id = public.current_user_external_id())
  );

-- INSERT: only owner/admin can create an invitation.
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = invitations."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- UPDATE: only owner/admin can modify an invitation.
DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = invitations."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- DELETE: only owner/admin can revoke an invitation.
DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = invitations."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ─── teams ──────────────────────────────────────────────────────────
-- Teams follow the same workspace-scoped pattern as projects.
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = teams."workspaceId"
        AND m."userId" = public.current_user_external_id()
    )
  );

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = teams."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = teams."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m."workspaceId" = teams."workspaceId"
        AND m."userId" = public.current_user_external_id()
        AND m.role IN ('owner', 'admin')
    )
  );
