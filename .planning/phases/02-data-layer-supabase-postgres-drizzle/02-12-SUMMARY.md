# Plan 02-12 Summary: Migration workflow

**Status:** COMPLETE

**Completed:**
- Root `package.json`: Added `db:diff`, `db:push:staging`, `db:push:prod`, `db:branch:create`, `db:branch:delete`, `db:branch:list` scripts
- `docs/runbooks/db-migration.md`: Runbook covering local dev workflow, feature workflow (Drizzle + hand-authored migrations), staging/production deploy, rollback (PITR), drift detection, and Supabase Branching
- All 20 `db:*` scripts are now present in root `package.json`
