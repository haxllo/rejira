import { describe, it, expect, beforeAll } from 'vitest';
import { getPool, seedTwoWorkspaces, asUser } from './setup';

describe('org tables RLS (post 0023/0024)', () => {
  beforeAll(async () => {
    await seedTwoWorkspaces();
  });

  it('1: cross-workspace read isolation — aria (acme) cannot see globex workspaces', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(
        `SELECT count(*)::int AS c FROM workspaces WHERE slug = 'globex'`,
      );
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('2: own-workspace read allowed — aria (acme) sees the acme workspace', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(
        `SELECT count(*)::int AS c FROM workspaces WHERE slug = 'acme'`,
      );
      expect(Number(res.rows[0].c)).toBeGreaterThanOrEqual(1);
    });
  });

  it('3: memberships cross-workspace isolation — aria sees only acme memberships', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(`
        SELECT count(*)::int AS c
          FROM memberships m
          JOIN workspaces w ON w.id = m."workspaceId"
         WHERE w.slug = 'globex'
      `);
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('4: invitations cross-workspace isolation — aria sees no globex invitations', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(`
        SELECT count(*)::int AS c
          FROM invitations inv
          JOIN workspaces w ON w.id = inv."workspaceId"
         WHERE w.slug = 'globex'
      `);
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('5: teams cross-workspace isolation — aria sees no globex teams', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(`
        SELECT count(*)::int AS c
          FROM teams t
          JOIN workspaces w ON w.id = t."workspaceId"
         WHERE w.slug = 'globex'
      `);
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('6: cross-workspace write denied — aria cannot insert into globex memberships', async () => {
    await asUser('u_aria', async (client) => {
      const globexIdRes = await client.query(
        `SELECT id FROM workspaces WHERE slug = 'globex'`,
      );
      const globexId = globexIdRes.rows[0]?.id;
      const ariaIdRes = await client.query(
        `SELECT external_id FROM users WHERE external_id = 'u_aria'`,
      );
      const ariaExtId = ariaIdRes.rows[0]?.external_id;
      await expect(
        client.query(
          `INSERT INTO memberships ("userId", "workspaceId", role)
           VALUES ($1, $2, 'member')`,
          [ariaExtId, globexId],
        ),
      ).rejects.toThrow();
    });
  });

  it('7: cross-workspace update denied — aria cannot update a globex workspace', async () => {
    await asUser('u_aria', async (client) => {
      await expect(
        client.query(
          `UPDATE workspaces SET name = 'Pwned' WHERE slug = 'globex'`,
        ),
      ).rejects.toThrow();
    });
  });

  it('8: column types — workspaces.id, memberships.id, invitations.id, teams.id are all text', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT table_name, data_type
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('workspaces', 'memberships', 'invitations', 'teams')
         AND column_name = 'id'
    `);
    expect(res.rows.length).toBe(4);
    for (const row of res.rows) {
      expect(row.data_type).toBe('text');
    }
  });

  it('9: role column is text on memberships and invitations', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT table_name, data_type
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('memberships', 'invitations')
         AND column_name = 'role'
    `);
    expect(res.rows.length).toBe(2);
    for (const row of res.rows) {
      expect(row.data_type).toBe('text');
    }
  });

  it('10: role_key ENUM is dropped', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT 1 FROM pg_type WHERE typname = 'role_key'
    `);
    expect(res.rows.length).toBe(0);
  });

  it('11: camelCase columns exist on the 4 org tables', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT table_name, column_name
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND ((table_name = 'workspaces' AND column_name IN ('"externalId"', '"ownerId"', '"archivedAt"'))
           OR (table_name = 'memberships' AND column_name IN ('"externalId"', '"userId"', '"workspaceId"'))
           OR (table_name = 'invitations' AND column_name IN ('"externalId"', '"workspaceId"', '"tokenHash"', '"expiresAt"', '"invitedBy"', '"acceptedAt"'))
           OR (table_name = 'teams' AND column_name IN ('"externalId"', '"workspaceId"')))
    `);
    const found = new Set(res.rows.map((r) => `${r.table_name}.${r.column_name}`));
    expect(found.size).toBeGreaterThanOrEqual(15);
  });

  it('12: membership-first RLS predicate uses camelCase columns', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT count(*)::int AS c
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN ('workspaces', 'memberships', 'invitations', 'teams')
         AND (qual LIKE '%"workspaceId"%' OR qual LIKE '%"userId"%'
              OR with_check LIKE '%"workspaceId"%' OR with_check LIKE '%"userId"%')
    `);
    expect(Number(res.rows[0].c)).toBeGreaterThanOrEqual(8);
  });
});
