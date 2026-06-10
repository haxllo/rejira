-- pgTAP: Cross-tenant RLS isolation for all business tables
-- Asserts that a user in workspace X cannot read/write/delete rows in workspace Y.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;
SELECT plan(21);

-- ==========================================================================
-- Setup: 2 workspaces, 2 users, 2 memberships, 1 issue per workspace
-- ==========================================================================

-- Workspaces (idempotent via ON CONFLICT, but we use explicit INSERT for clarity)
INSERT INTO workspaces ("externalId", name, slug, "ownerId")
VALUES ('ws_acme_04rls', 'Acme', 'acme-04rls', 'placeholder')
ON CONFLICT ("externalId") DO NOTHING;
INSERT INTO workspaces ("externalId", name, slug, "ownerId")
VALUES ('ws_globex_04rls', 'Globex', 'globex-04rls', 'placeholder')
ON CONFLICT ("externalId") DO NOTHING;

-- Users
INSERT INTO users (external_id, email, name)
VALUES ('u_aria_04rls', 'aria-04rls@acme.com', 'Aria 04rls')
ON CONFLICT (external_id) DO NOTHING;
INSERT INTO users (external_id, email, name)
VALUES ('u_priya_04rls', 'priya-04rls@globex.com', 'Priya 04rls')
ON CONFLICT (external_id) DO NOTHING;

-- Memberships: aria = owner of acme; priya = owner of globex
INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_aria_acme_04rls', 'u_aria_04rls', id, 'owner'
FROM workspaces WHERE slug = 'acme-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_aria_acme_04rls');

INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_priya_globex_04rls', 'u_priya_04rls', id, 'owner'
FROM workspaces WHERE slug = 'globex-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_priya_globex_04rls');

-- Projects (one per workspace)
INSERT INTO projects (external_id, "workspaceId", key, name)
SELECT 'proj_acme_04rls', id, 'ACME', 'Acme Project'
FROM workspaces WHERE slug = 'acme-04rls'
AND NOT EXISTS (SELECT 1 FROM projects WHERE external_id = 'proj_acme_04rls');

INSERT INTO projects (external_id, "workspaceId", key, name)
SELECT 'proj_globex_04rls', id, 'GLX', 'Globex Project'
FROM workspaces WHERE slug = 'globex-04rls'
AND NOT EXISTS (SELECT 1 FROM projects WHERE external_id = 'proj_globex_04rls');

-- Issues (one per workspace)
INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
SELECT 'iss_acme_04rls', w.id, p.id, 'ACME-1001', 1001, 'Acme Issue 1'
FROM workspaces w, projects p
WHERE w.slug = 'acme-04rls' AND p.external_id = 'proj_acme_04rls'
AND NOT EXISTS (SELECT 1 FROM issues WHERE external_id = 'iss_acme_04rls');

INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
SELECT 'iss_globex_04rls', w.id, p.id, 'GLX-1001', 1001, 'Globex Issue 1'
FROM workspaces w, projects p
WHERE w.slug = 'globex-04rls' AND p.external_id = 'proj_globex_04rls'
AND NOT EXISTS (SELECT 1 FROM issues WHERE external_id = 'iss_globex_04rls');

-- Labels (one per workspace)
INSERT INTO labels (external_id, "workspaceId", project_id, name, color)
SELECT 'lbl_acme_04rls', w.id, p.id, 'bug', '#ff0000'
FROM workspaces w, projects p
WHERE w.slug = 'acme-04rls' AND p.external_id = 'proj_acme_04rls'
AND NOT EXISTS (SELECT 1 FROM labels WHERE external_id = 'lbl_acme_04rls');

INSERT INTO labels (external_id, "workspaceId", project_id, name, color)
SELECT 'lbl_globex_04rls', w.id, p.id, 'feature', '#00ff00'
FROM workspaces w, projects p
WHERE w.slug = 'globex-04rls' AND p.external_id = 'proj_globex_04rls'
AND NOT EXISTS (SELECT 1 FROM labels WHERE external_id = 'lbl_globex_04rls');

-- Cycles (one per workspace)
INSERT INTO cycles (external_id, "workspaceId", project_id, number, name)
SELECT 'cyc_acme_04rls', w.id, p.id, 1, 'Sprint 1'
FROM workspaces w, projects p
WHERE w.slug = 'acme-04rls' AND p.external_id = 'proj_acme_04rls'
AND NOT EXISTS (SELECT 1 FROM cycles WHERE external_id = 'cyc_acme_04rls');

INSERT INTO cycles (external_id, "workspaceId", project_id, number, name)
SELECT 'cyc_globex_04rls', w.id, p.id, 1, 'Sprint 1'
FROM workspaces w, projects p
WHERE w.slug = 'globex-04rls' AND p.external_id = 'proj_globex_04rls'
AND NOT EXISTS (SELECT 1 FROM cycles WHERE external_id = 'cyc_globex_04rls');

