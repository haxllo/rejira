# Plan 02-09 Summary: pg_cron + scheduled jobs

**Status:** COMPLETE (config/code; runtime verification deferred — Docker required)

**Completed:**
- `supabase/migrations/0016_pg_cron.sql`: `CREATE EXTENSION IF NOT EXISTS pg_cron`
- `supabase/migrations/0017_cron_jobs.sql`: 3 stub functions (`tg_gdpr_hard_delete`, `tg_embedding_refresh`, `tg_orphan_attachment_cleanup`) + 4 `cron.schedule` jobs (gdpr-hard-delete at 3am, embedding-refresh every 6h, orphan-attachment-cleanup Sundays 4am, issues-vacuum daily 2am)

**Deferred (Docker required):**
- `npm run db:reset` to apply
- Verification via `pg_extension` and `cron.job`
