# Plan 02-07 Summary: Realtime publication

**Status:** COMPLETE (config/code; runtime verification deferred — Docker required)

**Completed:**
- `supabase/migrations/0012_realtime_publication.sql`: `ALTER PUBLICATION supabase_realtime ADD TABLE` on 6 tables (issues, comments, notifications, saved_views, memberships, project_members)
- `supabase/migrations/0013_replica_identity.sql`: `ALTER TABLE ... REPLICA IDENTITY FULL` on the 6 hot tables

**Deferred (Docker required):**
- `npm run db:reset` to apply
- Verification via `pg_publication_tables` and `pg_class.relreplident`
