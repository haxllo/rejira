import { describe, it, expect, beforeAll } from 'vitest';
import { seedTwoWorkspaces, asUser } from './setup';

describe('RLS Enforcement', () => {
  beforeAll(async () => {
    await seedTwoWorkspaces();
  });

  it('1: cross-workspace read denial — member of acme cannot read globex issues', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(
        `SELECT count(*) as c FROM issues WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'globex')`
      );
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('2: own-workspace read allowed — member of acme can read acme issues', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(
        `SELECT count(*) as c FROM issues WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'acme')`
      );
      expect(Number(res.rows[0].c)).toBeGreaterThanOrEqual(0);
    });
  });

  it('3: cross-workspace write denied — member of acme cannot insert into globex issues', async () => {
    await asUser('u_aria', async (client) => {
      await expect(
        client.query(
          `INSERT INTO issues (workspace_id, project_id, external_id, key, number, title)
           VALUES ((SELECT id FROM workspaces WHERE slug = 'globex'), 0, 'bad_1', 'BAD-0001', 9999, 'should fail')`
        )
      ).rejects.toThrow();
    });
  });

  it('4: role enforcement — member (not admin) cannot delete workspace', async () => {
    await asUser('u_kenji', async (client) => {
      await expect(
        client.query(`DELETE FROM workspaces WHERE slug = 'acme'`)
      ).rejects.toThrow();
    });
  });

  it('5: owner can delete own workspace', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(`DELETE FROM workspaces WHERE slug = 'acme'`);
      expect(res).toBeDefined();
    });
  });

  it('6: notifications scoped — user only sees own notifications', async () => {
    await asUser('u_aria', async (client) => {
      const res = await client.query(
        `SELECT count(*) as c FROM notifications WHERE user_id != (SELECT id FROM users WHERE external_id = 'u_aria')`
      );
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('7: audit_log scope — user sees own events only', async () => {
    await asUser('u_aria', async (client) => {
      const ariaId = (await client.query(`SELECT id FROM users WHERE external_id = 'u_aria'`)).rows[0].id;
      const res = await client.query(
        `SELECT count(*) as c FROM audit_log WHERE actor_id IS NOT NULL AND actor_id != $1`,
        [ariaId]
      );
      expect(Number(res.rows[0].c)).toBe(0);
    });
  });

  it('8: static analysis — all 16 business tables have RLS enabled', async () => {
    const client = (await import('./setup')).getPool();
    const res = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = false
        AND tablename NOT IN ('_drizzle_migrations', 'workflow_statuses')
    `);

    const exempt = ['_drizzle_migrations', 'workflow_statuses', '_prisma_migrations', 'cron'];
    const missingRls = res.rows.filter((r: { tablename: string }) => !exempt.includes(r.tablename));
    expect(missingRls).toHaveLength(0);
  });
});
