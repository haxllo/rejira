const { Client } = require('pg');
const fs = require('fs');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
c.connect().then(() => {
  console.log('Connected');
  return c.query(fs.readFileSync('supabase/migrations/0023_org_plugin_alignment.sql', 'utf8'));
}).then(r => {
  console.log('0023 applied:', r.rows?.length || 'OK');
  return c.query(fs.readFileSync('supabase/migrations/0024_org_rls_rewrite.sql', 'utf8'));
}).then(r => {
  console.log('0024 applied:', r.rows?.length || 'OK');
  return c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' ORDER BY ordinal_position");
}).then(r => {
  console.log('workspaces columns:', r.rows);
  return c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' ORDER BY ordinal_position");
}).then(r => {
  console.log('memberships columns:', r.rows);
  return c.query("SELECT 1 FROM pg_type WHERE typname='role_key'");
}).then(r => {
  console.log('role_key ENUM rows:', r.rows);
  c.end();
}).catch(e => {
  console.log('FAIL:', e.message);
  console.log(e.stack);
  c.end();
});
