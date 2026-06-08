# Migration Workflow

## Overview

Two migration sources, one apply path:

1. **Drizzle-generated** (`apps/web/lib/db/migrations/`) — app schema changes from Drizzle schema files
2. **Hand-authored** (`supabase/migrations/`) — RLS, triggers, storage, realtime, pgvector, pg_cron

All migrations are applied via `supabase db push` or `supabase db reset`.

## Local Dev Workflow

```bash
supabase start          # bring up the local stack (Docker)
supabase db reset       # drop + re-apply all migrations + seed
npm run db:seed         # populate demo data
```

## Feature Workflow

When changing the schema:

1. **Edit schema files** in `apps/web/lib/db/schema/*.ts`
2. Run `npm run db:generate` to produce a new migration in `apps/web/lib/db/migrations/`
3. Review the generated SQL; copy to `supabase/migrations/` with the next sequential number
4. If adding hand-authored logic (RLS, triggers, etc.), create a new `NNNN_*.sql` in `supabase/migrations/`
5. Commit both the Drizzle schema files AND the migration SQL

## Staging Deploy

```bash
npm run db:push:staging   # applies pending migrations to staging
```

The deploy CI workflow (Phase 8) runs this on push to `main`.

## Production Deploy

```bash
npm run db:push:prod      # applies pending migrations to production
```

## Rollback

PITR is the rollback path. See `docs/runbooks/restore-drill.md`.

## Drift Detection

```bash
npm run db:diff           # detects schema drift (manual changes via Studio)
```

CI runs `db:diff` on every PR; non-empty output fails the build.

## Supabase Branching

```bash
npm run db:branch:create <name>   # create a preview branch
npm run db:branch:list             # list active branches
npm run db:branch:delete <name>   # tear down a branch
```