-- Saved views (one per workspace)
INSERT INTO saved_views (external_id, "workspaceId", owner_id, name)
SELECT 'sv_acme_04rls', w.id, u.id, 'My View'
FROM workspaces w, users u
WHERE w.slug = 'acme-04rls' AND u.external_id = 'u_aria_04rls'
AND NOT EXISTS (SELECT 1 FROM saved_views WHERE external_id = 'sv_acme_04rls');

INSERT INTO saved_views (external_id, "workspaceId", owner_id, name)
SELECT 'sv_globex_04rls', w.id, u.id, 'My View'
FROM workspaces w, users u
WHERE w.slug = 'globex-04rls' AND u.external_id = 'u_priya_04rls'
AND NOT EXISTS (SELECT 1 FROM saved_views WHERE external_id = 'sv_globex_04rls');

-- Comments (one per workspace)
INSERT INTO comments (external_id, "workspaceId", issue_id, author_id, body)
SELECT 'cmt_acme_04rls', w.id, i.id, u.id, 'Acme comment'
FROM workspaces w, issues i, users u
WHERE w.slug = 'acme-04rls' AND i.external_id = 'iss_acme_04rls' AND u.external_id = 'u_aria_04rls'
AND NOT EXISTS (SELECT 1 FROM comments WHERE external_id = 'cmt_acme_04rls');

INSERT INTO comments (external_id, "workspaceId", issue_id, author_id, body)
SELECT 'cmt_globex_04rls', w.id, i.id, u.id, 'Globex comment'
FROM workspaces w, issues i, users u
WHERE w.slug = 'globex-04rls' AND i.external_id = 'iss_globex_04rls' AND u.external_id = 'u_priya_04rls'
AND NOT EXISTS (SELECT 1 FROM comments WHERE external_id = 'cmt_globex_04rls');

-- Notifications (one per workspace, for each user)
INSERT INTO notifications (external_id, "workspaceId", user_id, type)
SELECT 'notif_acme_04rls', w.id, u.id, 'issue_assigned'
FROM workspaces w, users u
WHERE w.slug = 'acme-04rls' AND u.external_id = 'u_aria_04rls'
AND NOT EXISTS (SELECT 1 FROM notifications WHERE external_id = 'notif_acme_04rls');

INSERT INTO notifications (external_id, "workspaceId", user_id, type)
SELECT 'notif_globex_04rls', w.id, u.id, 'issue_assigned'
FROM workspaces w, users u
WHERE w.slug = 'globex-04rls' AND u.external_id = 'u_priya_04rls'
AND NOT EXISTS (SELECT 1 FROM notifications WHERE external_id = 'notif_globex_04rls');

-- ==========================================================================
-- Impersonate user aria (member of acme) and assert cross-tenant isolation
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_aria_04rls')::text, true);

-- ─── 1. issues: SELECT cross-workspace returns 0 ────────────────────────
SELECT is(
  (SELECT count(*)::int FROM issues WHERE external_id = 'iss_globex_04rls'),
  0,
  '1: aria (acme) cannot SELECT globex issues'
);

-- ─── 2. issues: UPDATE cross-workspace returns 0 rows affected ──────────
WITH updated AS (
  UPDATE issues SET title = 'Pwned' WHERE external_id = 'iss_globex_04rls' RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  '2: aria (acme) cannot UPDATE globex issues'
);

-- ─── 3. issues: INSERT cross-workspace denied ───────────────────────────
SELECT throws_ok(
  $$INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
    SELECT 'bad_iss', id, 1, 'BAD-9999', 9999, 'should fail'
    FROM workspaces WHERE slug = 'globex-04rls'$$,
  '42501',
  NULL,
  '3: aria (acme) cannot INSERT into globex issues'
);

-- ─── 4. projects: SELECT cross-workspace returns 0 ──────────────────────
SELECT is(
  (SELECT count(*)::int FROM projects WHERE external_id = 'proj_globex_04rls'),
  0,
  '4: aria (acme) cannot SELECT globex projects'
);

-- ─── 5. projects: UPDATE cross-workspace denied ─────────────────────────
SELECT throws_ok(
  $$UPDATE projects SET name = 'Pwned' WHERE external_id = 'proj_globex_04rls'$$,
  '42501',
  NULL,
  '5: aria (acme) cannot UPDATE globex projects'
);

-- ─── 6. cycles: SELECT cross-workspace returns 0 ────────────────────────
SELECT is(
  (SELECT count(*)::int FROM cycles WHERE external_id = 'cyc_globex_04rls'),
  0,
  '6: aria (acme) cannot SELECT globex cycles'
);

-- ─── 7. labels: SELECT cross-workspace returns 0 ────────────────────────
SELECT is(
  (SELECT count(*)::int FROM labels WHERE external_id = 'lbl_globex_04rls'),
  0,
  '7: aria (acme) cannot SELECT globex labels'
);

-- ─── 8. saved_views: SELECT cross-workspace returns 0 ───────────────────
SELECT is(
  (SELECT count(*)::int FROM saved_views WHERE external_id = 'sv_globex_04rls'),
  0,
  '8: aria (acme) cannot SELECT globex saved_views'
);

-- ─── 9. comments: SELECT cross-workspace returns 0 ──────────────────────
SELECT is(
  (SELECT count(*)::int FROM comments WHERE external_id = 'cmt_globex_04rls'),
  0,
  '9: aria (acme) cannot SELECT globex comments'
);

