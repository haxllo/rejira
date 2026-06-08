# Plan 02-10 Summary: Idempotent seed

**Status:** COMPLETE (code; runtime verification deferred — Docker required)

**Completed:**
- `apps/web/lib/db/seed.ts`: Drizzle-based seed script with `db.transaction()`, `onConflictDoNothing()` for idempotency
  - 1 workspace (Acme), 12 users, 12 memberships, 4 projects, 10 labels, 3 cycles, 30 issues, 8 comments, 10 notifications, 5 activities
- `apps/web/lib/auth/demo-session.ts`: `ME_ID = "u_aria"` placeholder (Phase 3 deletes)
- Issue numbering: keys ENG-0001 through ENG-0030 (set explicitly in seed)
- Uses `onConflictDoNothing()` on external_id for idempotent re-runs

**Deferred (Docker required):**
- `npm run db:seed` against running local Supabase
- Idempotency verification (second run produces 0 new rows)
- Trigger side-effect verification (activity log, search_vector)
