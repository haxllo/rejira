import { Pool, type PoolClient } from 'pg';

const DIRECT_URL = process.env.DIRECT_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: DIRECT_URL, max: 5 });
  }
  return pool;
}

export async function seedTwoWorkspaces() {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO workspaces ("externalId", name, slug, "ownerId")
      VALUES ('ws_acme_ext', 'Acme', 'acme', 'owner_placeholder')
      ON CONFLICT ("externalId") DO NOTHING
    `);
    await client.query(`
      INSERT INTO workspaces ("externalId", name, slug, "ownerId")
      VALUES ('ws_globex_ext', 'Globex', 'globex', 'owner_placeholder')
      ON CONFLICT ("externalId") DO NOTHING
    `);

    const users = [
      { ext: 'u_aria', name: 'Aria', email: 'aria@acme.com' },
      { ext: 'u_kenji', name: 'Kenji', email: 'kenji@acme.com' },
      { ext: 'u_priya', name: 'Priya', email: 'priya@globex.com' },
      { ext: 'u_diego', name: 'Diego', email: 'diego@globex.com' },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (external_id, name, email) VALUES ($1, $2, $3) ON CONFLICT (external_id) DO NOTHING`,
        [u.ext, u.name, u.email]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function asUser(
  externalId: string,
  fn: (client: PoolClient) => Promise<void>,
) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT public.set_user($1)', [externalId]);
    await fn(client);
    await client.query('ROLLBACK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
