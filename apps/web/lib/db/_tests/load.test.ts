import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const DIRECT_URL = process.env.DIRECT_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54329/postgres';

const SKIP_LOAD_TESTS = !process.env.DATABASE_URL || process.env.CI === 'true';

describe.skipIf(SKIP_LOAD_TESTS)('load test — 100 concurrent selects', () => {
  let pool: InstanceType<typeof import('pg').Pool>;
  let directPool: InstanceType<typeof import('pg').Pool>;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const { Pool } = await import('pg');

    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 15,
      statement_timeout: 5000,
    });

    directPool = new Pool({
      connectionString: DIRECT_URL,
      max: 5,
    });

    const client = await directPool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO workspaces ("externalId", name, slug, "ownerId")
        VALUES ('ws_load_test', 'Load Test', 'load-test', 'owner_placeholder')
        ON CONFLICT ("externalId") DO NOTHING
      `);

      const ws = await client.query(
        `SELECT id FROM workspaces WHERE "externalId" = 'ws_load_test'`
      );
      testWorkspaceId = ws.rows[0].id;

      await client.query(`
        INSERT INTO projects (id, "externalId", name, key, "workspaceId")
        VALUES (99991, 'proj_load', 'Load Project', 'LOAD', $1)
        ON CONFLICT (id) DO NOTHING
      `, [testWorkspaceId]);

      for (let i = 0; i < 200; i++) {
        await client.query(`
          INSERT INTO issues ("externalId", "workspaceId", "projectId", key, number, title, status)
          VALUES ($1, $2, 99991, $3, $4, $5, 'backlog')
          ON CONFLICT ("externalId") DO NOTHING
        `, [
          `iss_load_${i}`,
          testWorkspaceId,
          `LOAD-${i}`,
          i + 1,
          `Load test issue ${i}`,
        ]);
      }

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
      await client.query(`DELETE FROM issues WHERE "externalId" LIKE 'iss_load_%'`);
      await client.query(`DELETE FROM projects WHERE "externalId" = 'proj_load'`);
      await client.query(`DELETE FROM workspaces WHERE "externalId" = 'ws_load_test'`);
    } finally {
      client.release();
    }
    await pool?.end();
    await directPool?.end();
  });

  it('100 concurrent selects complete in < 5s wall time', async () => {
    const queries = Array.from({ length: 100 }, (_, i) => {
      return pool.query(
        `SELECT id, "externalId", title, status FROM issues WHERE "workspaceId" = $1 AND key = $2`,
        [testWorkspaceId, `LOAD-${i}`],
      );
    });

    const start = Date.now();
    const results = await Promise.all(queries);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
    expect(results.length).toBe(100);
    for (const r of results) {
      expect(r.rows.length).toBe(1);
    }
  }, 15000);

  it('pg_stat_activity shows ≤ 15 active connections during load', async () => {
    const queries = Array.from({ length: 100 }, (_, i) => {
      return pool.query(
        `SELECT id, title FROM issues WHERE "workspaceId" = $1 AND key = $2`,
        [testWorkspaceId, `LOAD-${i}`],
      );
    });

    const monitorQueries: Promise<number>[] = [];
    const interval = setInterval(async () => {
      const result = await directPool.query(
        `SELECT count(*) as cnt FROM pg_stat_activity WHERE state = 'active' AND application_name = 'rejira-web'`,
      );
      monitorQueries.push(Promise.resolve(Number(result.rows[0].cnt)));
    }, 100);

    await Promise.all(queries);
    clearInterval(interval);

    const counts = await Promise.all(monitorQueries);
    if (counts.length > 0) {
      for (const count of counts) {
        expect(count).toBeLessThanOrEqual(15);
      }
    }
  }, 15000);
});
