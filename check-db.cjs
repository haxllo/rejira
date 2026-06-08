const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
c.connect().then(() => c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' ORDER BY ordinal_position"))
  .then(r => { console.log(r.rows); c.end(); })
  .catch(e => { console.log('FAIL:', e.message); });
