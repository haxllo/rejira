import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const DIRECT_URL = process.env.DIRECT_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SKIP_INTEGRATION = !process.env.DIRECT_URL || process.env.CI === 'true';

describe.skipIf(SKIP_INTEGRATION)('full-flow integration test', () => {
  let directPool: InstanceType<typeof import('pg').Pool>;
  let workspaceAId: string;
  let workspaceBId: string;
  let projectAId: string;
  let issueAId: string;
  let membershipAId: string;

  beforeAll(async () => {
    const { Pool } = await import('pg');
    directPool = new Pool({ connectionString: DIRECT_URL, max: 5 });

    const client = await directPool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO users (external_id, name, email)
        VALUES ('u_ff_a', 'Flow User A', 'flow-a@test.com')
        ON CONFLICT (external_id) DO NOTHING
      `);
      await client.query(`
        INSERT INTO users (external_id, name, email)
        VALUES ('u_ff_b', 'Flow User B', 'flow-b@test.com')
        ON CONFLICT (external_id) DO NOTHING
      `);

      await client.query(`
        INSERT INTO workspaces ("externalId", name, slug, "ownerId")
        VALUES ('ws_ff_a', 'Flow Workspace A', 'flow-ws-a', 'u_ff_a')
        ON CONFLICT ("externalId") DO NOTHING
      `);
      await client.query(`
        INSERT INTO workspaces ("externalId", name, slug, "ownerId")
        VALUES ('ws_ff_b', 'Flow Workspace B', 'flow-ws-b', 'u_ff_b')
        ON CONFLICT ("externalId") DO NOTHING
      `);

      const wsA = await client.query(`SELECT id FROM workspaces WHERE "externalId" = 'ws_ff_a'`);
      const wsB = await client.query(`SELECT id FROM workspaces WHERE "externalId" = 'ws_ff_b'`);
      workspaceAId = wsA.rows[0].id;
      workspaceBId = wsB.rows[0].id;

      await client.query(`
        INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
        VALUES ('mem_ff_a', 'u_ff_a', $1, 'owner')
        ON CONFLICT ("externalId") DO NOTHING
      `, [workspaceAId]);
      await client.query(`
        INSERT INTO memberships ("externalId", "userId", "workspaceId", role)
        VALUES ('mem_ff_b', 'u_ff_b', $1, 'owner')
        ON CONFLICT ("externalId") DO NOTHING
      `, [workspaceBId]);

      const memA = await client.query(`SELECT id FROM memberships WHERE "externalId" = 'mem_ff_a'`);
      membershipAId = memA.rows[0].id;

      await client.query(`
        INSERT INTO projects (id, "externalId", name, key, "workspaceId")
        VALUES (99992, 'proj_ff_a', 'Flow Project', 'FLOW', $1)
        ON CONFLICT (id) DO NOTHING
      `, [workspaceAId]);
      const proj = await client.query(`SELECT id FROM projects WHERE "externalId" = 'proj_ff_a'`);
      projectAId = proj.rows[0].id;

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }, 30000);

  afterAll(async () => {
    const client = await directPool.connect();
    try {
      await client.query(`DELETE FROM activities WHERE "externalId" LIKE 'act_ff_%'`);
      await client.query(`DELETE FROM comments WHERE "externalId" LIKE 'com_ff_%'`);
      await client.query(`DELETE FROM issues WHERE "externalId" LIKE 'iss_ff_%'`);
      await client.query(`DELETE FROM projects WHERE "externalId" = 'proj_ff_a'`);
      await client.query(`DELETE FROM memberships WHERE "externalId" IN ('mem_ff_a', 'mem_ff_b')`);
      await client.query(`DELETE FROM workspaces WHERE "externalId" IN ('ws_ff_a', 'ws_ff_b')`);
      await client.query(`DELETE FROM users WHERE external_id IN ('u_ff_a', 'u_ff_b')`);
    } finally {
      client.release();
    }
    await directPool?.end();
  });

  it('full cutover flow: create issue → assign → status change → comment → close', async () => {
    const client = await directPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT public.set_user('u_ff_a')`);

      await client.query(`
        INSERT INTO issues ("externalId", "workspaceId", "projectId", key, number, title, status, "assigneeIds")
        VALUES ('iss_ff_1', $1, $2, 'FLOW-1', 1, 'First integration test issue', 'backlog', ARRAY[$3])
      `, [workspaceAId, projectAId, Number(membershipAId)]);

      const iss = await client.query(`SELECT "externalId", id FROM issues WHERE "externalId" = 'iss_ff_1'`);
      issueAId = iss.rows[0].id;
      expect(iss.rows[0].externalId).toBe('iss_ff_1');

      await client.query(`
        UPDATE issues SET status = 'in_progress' WHERE "externalId" = 'iss_ff_1'
      `);

      await client.query(`
        INSERT INTO comments ("externalId", "workspaceId", "issueId", "userId", body)
        VALUES ('com_ff_1', $1, $2, 'u_ff_a', 'This is a test comment')
      `, [workspaceAId, issueAId]);

      await client.query(`
        UPDATE issues SET status = 'done' WHERE "externalId" = 'iss_ff_1'
      `);

      await client.query(`
        INSERT INTO activities ("externalId", "workspaceId", "objectType", "objectId", "action", "userId")
        VALUES ('act_ff_1', $1, 'issue', $2, 'status_changed', 'u_ff_a'),
               ('act_ff_2', $1, 'issue', $2, 'commented', 'u_ff_a')
      `, [workspaceAId, issueAId]);

      const updated = await client.query(`SELECT status, "assigneeIds" FROM issues WHERE "externalId" = 'iss_ff_1'`);
      expect(updated.rows[0].status).toBe('done');

      const acts = await client.query(
        `SELECT * FROM activities WHERE "objectType" = 'issue' AND "objectId" = $1 AND "externalId" LIKE 'act_ff_%'`,
        [issueAId],
      );
      expect(acts.rows.length).toBeGreaterThanOrEqual(2);

      const cmt = await client.query(
        `SELECT * FROM comments WHERE "externalId" = 'com_ff_1'`,
      );
      expect(cmt.rows.length).toBe(1);
      expect(cmt.rows[0].body).toBe('This is a test comment');

      await client.query('ROLLBACK');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }, 15000);

  it('RLS isolation: user B sees 0 rows from user A workspace', async () => {
    const client = await directPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT public.set_user('u_ff_a')`);

      await client.query(`
        INSERT INTO issues ("externalId", "workspaceId", "projectId", key, number, title, status)
        VALUES ('iss_ff_rls', $1, $2, 'FLOW-RLS', 99, 'RLS isolation test', 'backlog')
      `, [workspaceAId, projectAId]);

      await client.query('COMMIT');

      const clientB = await directPool.connect();
      try {
        await clientB.query('BEGIN');
        await clientB.query(`SELECT public.set_user('u_ff_b')`);

        const resultB = await clientB.query(
          `SELECT * FROM issues WHERE "externalId" = 'iss_ff_rls'`,
        );

        expect(resultB.rows.length).toBe(0);

        await clientB.query('ROLLBACK');
      } catch (e) {
        await clientB.query('ROLLBACK');
        throw e;
      } finally {
        clientB.release();
      }
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const cleanup = await directPool.connect();
    try {
      await cleanup.query(`DELETE FROM issues WHERE "externalId" = 'iss_ff_rls'`);
    } finally {
      cleanup.release();
    }
  }, 15000);

  it('full cutover flow completes within < 5s', async () => {
    const client = await directPool.connect();
    try {
      const start = Date.now();

      await client.query('BEGIN');
      await client.query(`SELECT public.set_user('u_ff_a')`);

      await client.query(`
        INSERT INTO issues ("externalId", "workspaceId", "projectId", key, number, title, status, "assigneeIds")
        VALUES ('iss_ff_perf', $1, $2, 'FLOW-PERF', 100, 'Performance test', 'backlog', ARRAY[$3])
      `, [workspaceAId, projectAId, Number(membershipAId)]);

      await client.query(`UPDATE issues SET status = 'in_progress' WHERE "externalId" = 'iss_ff_perf'`);
      await client.query(`
        INSERT INTO comments ("externalId", "workspaceId", "issueId", "userId", body)
        VALUES ('com_ff_perf', $1, (SELECT id FROM issues WHERE "externalId" = 'iss_ff_perf'), 'u_ff_a', 'Perf comment')
      `, [workspaceAId]);
      await client.query(`UPDATE issues SET status = 'done' WHERE "externalId" = 'iss_ff_perf'`);

      await client.query('ROLLBACK');

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }, 15000);
});
