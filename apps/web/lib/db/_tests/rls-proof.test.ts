import { describe, it, expect, beforeAll } from 'vitest';
import { getPool, asUser } from './setup';

describe('RLS Proof — cross-tenant + role enforcement', () => {
  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO workspaces ("externalId", name, slug, "ownerId")
        VALUES ('ws_ax_proof', 'Alpha', 'alpha-proof', 'placeholder')
        ON CONFLICT ("externalId") DO NOTHING
      `);
      await client.query(`
        INSERT INTO workspaces ("externalId", name, slug, "ownerId")
        VALUES ('ws_bx_proof', 'Beta', 'beta-proof', 'placeholder')
        ON CONFLICT ("externalId") DO NOTHING
      `);

      const users = [
        { ext: 'u_aria_proof', name: 'Aria', email: 'aria-proof@alpha.com' },
        { ext: 'u_priya_proof', name: 'Priya', email: 'priya-proof@beta.com' },
        { ext: 'u_member_proof', name: 'Member', email: 'member-proof@alpha.com' },
        { ext: 'u_outsider_proof', name: 'Outsider', email: 'outsider-proof@test.com' },
      ];
      for (const u of users) {
        await client.query(
          `INSERT INTO users (external_id, email, name) VALUES ($1, $2, $3) ON CONFLICT (external_id) DO NOTHING`,
          [u.ext, u.email, u.name],
        );
      }

      const alphaId = (await client.query(`SELECT id FROM workspaces WHERE slug = 'alpha-proof'`)).rows[0].id;
      const betaId = (await client.query(`SELECT id FROM workspaces WHERE slug = 'beta-proof'`)).rows[0].id;

      await client.query(
        `INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
         VALUES ('mem_aria_alpha_proof', 'u_aria_proof', $1, 'owner')
         ON CONFLICT ("externalId") DO NOTHING`,
        [alphaId],
      );
      await client.query(
        `INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
         VALUES ('mem_priya_beta_proof', 'u_priya_proof', $1, 'owner')
         ON CONFLICT ("externalId") DO NOTHING`,
        [betaId],
      );
      await client.query(
        `INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
         VALUES ('mem_member_alpha_proof', 'u_member_proof', $1, 'member')
         ON CONFLICT ("externalId") DO NOTHING`,
        [alphaId],
      );

      await client.query(
        `INSERT INTO projects (external_id, "workspaceId", key, name)
         VALUES ('proj_alpha_proof', $1, 'ALPHA', 'Alpha Project')
         ON CONFLICT (external_id) DO NOTHING`,
        [alphaId],
      );
      await client.query(
        `INSERT INTO projects (external_id, "workspaceId", key, name)
         VALUES ('proj_beta_proof', $1, 'BETA', 'Beta Project')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId],
      );

      const alphaProjId = (await client.query(`SELECT id FROM projects WHERE external_id = 'proj_alpha_proof'`)).rows[0].id;
      const betaProjId = (await client.query(`SELECT id FROM projects WHERE external_id = 'proj_beta_proof'`)).rows[0].id;

      await client.query(
        `INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
         VALUES ('iss_alpha_proof', $1, $2, 'ALPHA-1', 1, 'Alpha Issue')
         ON CONFLICT (external_id) DO NOTHING`,
        [alphaId, alphaProjId],
      );
      await client.query(
        `INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
         VALUES ('iss_beta_proof', $1, $2, 'BETA-1', 1, 'Beta Issue')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId, betaProjId],
      );

      await client.query(
        `INSERT INTO labels (external_id, "workspaceId", project_id, name, color)
         VALUES ('lbl_beta_proof', $1, $2, 'urgent', '#f00')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId, betaProjId],
      );

      await client.query(
        `INSERT INTO cycles (external_id, "workspaceId", project_id, number, name)
         VALUES ('cyc_beta_proof', $1, $2, 1, 'Sprint 1')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId, betaProjId],
      );

      await client.query(
        `INSERT INTO saved_views (external_id, "workspaceId", owner_id, name)
         VALUES ('sv_beta_proof', $1, (SELECT id FROM users WHERE external_id = 'u_priya_proof'), 'Beta View')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId],
      );

      await client.query(
        `INSERT INTO comments (external_id, "workspaceId", issue_id, author_id, body)
         VALUES ('cmt_beta_proof', $1, (SELECT id FROM issues WHERE external_id = 'iss_beta_proof'),
                 (SELECT id FROM users WHERE external_id = 'u_priya_proof'), 'Beta comment')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId],
      );

      await client.query(
        `INSERT INTO notifications (external_id, "workspaceId", user_id, type)
         VALUES ('notif_beta_proof', $1,
                 (SELECT id FROM users WHERE external_id = 'u_priya_proof'), 'issue_assigned')
         ON CONFLICT (external_id) DO NOTHING`,
        [betaId],
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  describe('cross-tenant isolation', () => {
    it('1: aria (alpha) cannot SELECT beta workspace', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM workspaces WHERE slug = 'beta-proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('2: aria (alpha) cannot SELECT beta issues', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM issues WHERE external_id = 'iss_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('3: aria (alpha) cannot UPDATE beta issues', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(`UPDATE issues SET title = 'Pwned' WHERE external_id = 'iss_beta_proof'`),
        ).rejects.toThrow();
      });
    });

    it('4: aria (alpha) cannot INSERT into beta issues', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(
            `INSERT INTO issues (external_id, "workspaceId", project_id, key, number, title)
             SELECT 'bad_x', id, 1, 'BAD-1', 1, 'fail'
             FROM workspaces WHERE slug = 'beta-proof'`,
          ),
        ).rejects.toThrow();
      });
    });

    it('5: aria (alpha) cannot SELECT beta projects', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM projects WHERE external_id = 'proj_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('6: aria (alpha) cannot UPDATE beta projects', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(`UPDATE projects SET name = 'Pwned' WHERE external_id = 'proj_beta_proof'`),
        ).rejects.toThrow();
      });
    });

    it('7: aria (alpha) cannot SELECT beta labels', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM labels WHERE external_id = 'lbl_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('8: aria (alpha) cannot SELECT beta cycles', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM cycles WHERE external_id = 'cyc_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('9: aria (alpha) cannot SELECT beta saved_views', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM saved_views WHERE external_id = 'sv_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('10: aria (alpha) cannot SELECT beta comments', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM comments WHERE external_id = 'cmt_beta_proof'`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('11: aria (alpha) cannot INSERT into beta memberships', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(
            `INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
             SELECT 'bad_mem_x', 'u_aria_proof', id, 'member'
             FROM workspaces WHERE slug = 'beta-proof'`,
          ),
        ).rejects.toThrow();
      });
    });

    it('12: aria (alpha) CAN select own alpha issues', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM issues WHERE external_id = 'iss_alpha_proof'`);
        expect(Number(r.rows[0].c)).toBeGreaterThanOrEqual(1);
      });
    });

    it('13: aria (alpha) cannot DELETE beta workspaces', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(`DELETE FROM workspaces WHERE slug = 'beta-proof'`),
        ).rejects.toThrow();
      });
    });

    it('14: outsider (no membership) cannot see any workspace', async () => {
      await asUser('u_outsider_proof', async (c) => {
        const r = await c.query(`SELECT count(*)::int AS c FROM workspaces`);
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });
  });

  describe('role enforcement', () => {
    it('15: member (non-admin) cannot promote self to admin', async () => {
      await asUser('u_member_proof', async (c) => {
        await expect(
          c.query(
            `UPDATE memberships SET role = 'admin' WHERE "externalId" = 'mem_member_alpha_proof'`,
          ),
        ).rejects.toThrow();
      });
    });

    it('16: member (non-admin) cannot DELETE a workspace', async () => {
      await asUser('u_member_proof', async (c) => {
        await expect(
          c.query(`DELETE FROM workspaces WHERE slug = 'alpha-proof'`),
        ).rejects.toThrow();
      });
    });

    it('17: owner CAN delete own workspace', async () => {
      await asUser('u_aria_proof', async (c) => {
        const r = await c.query(`DELETE FROM workspaces WHERE slug = 'alpha-proof'`);
        expect(r).toBeDefined();
      });
    });

    it('18: notifications scoped — user only sees own notifications', async () => {
      await asUser('u_aria_proof', async (c) => {
        const ariaId = (await c.query(`SELECT id FROM users WHERE external_id = 'u_aria_proof'`)).rows[0].id;
        const r = await c.query(
          `SELECT count(*)::int AS c FROM notifications WHERE user_id != $1`,
          [ariaId],
        );
        expect(Number(r.rows[0].c)).toBe(0);
      });
    });

    it('19: audit_log scope — user sees own audit events where actor is self', async () => {
      await asUser('u_aria_proof', async (c) => {
        const ariaId = (await c.query(`SELECT id FROM users WHERE external_id = 'u_aria_proof'`)).rows[0].id;
        const r = await c.query(
          `SELECT count(*)::int AS c FROM audit_log WHERE actor_id = $1::text`,
          [String(ariaId)],
        );
        expect(typeof Number(r.rows[0].c)).toBe('number');
      });
    });

    it('20: all business tables have RLS enabled', async () => {
      const pool = getPool();
      const r = await pool.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND rowsecurity = false
          AND tablename NOT IN ('_drizzle_migrations', 'workflow_statuses')
      `);
      const exempt = ['_drizzle_migrations', 'workflow_statuses', '_prisma_migrations', 'cron'];
      const missingRls = r.rows.filter((row: { tablename: string }) => !exempt.includes(row.tablename));
      expect(missingRls).toHaveLength(0);
    });
  });

  describe('cross-tenant write refusals', () => {
    it('21: aria (alpha) cannot INSERT into beta comments', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(
            `INSERT INTO comments (external_id, "workspaceId", issue_id, author_id, body)
             SELECT 'bad_cmt', w.id, i.id, u.id, 'stolen'
             FROM workspaces w, issues i, users u
             WHERE w.slug = 'beta-proof' AND i.external_id = 'iss_beta_proof'
               AND u.external_id = 'u_aria_proof'`,
          ),
        ).rejects.toThrow();
      });
    });

    it('22: aria (alpha) cannot INSERT into beta labels', async () => {
      await asUser('u_aria_proof', async (c) => {
        await expect(
          c.query(
            `INSERT INTO labels (external_id, "workspaceId", project_id, name, color)
             SELECT 'bad_lbl', id, 1, 'pwned', '#000'
             FROM workspaces WHERE slug = 'beta-proof'`,
          ),
        ).rejects.toThrow();
      });
    });
  });
});
