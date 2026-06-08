const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
c.connect().then(() => c.query("SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'pg_idkit', 'pg_cron', 'vector') ORDER BY extname"))
  .then(r => { console.log('Installed extensions:', r.rows); c.end(); })
  .catch(e => { console.log('FAIL:', e.message); });