-- ─── 10. activities: SELECT cross-workspace returns 0 ───────────────────
SELECT is(
  (SELECT count(*)::int FROM activities WHERE "workspaceId" = (SELECT id FROM workspaces WHERE slug = 'globex-04rls')),
  0,
  '10: aria (acme) cannot SELECT globex activities'
);

-- ─── 11. memberships: SELECT cross-workspace returns 0 ──────────────────
SELECT is(
  (SELECT count(*)::int FROM memberships WHERE "externalId" = 'mem_priya_globex_04rls'),
  0,
  '11: aria (acme) cannot SELECT globex memberships (non-self)'
);

-- ─── 12. memberships: INSERT cross-workspace denied ─────────────────────
SELECT throws_ok(
  $$INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
    SELECT 'bad_mem', 'u_aria_04rls', id, 'member'
    FROM workspaces WHERE slug = 'globex-04rls'$$,
  '42501',
  NULL,
  '12: aria (acme) cannot INSERT into globex memberships'
);

-- ─── 13. teams: SELECT cross-workspace returns 0 ────────────────────────
-- Insert a test team in globex first (as aria can't insert there, do it as service_role)
SELECT set_config('request.jwt.claims', '', true); -- clear impersonation
INSERT INTO teams ("externalId", "workspaceId", name)
SELECT 'team_globex_04rls', id, 'Globex Team'
FROM workspaces WHERE slug = 'globex-04rls'
AND NOT EXISTS (SELECT 1 FROM teams WHERE "externalId" = 'team_globex_04rls');
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_aria_04rls')::text, true);

SELECT is(
  (SELECT count(*)::int FROM teams WHERE "externalId" = 'team_globex_04rls'),
  0,
  '13: aria (acme) cannot SELECT globex teams'
);

-- ─── 14. workspaces: SELECT cross-workspace returns 0 ───────────────────
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'globex-04rls'),
  0,
  '14: aria (acme) cannot SELECT globex workspace'
);

-- ─── 15. workspaces: UPDATE cross-workspace denied ──────────────────────
SELECT throws_ok(
  $$UPDATE workspaces SET name = 'Pwned' WHERE slug = 'globex-04rls'$$,
  '42501',
  NULL,
  '15: aria (acme) cannot UPDATE globex workspace'
);

-- ─── 16. invitations: SELECT cross-workspace returns 0 ──────────────────
-- Insert a test invitation in globex (as service_role)
SELECT set_config('request.jwt.claims', '', true);
INSERT INTO invitations ("externalId", "workspaceId", email, role, "tokenHash", "expiresAt", "invitedBy")
SELECT 'inv_globex_04rls', id, 'someone@globex.com', 'member',
       'hash_placeholder', now() + interval '7 days', 'u_priya_04rls'
FROM workspaces WHERE slug = 'globex-04rls'
AND NOT EXISTS (SELECT 1 FROM invitations WHERE "externalId" = 'inv_globex_04rls');
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_aria_04rls')::text, true);

SELECT is(
  (SELECT count(*)::int FROM invitations WHERE "externalId" = 'inv_globex_04rls'),
  0,
  '16: aria (acme) cannot SELECT globex invitations'
);

-- ─── 17: own-workspace SELECT confirmed (sanity check) ──────────────────
SELECT is(
  (SELECT count(*)::int FROM issues WHERE external_id = 'iss_acme_04rls'),
  1,
  '17: aria (acme) CAN SELECT own acme issues'
);

-- ─── 18: own-workspace UPDATE confirmed ─────────────────────────────────
WITH updated AS (
  UPDATE issues SET title = 'Acme Updated' WHERE external_id = 'iss_acme_04rls' RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  1,
  '18: aria (acme) CAN UPDATE own acme issues'
);

-- ─── 19: DELETE cross-workspace denied ──────────────────────────────────
SELECT throws_ok(
  $$DELETE FROM projects WHERE external_id = 'proj_globex_04rls'$$,
  '42501',
  NULL,
  '19: aria (acme) cannot DELETE globex projects'
);

-- ─── 20: saved_views INSERT cross-workspace denied ──────────────────────
SELECT throws_ok(
  $$INSERT INTO saved_views (external_id, "workspaceId", owner_id, name)
    SELECT 'bad_sv', w.id, u.id, 'should fail'
    FROM workspaces w, users u
    WHERE w.slug = 'globex-04rls' AND u.external_id = 'u_aria_04rls'$$,
  '42501',
  NULL,
  '20: aria (acme) cannot INSERT saved_view into globex workspace'
);

-- ─── 21: labels INSERT cross-workspace denied ───────────────────────────
SELECT throws_ok(
  $$INSERT INTO labels (external_id, "workspaceId", project_id, name, color)
    SELECT 'bad_lbl', w.id, 0, 'pwned', '#000'
    FROM workspaces w WHERE w.slug = 'globex-04rls'$$,
  '42501',
  NULL,
  '21: aria (acme) cannot INSERT label into globex workspace'
);

SELECT * FROM finish();
ROLLBACK;
