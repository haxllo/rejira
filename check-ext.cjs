const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
c.connect().then(() => c.query("SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name IN ('pg_idkit', 'pg_cron', 'vector') ORDER BY name"))
  .then(r => { console.log('Available:', r.rows); c.end(); })
  .catch(e => { console.log('FAIL:', e.message); });
