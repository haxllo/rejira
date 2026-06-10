-- pgTAP: RLS role enforcement for mutations
-- Asserts that non-admin members cannot escalate roles, delete workspaces, etc.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;
SELECT plan(12);

-- ==========================================================================
-- Setup: workspace + 3 users with different roles + test data
-- ==========================================================================

INSERT INTO workspaces ("externalId", name, slug, "ownerId")
VALUES ('ws_rolemut_04rls', 'RoleMut', 'rolemut-04rls', 'placeholder')
ON CONFLICT ("externalId") DO NOTHING;

INSERT INTO users (external_id, email, name)
VALUES ('u_owner_04rls', 'owner-04rls@test.com', 'Owner User')
ON CONFLICT (external_id) DO NOTHING;
INSERT INTO users (external_id, email, name)
VALUES ('u_admin_04rls', 'admin-04rls@test.com', 'Admin User')
ON CONFLICT (external_id) DO NOTHING;
INSERT INTO users (external_id, email, name)
VALUES ('u_member_04rls', 'member-04rls@test.com', 'Member User')
ON CONFLICT (external_id) DO NOTHING;
INSERT INTO users (external_id, email, name)
VALUES ('u_guest_04rls', 'guest-04rls@test.com', 'Guest User')
ON CONFLICT (external_id) DO NOTHING;
INSERT INTO users (external_id, email, name)
VALUES ('u_outsider_04rls', 'outsider-04rls@test.com', 'Outsider User')
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_owner_04rls', 'u_owner_04rls', id, 'owner'
FROM workspaces WHERE slug = 'rolemut-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_owner_04rls');

INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_admin_04rls', 'u_admin_04rls', id, 'admin'
FROM workspaces WHERE slug = 'rolemut-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_admin_04rls');

INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_member_04rls', 'u_member_04rls', id, 'member'
FROM workspaces WHERE slug = 'rolemut-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_member_04rls');

INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_guest_04rls', 'u_guest_04rls', id, 'guest'
FROM workspaces WHERE slug = 'rolemut-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_guest_04rls');

-- ==========================================================================
-- Test 1: non-admin member cannot promote self to owner
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_member_04rls')::text, true);

SELECT throws_ok(
  $$UPDATE memberships SET role = 'owner'
    WHERE "externalId" = 'mem_member_04rls'$$,
  '42501',
  NULL,
  '1: member cannot promote self to owner'
);

-- ==========================================================================
-- Test 2: non-admin member cannot promote another member
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_member_04rls')::text, true);

SELECT throws_ok(
  $$UPDATE memberships SET role = 'admin'
    WHERE "externalId" = 'mem_guest_04rls'$$,
  '42501',
  NULL,
  '2: member cannot promote guest to admin'
);

-- ==========================================================================
-- Test 3: non-owner admin cannot delete workspace
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_admin_04rls')::text, true);

-- Verify admin can see the workspace first
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rolemut-04rls'),
  1,
  '3a: admin CAN see own workspace'
);

SELECT throws_ok(
  $$DELETE FROM workspaces WHERE slug = 'rolemut-04rls'$$,
  '42501',
  NULL,
  '3b: admin cannot DELETE workspace (only owner can)'
);

-- ==========================================================================
-- Test 4: guest cannot see workspace they belong to
-- (workspaces_select policy uses EXISTS in memberships for the user)
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_guest_04rls')::text, true);

SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rolemut-04rls'),
  1,
  '4: guest CAN see own workspace (membership-scoped)'
);

-- ==========================================================================
-- Test 5: guest cannot INSERT a team
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_guest_04rls')::text, true);

SELECT throws_ok(
  $$INSERT INTO teams ("externalId", "workspaceId", name)
    SELECT 'bad_team', id, 'Guest Team'
    FROM workspaces WHERE slug = 'rolemut-04rls'$$,
  '42501',
  NULL,
  '5: guest cannot INSERT team (requires admin)'
);

-- ==========================================================================
-- Test 6: guest cannot INSERT an invitation
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_guest_04rls')::text, true);

SELECT throws_ok(
  $$INSERT INTO invitations ("externalId", "workspaceId", email, role, "tokenHash", "expiresAt", "invitedBy")
    SELECT 'bad_inv', id, 'no@no.com', 'member', 'hash_x', now() + interval '1 day', 'u_guest_04rls'
    FROM workspaces WHERE slug = 'rolemut-04rls'$$,
  '42501',
  NULL,
  '6: guest cannot INSERT invitation (requires admin)'
);

-- ==========================================================================
-- Test 7: outsider (no membership) cannot see any workspace
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_outsider_04rls')::text, true);

SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rolemut-04rls'),
  0,
  '7: outsider (no membership) cannot see workspace'
);

-- ==========================================================================
-- Test 8: outsider cannot INSERT an issue
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_outsider_04rls')::text, true);

SELECT throws_ok(
  $$INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
    SELECT 'bad_iss2', w.id, 1, 'BAD-9998', 9998, 'outsider issue'
    FROM workspaces w WHERE w.slug = 'rolemut-04rls'$$,
  '42501',
  NULL,
  '8: outsider cannot INSERT issue'
);

-- ==========================================================================
-- Test 9: owner CAN delete another member's membership
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_owner_04rls')::text, true);

-- Verify owner can delete the guest membership
SELECT lives_ok(
  $$DELETE FROM memberships WHERE "externalId" = 'mem_guest_04rls'$$,
  '9: owner CAN delete a membership'
);

-- Re-insert the deleted membership for remaining tests
INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
SELECT 'mem_guest_04rls', 'u_guest_04rls', id, 'guest'
FROM workspaces WHERE slug = 'rolemut-04rls'
AND NOT EXISTS (SELECT 1 FROM memberships WHERE "externalId" = 'mem_guest_04rls');

-- ==========================================================================
-- Test 10: non-admin member cannot DELETE a membership
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_member_04rls')::text, true);

SELECT throws_ok(
  $$DELETE FROM memberships WHERE "externalId" = 'mem_guest_04rls'$$,
  '42501',
  NULL,
  '10: member cannot DELETE a membership (requires admin)'
);

-- ==========================================================================
-- Test 11: owner can UPDATE a membership role
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_owner_04rls')::text, true);

WITH updated AS (
  UPDATE memberships SET role = 'admin' WHERE "externalId" = 'mem_guest_04rls' RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  1,
  '11: owner CAN promote guest to admin'
);

-- Revert the promotion
UPDATE memberships SET role = 'guest' WHERE "externalId" = 'mem_guest_04rls';

-- ==========================================================================
-- Test 12: admin can UPDATE a membership role
-- ==========================================================================
SELECT set_config('request.jwt.claims', json_build_object('sub', 'u_admin_04rls')::text, true);

WITH updated AS (
  UPDATE memberships SET role = 'member' WHERE "externalId" = 'mem_guest_04rls' RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  1,
  '12: admin CAN update a membership role'
);

-- Revert the promotion
UPDATE memberships SET role = 'guest' WHERE "externalId" = 'mem_guest_04rls';

SELECT * FROM finish();
ROLLBACK;
