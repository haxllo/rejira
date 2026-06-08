# Plan 02-04 Summary: RLS policies + isolation tests

**Status:** COMPLETE (config/code; runtime verification deferred — Docker required)

**Completed:**
- `supabase/migrations/0001_rls.sql`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 16 business tables
- `supabase/migrations/0002_rls_helpers.sql`: 5 helper functions (`current_user_id`, `current_workspace_ids`, `current_role`, `is_admin`, `set_user`) — all SECURITY DEFINER with `SET search_path = public`
- `supabase/migrations/0003_rls_policies.sql`: 30+ per-table policies covering SELECT, INSERT, UPDATE, DELETE on all 16 tables, plus specific patterns for comments (author-write), saved_views (owner-modify), audit_log (actor-self/admin-read)
- `apps/web/vitest.config.ts`: configured to include `lib/db/_tests/**/*.test.ts`
- `apps/web/lib/db/_tests/setup.ts`: exports `seedTwoWorkspaces()` and `asUser()` helpers
- `apps/web/lib/db/_tests/rls.test.ts`: 8 RLS enforcement tests (cross-workspace read/write denial, role enforcement, notifications scoping, audit_log scope, static analysis)

**Deferred (Docker required):**
- `npm run db:reset` to apply RLS migrations
- `npm run db:test` to run the 8 RLS tests
- `psql` cross-workspace denial verification
