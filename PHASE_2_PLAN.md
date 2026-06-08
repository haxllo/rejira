# Phase 2 — Data layer (Supabase Postgres + Drizzle)

**Status:** 📌 Ready to execute (rewritten from the Convex version, **production-grade**, **not minimal**)
**Owner:** opencode
**Depends on:** Phase 0 ✅, Phase 1 ✅
**Blocks:** Phase 3 (auth), Phase 4 (Drizzle queries/mutations), Phase 5 (realtime), Phase 6 (pgvector search), Phase 7 (Storage), Phase 8 (launch)

## Goal

Stand up a real, multi-tenant, multi-workspace PostgreSQL backend hosted on **Supabase**, accessed via **Drizzle ORM**, secured by **Row Level Security** on every business table, with **Realtime** publication for live updates, **Storage** buckets for avatars and attachments, **pgvector** enabled for the Phase 6 semantic search, and **pg_cron** scheduled jobs for housekeeping. The app continues to read from `lib/mock/`; the database is parallel infrastructure with no UI changes in this phase. **This is where we are starting.**

The Convex version of this phase is **deleted and replaced**. All references to `convex.json`, `convex/schema.ts`, `convex/seed.ts`, `ctx.db.query`, `Doc<"issues">`, `ConvexError`, and `convex-test` are **removed**. They do not appear in this plan.

---

## Why this pivot

Convex is an excellent product but it does not fit the long-term needs of rejira. We need:

- A real relational database with `pgvector`, `pg_cron`, row-level security, point-in-time recovery, branching, and read replicas.
- A real auth framework with first-class TypeScript ergonomics (Better Auth) that can use the same Postgres database as the application.
- A typed ORM (Drizzle) for the app, separate from the auth framework's internal schema, with a clean migration story.

Supabase gives us the managed PostgreSQL platform. Better Auth is the auth framework. Drizzle is the ORM for app data. Three orthogonal concerns, one database, one connection pool.

---

## Stack lock-in (the new architecture)

| Layer | Tool | Why |
|---|---|---|
| Database host | **Supabase Cloud (Postgres 15)** | Managed Postgres, PITR, Branching, Studio, Realtime, Storage, pgvector, pg_cron — all in one |
| Connection from app | **Drizzle ORM** (Postgres dialect) | Type-safe, schema-first, edge-compatible, drizzle-kit for migrations |
| Connection from Better Auth | **pg.Pool → Supabase** (Postgres connection string) | Better Auth uses the same DB; no separate auth database |
| Local dev DB | **Supabase CLI** (Docker: `supabase start`) | Reproducible local Postgres + Studio + Realtime + Storage + Inbucket |
| Connection pooling | **Supabase Pooler** (Supavisor, transaction mode 6543) | PgBouncer-compatible, scale to 1000s of connections; auth uses session-mode 5432 |
| Schema migrations | **drizzle-kit generate + apply** (via Supabase migration files) | Versioned, reviewable SQL; same SQL runs in dev, CI, prod |
| Auth-schema migrations | **`@better-auth/cli generate` → applied via drizzle-kit** | Single migration tool for the whole DB |
| RLS enforcement | **Postgres Row Level Security policies** | Defense in depth at the DB; bypass requires `service_role` |
| Object storage | **Supabase Storage** (S3-compatible) | Avatars, attachments, exports; RLS for storage |
| Realtime | **Supabase Realtime** (Postgres Changes + Broadcast + Presence) | WebSocket subscription per workspace; no Socket.io |
| Vector search | **pgvector** | 1 table, 1 index, hybrid search in Phase 6 |
| Cron | **pg_cron** | Nightly cleanup, hard delete, embedding refresh |
| Secrets | **Supabase Vault** + **Vercel env vars** | No secrets in git, ever |
| Backups | **Supabase PITR** (7 days included; up to 28 on Pro) | Restore to any second within window |
| Branching | **Supabase Branching** (Pro) | One DB per preview deploy, migrated from `main` |

---

## Scope summary (from `PLAN.md` §6)

> Phase 2 — Data layer (Supabase Postgres + Drizzle)
> - 14 entities with `workspaceId` on every business table, managed by Drizzle
> - Row Level Security on every table, scoped by `auth.uid()` + workspace membership
> - Idempotent seed script that creates the demo workspace
> - Storage buckets (avatars, attachments, exports) with RLS
> - Realtime publication of all hot tables (issues, comments, activities, notifications)
> - pgvector extension enabled; embeddings table created (Phase 6 populates it)
> - pg_cron jobs for nightly housekeeping
> - Local dev with `supabase start`; CI gates on schema drift and RLS regressions
> - No UI changes; the app still reads from `lib/mock/`

**Plus what is implied but not yet planned (and now is):**
- **One Drizzle config, one migration directory**, applied via Supabase CLI migration files
- **Two schema layers in one DB**: Better Auth's tables (managed via `@better-auth/cli`) and the app schema (managed via Drizzle), both applied through the same Supabase migration pipeline
- **Postgres connection strings** — three per env: `DATABASE_URL` (pooled, app + Drizzle), `DIRECT_URL` (migrations, never pooled), `DATABASE_URL_SESSION` (Better Auth, session-mode pooler)
- **Demo identity constant** (`ME_ID = "u_aria"`) for this phase — replaced by Better Auth in Phase 3
- **PG_PITR backup strategy** — verified quarterly
- **Static analysis test** that proves every business table has RLS enabled and a `workspaceId` policy

---

## What is already in place

| Surface | State |
|---|---|
| `lib/mock/types.ts` with `User`, `Project`, `Cycle`, `Label`, `Issue`, `Comment`, `Activity`, `InboxItem` | ✅ |
| `lib/mock/issues.ts`, `projects.ts`, `users.ts`, `inbox.ts` exporting the demo dataset | ✅ |
| `lib/state/view-query.ts` with `FilterState`, `GroupBy`, `SortKey`, `SortDir`, `EMPTY_FILTER` | ✅ |
| `lib/state/saved-views.ts` with the `SavedView` shape (used by Phase 4) | ✅ |
| `apps/web/utils/supabase/{client,server,middleware}.ts` (Realtime + Storage clients) | ✅ |
| `apps/web/lib/auth/{client,server,...}.ts` stubs (Phase 3 rewrites; not Phase 2) | partial |
| Supabase project in `muhammad-rahman` org | ❌ — Phase 2 |
| Drizzle config, schema, migrations, RLS | ❌ — Phase 2 |
| `supabase start` local dev | ❌ — Phase 2 |
| Any real persistence outside the app | ❌ — Phase 2 |
| Workspace context in the UI (workspace switcher, `?w=...` URL param) | ❌ — Phase 3 |
| Real user identity (replaces `ME_ID`) | ❌ — Phase 3 |

**Known gap to plan around:** the mock data uses string keys like `i_1001`, `u_aria`, `c_23`. To preserve linkability (deep links, screenshot stability, cross-environment data portability) every entity gets a separate `external_id TEXT UNIQUE` column that we use everywhere in the UI; the surrogate `BIGINT` (or `UUID`) primary key is for joins only.

---

## Workstreams

```
                     ┌──────────────────────────┐
                     │  2A  Supabase project +  │
                     │      local dev + env     │
                     └────────────┬─────────────┘
                                   │ unblocks schema/RLS/migration work
                                   ▼
                     ┌──────────────────────────┐
                     │  2B  Drizzle setup +     │
                     │      base config         │
                     └────────────┬─────────────┘
                                   │ unblocks schema/RLS work
                                   ▼
                     ┌──────────────────────────┐
                     │  2C  App schema (14      │
                     │      entities + indexes) │
                     └────────────┬─────────────┘
                                   │ unblocks RLS work
                                   ▼
                     ┌──────────────────────────┐
                     │  2D  RLS policies +      │
                     │      isolation tests     │
                     └────────────┬─────────────┘
                                   │ unblocks seed/realtime/storage work
                                   ▼
                     ┌──────────────────────────┐
                     │  2E  DB functions +      │
                     │      triggers            │
                     └────────────┬─────────────┘
                                   │ unblocks storage/realtime work
                                   ▼
                     ┌──────────────────────────┐
                     │  2F  Storage buckets +   │
                     │      RLS                 │
                     └────────────┬─────────────┘
                                   │ unblocks realtime work
                                   ▼
                     ┌──────────────────────────┐
                     │  2G  Realtime            │
                     │      publication         │
                     └────────────┬─────────────┘
                                   │ can run in parallel with 2H/2I/2J
                                   ▼
                     ┌──────────────────────────┐
                     │  2H  pgvector setup      │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │  2I  pg_cron + jobs      │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │  2J  Idempotent seed     │
                     └────────────┬─────────────┘
                                   │ unblocks tests + local dev
                                   ▼
                     ┌──────────────────────────┐
                     │  2K  Local dev DX +      │
                     │      .env.example        │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │  2L  Migration workflow  │
                     │      (dev/staging/prod)  │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │  2M  CI gates            │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │  2N  Backups + PITR +    │
                     │      restore drill       │
                     └──────────────────────────┘
```

Streams 2A and 2B are sequential foundations. From 2C onward, work can be parallelized inside the team, but for a single executor we recommend the order above. Total estimate: 5–7 working days.

---

### 2A — Supabase project + local dev + env *(foundation, blocks everything else)*

**Why first:** We need a live Supabase project (and a local one for dev/test) to push schema, RLS, and storage to. Each developer gets a per-branch preview project via Supabase Branching; the production project is provisioned once at the end of Phase 8.

**Tasks:**

1. **Install Supabase CLI** — `brew install supabase/tap/supabase` (macOS) / `scoop install supabase` (Windows) / Linux script. Verify with `supabase --version`. We commit only the CLI version in `.tool-versions` (mise/asdf), not a global package.

2. **Initialize Supabase locally** — `supabase init` at the repo root. Creates:
   ```
   supabase/
     config.toml                  # project config (ports, auth, storage, etc.)
     migrations/                  # versioned SQL migrations (timestamped)
     seed.sql                     # optional SQL seed (we use Drizzle seed; this stays empty)
     functions/                   # Supabase Edge Functions (none in Phase 2)
   ```
   Commit `supabase/config.toml` (it has the local ports and feature flags) and the empty `migrations/` dir.

3. **Start local stack** — `supabase start`. This launches a Docker stack:
   - Postgres 15
   - PostgREST (not used; we use Drizzle directly)
   - GoTrue (not used; we use Better Auth)
   - Realtime
   - Storage
   - Studio (UI at http://127.0.0.1:54323)
   - Inbucket (email catcher at http://127.0.0.1:54324)
   - Edge Functions runtime (not used in Phase 2)

   Pin the image versions in `supabase/config.toml` (`[api].image`, `[db].image`, `[realtime].image`, etc.) so everyone gets the same stack. Verify with `supabase status`.

4. **Create the remote Supabase project** — once per environment (dev, staging, prod):
   - Login: `supabase login` (opens browser)
   - Create: `supabase projects create rejira-dev --org muhammad-rahman --region eu-west-1 --size small`
   - Link: `supabase link --project-ref <ref>` from the repo
   - Pull remote config: `supabase db pull` (pulls the existing schema if any)
   - Note: this project's dev/staging branches use **Supabase Branching** (Pro plan); the production project is created separately in Phase 8 and migration-promoted

5. **Three connection strings per environment** — generate from Supabase Dashboard → Settings → Database:
   ```bash
   # Transaction-mode pooler (PgBouncer-compatible, port 6543) — used by the app
   DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

   # Direct connection (port 5432) — used by migrations (never pooled)
   DIRECT_URL=postgres://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

   # Session-mode pooler (port 5432, no transaction wrapping) — used by Better Auth
   DATABASE_URL_SESSION=postgres://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
   ```
   The reason for the split: Better Auth uses long-lived prepared statements that don't survive transaction-mode pooling; the app uses short-lived queries that benefit from pooling. Migrations must hit `DIRECT_URL` or prepared statements are not seen.

6. **`.env.example`** at the repo root:
   ```bash
   # ─── Supabase ────────────────────────────────────────────────────────────
   # Transaction-mode pooler (port 6543) — used by Drizzle in the app
   DATABASE_URL=

   # Direct connection (port 5432) — used by drizzle-kit migrations only
   DIRECT_URL=

   # Session-mode pooler (port 5432) — used by Better Auth in Phase 3
   DATABASE_URL_SESSION=

   # Public Supabase config (anon key, URL) — for Realtime + Storage clients
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   # Server-only service role key — NEVER expose to the client
   SUPABASE_SERVICE_ROLE_KEY=

   # ─── Better Auth (Phase 3 — placeholder for now) ──────────────────────────
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=http://localhost:3000

   # ─── Resend (Phase 3 — magic-link email) ─────────────────────────────────
   RESEND_API_KEY=

   # ─── Google OAuth (Phase 3) ──────────────────────────────────────────────
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # ─── Sentry (Phase 5) ────────────────────────────────────────────────────
   SENTRY_DSN=
   SENTRY_AUTH_TOKEN=
   ```
   `.env.local` is gitignored; `.env.example` is checked in.

7. **Update root `package.json`** to add Supabase + Drizzle scripts (replacing the old Convex scripts):
   ```json
   {
     "scripts": {
       "db:start": "supabase start",
       "db:stop": "supabase stop",
       "db:status": "supabase status",
       "db:reset": "supabase db reset",
       "db:diff": "supabase db diff",
       "db:push": "supabase db push",
       "db:pull": "supabase db pull",
       "db:studio": "supabase studio",
       "db:types": "supabase gen types typescript --local > apps/web/lib/supabase/database.types.ts",
       "db:seed": "tsx apps/web/lib/db/seed.ts",
       "db:generate": "drizzle-kit generate",
       "db:migrate": "drizzle-kit migrate",
       "db:studio-drizzle": "drizzle-kit studio",
       "db:test": "vitest run apps/web/lib/db/_tests/",
       "db:lint": "supabase db lint",
       "dev": "concurrently -k -n supabase,db,next \"npm:db:start\" \"npm:db:migrate\" \"npm --prefix apps/web run dev\"",
       "dev:web": "npm --prefix apps/web run dev"
     }
   }
   ```
   Add devDeps: `drizzle-kit`, `tsx`, `vitest`, `@types/pg`, `concurrently` (already there from Convex era — keep).

8. **Configure `.gitignore`**:
   ```
   # local env
   .env
   .env.local
   .env.*.local

   # Supabase
   supabase/.branches/
   supabase/.temp/
   ```

**Files to create / edit:**
- `supabase/config.toml` (new, from `supabase init`)
- `supabase/migrations/` (new, empty)
- `.env.example` (new, root) — already partially in `package.json` rewrite
- `package.json` (root) — scripts as above
- `.gitignore` — Supabase entries
- `README.md` — "First-time setup" section (deferred to 2K)

**Acceptance criteria:**
- `supabase start` brings up the local stack; `supabase status` prints the URLs (Studio, DB, Inbucket, Realtime, Storage)
- The remote Supabase project exists; `supabase link` succeeds
- `DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL_SESSION`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are all populated in `.env.local` (gitignored) and `.env.example` is committed
- `npm run db:start`, `npm run db:stop`, `npm run db:status`, `npm run db:studio` all work

---

### 2B — Drizzle setup + base config *(depends on 2A; blocks 2C, 2J)*

**Why now:** Drizzle is the ORM the app will use for every business query. Configuring it once, correctly, is the foundation of Phase 4.

**Tasks:**

1. **Install Drizzle** — already in `package.json` from the Convex removal (`drizzle-orm ^0.36.0`, `drizzle-kit ^0.28.0`, `pg ^8.13.0`, `@types/pg ^8.11.10`).

2. **`drizzle.config.ts`** at the repo root:
   ```ts
   import { defineConfig } from "drizzle-kit";

   export default defineConfig({
     schema: "./apps/web/lib/db/schema/index.ts",
     out: "./apps/web/lib/db/migrations",
     dialect: "postgresql",
     dbCredentials: {
       // drizzle-kit MUST use the direct connection (no pooler) for prepared statements
       url: process.env.DIRECT_URL!,
     },
     verbose: true,
     strict: true,
     schemaFilter: ["public", "auth_app"], // exclude auth.* (managed by Better Auth CLI)
   });
   ```

3. **`apps/web/lib/db/client.ts`** — Drizzle client using `pg.Pool`:
   ```ts
   import { drizzle } from "drizzle-orm/node-postgres";
   import { Pool } from "pg";
   import * as schema from "./schema";

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL!,
     max: 10,                       // tune in Phase 5 based on Vercel function concurrency
     idleTimeoutMillis: 30_000,
     connectionTimeoutMillis: 5_000,
     ssl: { rejectUnauthorized: false }, // Supabase requires SSL
   });

   export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === "development" });

   export type DB = typeof db;
   ```

4. **Schema directory structure** — `apps/web/lib/db/schema/`:
   ```
   schema/
     index.ts          # barrel re-export
     enums.ts          # Postgres enums (status, priority, role, cycle_status, etc.)
     workspaces.ts
     users.ts          # app-side mirror of auth.users (kept in sync via trigger)
     memberships.ts
     projects.ts
     project_members.ts
     labels.ts
     issues.ts
     issue_assignees.ts
     cycles.ts
     cycle_issues.ts
     saved_views.ts
     comments.ts
     notifications.ts
     activities.ts
     attachments.ts
     audit_log.ts      # separate from activities (auth events, GDPR, security)
   ```
   The `audit_log` table is the only one that does not have `workspaceId` — it is keyed on `actor_id` and `actor_workspace_id` (nullable for system events).

5. **Type discipline:**
   - All IDs are `BIGINT GENERATED ALWAYS AS IDENTITY` (cheap, sortable, no UUID-vs-int debate). External `external_id TEXT UNIQUE` is the stable identifier used in URLs and deep links.
   - All timestamps are `TIMESTAMPTZ NOT NULL DEFAULT now()`. The app converts to ISO strings at the boundary (Zod schema in `lib/validation/`).
   - All soft-deletes are `deleted_at TIMESTAMPTZ` (nullable). `archived_at` is a separate concept on workspaces/projects/issues.
   - Enum types are real Postgres enums (not check constraints) for index efficiency and Drizzle ergonomics.
   - `assignee_ids INTEGER[]` and `label_ids INTEGER[]` on `issues` are denormalized mirrors of the join tables for fast reads; the join tables are source of truth for "issues assigned to me" queries.
   - `filter` (on `saved_views`) is `JSONB` for now; Phase 4 re-types it with a Zod discriminated union.

6. **`apps/web/lib/db/schema/index.ts`** — barrel:
   ```ts
   export * from "./enums";
   export * from "./workspaces";
   export * from "./users";
   export * from "./memberships";
   export * from "./projects";
   export * from "./project_members";
   export * from "./labels";
   export * from "./issues";
   export * from "./issue_assignees";
   export * from "./cycles";
   export * from "./cycle_issues";
   export * from "./saved_views";
   export * from "./comments";
   export * from "./notifications";
   export * from "./activities";
   export * from "./attachments";
   export * from "./audit_log";
   ```

7. **`tsconfig.json`** (apps/web) — Drizzle types must be picked up. Add `"strict": true` and confirm `noUncheckedIndexedAccess: true`.

**Files to create / edit:**
- `drizzle.config.ts` (new)
- `apps/web/lib/db/client.ts` (new)
- `apps/web/lib/db/schema/index.ts` (new)
- `apps/web/lib/db/schema/enums.ts` (new, empty stub; 2C populates)

**Acceptance criteria:**
- `npm run db:generate` runs without error (generates an empty migration since no tables yet)
- `npm run db:migrate` applies that empty migration to local Supabase
- The Drizzle client can be imported in a Next.js server action and a smoke-test query runs (e.g. `SELECT 1`)

---

### 2C — App schema (14 entities + 39 indexes) *(depends on 2B; blocks 2D, 2E, 2F, 2J)*

**Why now:** Every other stream consumes the schema. The schema is the contract.

**Tasks:**

1. **Enums** (`apps/web/lib/db/schema/enums.ts`):
   ```ts
   import { pgEnum } from "drizzle-orm/pg-core";

   export const statusKeyEnum = pgEnum("status_key", [
     "backlog", "todo", "in_progress", "in_review", "done", "cancelled",
   ]);
   export const priorityKeyEnum = pgEnum("priority_key", [
     "urgent", "high", "medium", "low", "none",
   ]);
   export const roleKeyEnum = pgEnum("role_key", [
     "owner", "admin", "member", "guest",
   ]);
   export const cycleStatusEnum = pgEnum("cycle_status", [
     "planned", "active", "completed",
   ]);
   export const notificationTypeEnum = pgEnum("notification_type", [
     "issue_assigned", "issue_mentioned", "issue_commented",
     "issue_status_changed", "cycle_started", "cycle_ended",
   ]);
   export const activityVerbEnum = pgEnum("activity_verb", [
     "created", "updated", "deleted", "archived", "restored",
     "assigned", "unassigned", "commented", "status_changed", "priority_changed",
   ]);
   export const auditEventEnum = pgEnum("audit_event", [
     "auth_signin", "auth_signup", "auth_signout", "auth_failed",
     "password_reset", "email_verified", "two_factor_enabled", "two_factor_disabled",
     "workspace_created", "workspace_archived", "member_added", "member_removed",
     "role_changed", "data_export_requested", "account_deleted",
   ]);
   ```

2. **Entity list** (mapped from `lib/mock/types.ts` and `PLAN.md` §6.2):

   | Table | Purpose | Key fields | Indexes (B-tree) |
   |---|---|---|---|
   | `workspaces` | Top-level tenant | `external_id` UNIQUE, `name`, `slug` UNIQUE, `owner_id` FK, `archived_at?` | `slug`, `external_id` |
   | `users` | App-side mirror of Better Auth's `auth.users` (Phase 3 populates) | `external_id` UNIQUE, `email` UNIQUE, `name`, `avatar_color`, `avatar_url?`, `status` | `email`, `external_id` |
   | `memberships` | Join: user ↔ workspace, with role | `user_id`, `workspace_id`, `role` | `(user_id, workspace_id)` UNIQUE, `(user_id)`, `(workspace_id)`, `(workspace_id, role)` |
   | `projects` | Project within a workspace | `workspace_id`, `external_id`, `key`, `name`, `lead_id?`, `archived_at?` | `(workspace_id)`, `(workspace_id, key)` UNIQUE, `(workspace_id, archived_at)`, `external_id` |
   | `project_members` | Many-to-many: project ↔ users | `project_id`, `user_id` | `(project_id, user_id)` UNIQUE, `(user_id)`, `(project_id)` |
   | `labels` | Issue labels (per-project) | `workspace_id`, `project_id`, `name`, `color` | `(workspace_id, project_id)`, `(workspace_id)`, `name` |
   | `issues` | The primary entity | `workspace_id`, `project_id`, `key`, `number`, `title`, `description`, `status`, `priority`, `assignee_ids INTEGER[]`, `label_ids INTEGER[]`, `cycle_id?`, `due_date?`, `estimate_points?`, `parent_id?`, `archived_at?`, `embedding? vector(1536)` | `(workspace_id)`, `(workspace_id, status)`, `(workspace_id, project_id)`, `(workspace_id, assignee_ids)` GIN, `(workspace_id, label_ids)` GIN, `(workspace_id, due_date)`, `(project_id, number)` UNIQUE, `key` UNIQUE, `external_id` UNIQUE, `embedding` HNSW (Phase 6 populates) |
   | `issue_assignees` | Many-to-many join for `issues.assignee_ids[]` | `issue_id`, `user_id`, `workspace_id` | `(issue_id, user_id)` UNIQUE, `(user_id, workspace_id)`, `(issue_id)`, `(workspace_id)` |
   | `cycles` | Sprints per project | `workspace_id`, `project_id`, `number`, `name`, `status`, `starts_at?`, `ends_at?` | `(workspace_id)`, `(project_id)`, `(workspace_id, project_id, status)` |
   | `cycle_issues` | Many-to-many: cycle ↔ issues | `cycle_id`, `issue_id`, `workspace_id` | `(cycle_id, issue_id)` UNIQUE, `(cycle_id)`, `(issue_id)`, `(workspace_id)` |
   | `saved_views` | User-saved filter combos | `workspace_id`, `owner_id`, `name`, `filter JSONB`, `group_by`, `sort_key`, `sort_dir`, `starred` | `(workspace_id, owner_id)`, `(workspace_id, owner_id, starred)` |
   | `comments` | Issue comments | `workspace_id`, `issue_id`, `author_id`, `body`, `created_at` | `(workspace_id, issue_id)`, `(workspace_id, issue_id, created_at DESC)` |
   | `notifications` | Inbox items | `workspace_id`, `user_id`, `type`, `issue_id?`, `read`, `snoozed_until?`, `created_at` | `(user_id, read)`, `(user_id, workspace_id, created_at DESC)`, `(workspace_id)` |
   | `activities` | Per-workspace audit trail of mutations (powers Inbox + project activity log) | `workspace_id`, `actor_id`, `verb`, `object_type`, `object_id`, `before JSONB`, `after JSONB`, `created_at` | `(workspace_id, created_at DESC)`, `(workspace_id, object_type, object_id)`, `(actor_id)` |
   | `attachments` | File metadata (file lives in Supabase Storage) | `workspace_id`, `issue_id`, `uploader_id`, `storage_path`, `mime_type`, `size_bytes`, `created_at` | `(workspace_id, issue_id)`, `(uploader_id)`, `(workspace_id)` |
   | `audit_log` | Security events (auth, GDPR, RBAC) — separate from `activities` | `actor_id?`, `actor_workspace_id?`, `event`, `ip INET?`, `user_agent?`, `metadata JSONB`, `created_at` | `(actor_id, created_at DESC)`, `(actor_workspace_id, created_at DESC)`, `(event, created_at DESC)` |

3. **Indexes that must be declared** (every list view the app shows needs one):
   - Composite indexes for inbox, my-issues, project issues, cycle board, comments stream, notifications
   - Every `(workspace_id, *)` index has `workspace_id` first — this is the multi-tenant boundary that powers RLS
   - The `(user_id, workspace_id)` index on `issue_assignees` powers "all issues assigned to me in this workspace" — a critical inbox query
   - GIN index on `issues.assignee_ids` and `issues.label_ids` (integer arrays) for "filter issues by assignee/label" — uses `@>` (contains) operator

4. **Generate the migration**:
   ```bash
   npm run db:generate
   # → apps/web/lib/db/migrations/0000_initial_schema.sql
   ```
   Review the generated SQL. Drizzle's generator is reliable but not perfect — verify enum ordering, FK actions, and index definitions.

5. **Apply to local Supabase**:
   ```bash
   supabase db reset            # drops everything, re-runs all migrations + seed.sql
   # OR
   npm run db:migrate           # applies pending migrations
   ```

6. **Generate Supabase types** for the few cases we use raw Supabase APIs (Realtime, Storage):
   ```bash
   npm run db:types
   # → apps/web/lib/supabase/database.types.ts
   ```
   This is separate from the Drizzle types — we use it only in `utils/supabase/*` and a few places where Realtime's `postgres_changes` needs the schema literal type.

7. **Verify in Supabase Studio** (http://127.0.0.1:54323) — all 16 tables visible (14 + `audit_log` + `attachments` we expanded to), all enums visible, all indexes visible.

**Files to create / edit:**
- `apps/web/lib/db/schema/*.ts` (16 files, one per table)
- `apps/web/lib/db/schema/enums.ts`
- `apps/web/lib/db/migrations/0000_*.sql` (generated)
- `apps/web/lib/supabase/database.types.ts` (generated)

**Acceptance criteria:**
- `npm run db:generate` produces a single SQL migration with all 16 tables, enums, and indexes
- `npm run db:migrate` applies it to local Supabase with no errors
- `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres` shows all tables, enums, and indexes
- Every business table has `workspace_id` and is included in the `workspace_id`-leading composite indexes
- The `_meta` table Drizzle generates is present (drizzle-kit bookkeeping)

---

### 2D — RLS policies + isolation tests *(depends on 2C; blocks 2E, 2F, 2G, 2J, Phase 3)*

**Why now:** Multi-tenancy is the property we cannot lose. RLS at the Postgres level is the **primary** boundary — defense in depth on top of Better Auth and app-side checks. Every test that proves "user A in workspace X cannot see workspace Y's data" is the safety net.

**Tasks:**

1. **Enable RLS on every business table**:
   ```sql
   -- 0001_enable_rls.sql (manually written, NOT generated)
   ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
   ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
   ALTER TABLE issue_assignees ENABLE ROW LEVEL SECURITY;
   ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE cycle_issues ENABLE ROW LEVEL SECURITY;
   ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
   ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
   ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
   ```
   We write this as a separate hand-authored migration (`0001_rls.sql`) and **never** let drizzle-kit overwrite it. The RLS file is reviewed line-by-line in every PR.

2. **Helper functions for RLS** — `0002_rls_helpers.sql`:
   ```sql
   -- The current authenticated user. Better Auth sets this in the session JWT.
   -- For local dev / tests, we set it via `SET LOCAL app.current_user_id = '...'` or by impersonating via service_role.
   CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS BIGINT
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
   AS $$
     SELECT id FROM public.users WHERE external_id = auth.jwt() ->> 'sub'
   $$;

   -- Workspaces the current user is a member of.
   CREATE OR REPLACE FUNCTION public.current_workspace_ids() RETURNS SETOF BIGINT
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
   AS $$
     SELECT workspace_id FROM public.memberships WHERE user_id = public.current_user_id()
   $$;

   -- Role of the current user in a given workspace.
   CREATE OR REPLACE FUNCTION public.current_role(workspace_id BIGINT) RETURNS TEXT
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
   AS $$
     SELECT role::TEXT FROM public.memberships
     WHERE user_id = public.current_user_id() AND workspace_id = $1
   $$;

   -- True if the current user is an owner/admin of the given workspace.
   CREATE OR REPLACE FUNCTION public.is_admin(workspace_id BIGINT) RETURNS BOOLEAN
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.memberships
       WHERE user_id = public.current_user_id()
         AND workspace_id = $1
         AND role IN ('owner', 'admin')
     )
   $$;
   ```

3. **Policy per table** — `0003_rls_policies.sql`:
   ```sql
   -- ─── workspaces ─────────────────────────────────────────────────────────
   CREATE POLICY workspace_select ON workspaces FOR SELECT
     USING (id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY workspace_insert ON workspaces FOR INSERT
     WITH CHECK (true); -- anyone can create a workspace; the owner_id is set to the current user
   CREATE POLICY workspace_update ON workspaces FOR UPDATE
     USING (public.is_admin(id))
     WITH CHECK (public.is_admin(id));
   CREATE POLICY workspace_delete ON workspaces FOR DELETE
     USING (public.is_admin(id));

   -- ─── memberships ────────────────────────────────────────────────────────
   CREATE POLICY membership_select ON memberships FOR SELECT
     USING (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY membership_insert ON memberships FOR INSERT
     WITH CHECK (public.is_admin(workspace_id) OR user_id = public.current_user_id());
     -- self-add: a user can accept an invite to a workspace they were invited to
   CREATE POLICY membership_update ON memberships FOR UPDATE
     USING (public.is_admin(workspace_id));
   CREATE POLICY membership_delete ON memberships FOR DELETE
     USING (public.is_admin(workspace_id));

   -- ─── projects ───────────────────────────────────────────────────────────
   CREATE POLICY project_select ON projects FOR SELECT
     USING (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY project_modify ON projects FOR ALL
     USING (public.is_admin(workspace_id))
     WITH CHECK (public.is_admin(workspace_id));

   -- ─── issues ─────────────────────────────────────────────────────────────
   CREATE POLICY issue_select ON issues FOR SELECT
     USING (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY issue_insert ON issues FOR INSERT
     WITH CHECK (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY issue_update ON issues FOR UPDATE
     USING (workspace_id IN (SELECT public.current_workspace_ids()))
     WITH CHECK (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY issue_delete ON issues FOR DELETE
     USING (public.is_admin(workspace_id) OR author_id = public.current_user_id());

   -- ─── comments ───────────────────────────────────────────────────────────
   CREATE POLICY comment_select ON comments FOR SELECT
     USING (workspace_id IN (SELECT public.current_workspace_ids()));
   CREATE POLICY comment_insert ON comments FOR INSERT
     WITH CHECK (
       author_id = public.current_user_id()
       AND workspace_id IN (SELECT public.current_workspace_ids())
     );
   CREATE POLICY comment_update ON comments FOR UPDATE
     USING (author_id = public.current_user_id())
     WITH CHECK (author_id = public.current_user_id());
   CREATE POLICY comment_delete ON comments FOR DELETE
     USING (author_id = public.current_user_id() OR public.is_admin(workspace_id));

   -- ─── notifications ──────────────────────────────────────────────────────
   CREATE POLICY notification_select ON notifications FOR SELECT
     USING (user_id = public.current_user_id());
   CREATE POLICY notification_update ON notifications FOR UPDATE
     USING (user_id = public.current_user_id())
     WITH CHECK (user_id = public.current_user_id());

   -- ─── activities ─────────────────────────────────────────────────────────
   CREATE POLICY activity_select ON activities FOR SELECT
     USING (workspace_id IN (SELECT public.current_workspace_ids()));

   -- ─── saved_views ────────────────────────────────────────────────────────
   CREATE POLICY saved_view_select ON saved_views FOR SELECT
     USING (
       owner_id = public.current_user_id()
       OR (filter ->> 'visibility')::TEXT = 'workspace'
     );
   CREATE POLICY saved_view_modify ON saved_views FOR ALL
     USING (owner_id = public.current_user_id())
     WITH CHECK (owner_id = public.current_user_id());

   -- ─── audit_log ──────────────────────────────────────────────────────────
   CREATE POLICY audit_log_select ON audit_log FOR SELECT
     USING (
       actor_id = public.current_user_id()
       OR public.is_admin(actor_workspace_id)
     );
   -- No INSERT/UPDATE/DELETE policies for audit_log: writes happen only via SECURITY DEFINER triggers / server-side `service_role`.

   -- ─── remaining tables: same pattern as `issues` (workspace-scoped read/write) ──
   -- (project_members, labels, issue_assignees, cycles, cycle_issues, attachments)
   ```

4. **Service role bypass** — Supabase's `service_role` JWT bypasses RLS by default. The app **never** uses the service role from client code; it's only used in:
   - Migrations
   - Server-side cron jobs (pg_cron)
   - Admin tooling (Phase 8)

5. **Storage RLS** — see 2F.

6. **Tests** — `apps/web/lib/db/_tests/rls.test.ts` using `pg` and `supabase start`'s local DB:
   - **Setup:** seed two workspaces, four users (A, B in workspace 1; C, D in workspace 2). A is owner of workspace 1, C is owner of workspace 2.
   - **Test 1: cross-workspace read denial.** As A, `SELECT * FROM issues WHERE workspace_id = <workspace-2-id>` returns 0 rows.
   - **Test 2: own-workspace read allowed.** As A, `SELECT * FROM issues WHERE workspace_id = <workspace-1-id>` returns the expected count.
   - **Test 3: cross-workspace write denial.** As A, `INSERT INTO issues (workspace_id, ...) VALUES (<workspace-2-id>, ...)` throws a `42501 insufficient_privilege`.
   - **Test 4: role enforcement.** As A's member (not owner), `DELETE FROM workspaces WHERE id = <workspace-1-id>` throws `42501`.
   - **Test 5: owner can do anything.** As A, `DELETE FROM workspaces WHERE id = <workspace-1-id>` succeeds.
   - **Test 6: notifications scoped to current user.** As A, `SELECT * FROM notifications` returns only A's notifications, never C's, even across workspaces.
   - **Test 7: audit_log read scope.** As A, `SELECT * FROM audit_log` returns only events where `actor_id = A` or `actor_workspace_id` is a workspace A is admin of.
   - **Test 8: static analysis.** Parse the SQL of all migrations; verify every business table has `ENABLE ROW LEVEL SECURITY` and at least one policy. CI fails if any business table is RLS-disabled.

7. **Helper for impersonation in tests** — `set_user(user_id)`:
   ```sql
   CREATE OR REPLACE FUNCTION public.set_user(external_id TEXT) RETURNS VOID
   LANGUAGE plpgsql
   AS $$
   DECLARE
     u_id BIGINT;
   BEGIN
     SELECT id INTO u_id FROM public.users WHERE public.users.external_id = set_user.external_id;
     IF u_id IS NULL THEN RAISE EXCEPTION 'user % not found', external_id; END IF;
     -- Set the JWT claim that the policy functions read
     PERFORM set_config('request.jwt.claims', json_build_object('sub', external_id)::TEXT, false);
   END;
   $$;
   ```
   The test suite sets `request.jwt.claims` via `SET LOCAL` per transaction, simulating the Better Auth session.

**Files to create / edit:**
- `supabase/migrations/0001_rls.sql` (new, hand-written)
- `supabase/migrations/0002_rls_helpers.sql` (new, hand-written)
- `supabase/migrations/0003_rls_policies.sql` (new, hand-written)
- `apps/web/lib/db/_tests/rls.test.ts` (new, Vitest)
- `apps/web/lib/db/_tests/setup.ts` (new, seed helper for tests)
- `apps/web/vitest.config.ts` (new, picks up `db/_tests/**`)

**Acceptance criteria:**
- All 8 RLS tests pass (`npm run db:test`)
- The static-analysis test fails when a new table is added without RLS
- `psql` as a regular user (not service_role) cannot read another workspace's data
- `psql` as the service_role CAN read all workspaces (proves the bypass works)
- The RLS file is reviewed line-by-line in the migration PR (manual gate)

---

### 2E — DB functions & triggers *(depends on 2C; blocks 2J)*

**Why now:** Triggers enforce invariants at the DB level — the last line of defense. They also free the app from doing repetitive work (writing activity log rows, updating `updated_at`, computing `key` from `number`).

**Tasks:**

1. **`updated_at` trigger** — `0004_updated_at_trigger.sql`:
   ```sql
   CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
   LANGUAGE plpgsql AS $$
   BEGIN
     NEW.updated_at := now();
     RETURN NEW;
   END;
   $$;

   CREATE TRIGGER set_updated_at_workspaces BEFORE UPDATE ON workspaces
     FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
   -- repeat for users, memberships, projects, labels, issues, cycles, comments, notifications, saved_views
   ```

2. **Issue numbering** — `0005_issue_numbering.sql`:
   - Every project has a `next_issue_number` counter; new issues pull from it.
   - `issues.key` is computed as `UPPER(projects.key) || '-' || LPAD(issues.number::TEXT, 4, '0')`.
   - Function `tg_assign_issue_number()` sets `number` and `key` from the project's counter, increments the counter.
   - The counter itself is a row on `projects`: `next_issue_number INTEGER NOT NULL DEFAULT 1`.

3. **Activity log emission** — `0006_activity_log_triggers.sql`:
   - After INSERT/UPDATE/DELETE on `issues`, `comments`, `memberships`, `projects`, `cycles`, `labels`, `saved_views`, insert a row into `activities` with the actor (from `public.current_user_id()`), verb (`created` / `updated` / `deleted`), object type, object id, and JSON `before`/`after`.
   - For updates, only insert an activity row if the `updated_at` actually changed (or some other meaningful field) — to avoid noise from `last_seen_at` style triggers.
   - Function `tg_emit_activity()` is generic, takes the table name as a parameter; the trigger is added per table.
   - Activities are NEVER soft-deleted; they are immutable. The trigger does not allow UPDATE/DELETE on `activities` (enforced via RLS in 2D).

4. **User mirror sync** — `0007_user_mirror_sync.sql`:
   - Better Auth's `auth.users` table is the source of truth for user identity.
   - A trigger on `auth.users` AFTER INSERT/UPDATE writes a mirror row to `public.users` with `external_id = auth.users.id::TEXT`, `email = auth.users.email`, `name = auth.users.name`.
   - This means the app queries `public.users` (a Drizzle-managed table) and never touches `auth.users` directly.
   - Phase 3 wires this trigger; for Phase 2 we create the function and a stub trigger on a placeholder.

5. **Workspace creation defaults** — `0008_workspace_defaults.sql`:
   - When a workspace is created, also create the demo statuses (backlog/todo/in_progress/in_review/done/cancelled) as a per-workspace `workflow_statuses` table (Phase 4 populates; for Phase 2 the table is empty).
   - The demo seed (2J) inserts the default statuses for the demo workspace.

6. **Search vector** — `0009_tsvector.sql`:
   - Add a `search_vector TSVECTOR` generated column to `issues` (`title || ' ' || description || ' ' || key`).
   - GIN index on `search_vector`.
   - Phase 6 adds the embedding column; for Phase 2 we have the lexical half of the hybrid search.

**Files to create / edit:**
- `supabase/migrations/0004_updated_at_trigger.sql` (new)
- `supabase/migrations/0005_issue_numbering.sql` (new)
- `supabase/migrations/0006_activity_log_triggers.sql` (new)
- `supabase/migrations/0007_user_mirror_sync.sql` (new)
- `supabase/migrations/0008_workspace_defaults.sql` (new)
- `supabase/migrations/0009_tsvector.sql` (new)

**Acceptance criteria:**
- `npm run db:reset` applies all 9 migrations cleanly
- Inserting an issue with `number=NULL` causes the trigger to assign the next number from the project counter
- Updating a `comments.body` row inserts a corresponding `activities` row
- `psql` confirms `issues.search_vector` is populated and the GIN index exists
- All triggers are listed in `pg_trigger` with the expected names

---

### 2F — Storage buckets + RLS *(depends on 2C; blocks 2J, Phase 4)*

**Why now:** Avatars and attachments need a place to live. Storage is S3-compatible, integrated with the same Postgres RLS. Phase 4 wires uploads; Phase 2 just stands up the buckets with the right policies.

**Tasks:**

1. **Buckets** — `0010_storage_buckets.sql`:
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES
     ('avatars',    'avatars',    true,  2097152,    ARRAY['image/png','image/jpeg','image/webp','image/gif']),
     ('attachments','attachments',false, 52428800,   NULL),  -- 50 MB, any type
     ('exports',    'exports',    false, 104857600,  NULL)   -- 100 MB, CSV/JSON exports
   ON CONFLICT (id) DO NOTHING;
   ```
   - `avatars` is public-readable (so we can render `<img src=...>` directly), but uploads are RLS-gated.
   - `attachments` and `exports` are private; access via signed URLs only.

2. **Storage RLS** — `0011_storage_rls.sql`:
   ```sql
   -- Avatars: anyone can read, only the current user can write their own folder
   CREATE POLICY "avatar_read" ON storage.objects FOR SELECT
     USING (bucket_id = 'avatars');
   CREATE POLICY "avatar_write" ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'avatars'
       AND (storage.foldername(name))[1] = public.current_user_id()::TEXT
     );
   CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE
     USING (
       bucket_id = 'avatars'
       AND (storage.foldername(name))[1] = public.current_user_id()::TEXT
     );

   -- Attachments: only members of the issue's workspace can read; only the uploader can write
   CREATE POLICY "attachment_read" ON storage.objects FOR SELECT
     USING (
       bucket_id = 'attachments'
       AND (storage.foldername(name))[1]::BIGINT IN (SELECT public.current_workspace_ids())
     );
   CREATE POLICY "attachment_write" ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'attachments'
       AND (storage.foldername(name))[1]::BIGINT IN (SELECT public.current_workspace_ids())
       AND owner = auth.uid()::TEXT
     );
   CREATE POLICY "attachment_delete" ON storage.objects FOR DELETE
     USING (
       bucket_id = 'attachments'
       AND owner = auth.uid()::TEXT
     );

   -- Exports: only the requester can read their own export
   CREATE POLICY "export_read" ON storage.objects FOR SELECT
     USING (
       bucket_id = 'exports'
       AND owner = auth.uid()::TEXT
     );
   CREATE POLICY "export_write" ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'exports'
       AND owner = auth.uid()::TEXT
     );
   ```
   - `storage.objects` is Supabase's bookkeeping table; we don't create it.
   - `storage.foldername(name)` parses the path: `workspace_id/issue_id/uuid.ext`.

3. **Path conventions** (enforced by the app, not the DB):
   - `avatars/{user_external_id}/{filename}`
   - `attachments/{workspace_id}/{issue_id}/{uuid}.{ext}`
   - `exports/{user_external_id}/{workspace_id}/{export_id}.csv`

**Files to create / edit:**
- `supabase/migrations/0010_storage_buckets.sql` (new)
- `supabase/migrations/0011_storage_rls.sql` (new)

**Acceptance criteria:**
- `supabase status` lists the 3 buckets
- `psql` as a regular user in workspace X can read attachments in `attachments/X/*` but not `attachments/Y/*`
- `psql` as a regular user CANNOT write to `attachments/Y/*` (cross-workspace denial)
- `psql` as a regular user can write to `avatars/{their_user_id}/*` but not `avatars/{other_user_id}/*`

---

### 2G — Realtime publication *(depends on 2C; blocks Phase 4 realtime subscriptions)*

**Why now:** The app's live updates (drawer, list, inbox) all flow through Supabase Realtime. The publication must be set up before Phase 4 wires subscriptions.

**Tasks:**

1. **Publication** — `0012_realtime_publication.sql`:
   ```sql
   -- Create a single publication; Supabase Realtime subscribes to this.
   -- We include only the tables the app needs to live-update (avoid noise on `audit_log`, `activities`).
   ALTER PUBLICATION supabase_realtime ADD TABLE
     issues,
     comments,
     notifications,
     saved_views,
     memberships,
     project_members;
   ```
   - `activities` and `audit_log` are NOT in the publication (writes are app-internal; clients query them on demand).
   - Phase 5 may add `issue_assignees` and `cycle_issues` for live assignee/cycle updates.

2. **Replica identity** — `0013_replica_identity.sql`:
   ```sql
   -- Realtime's `postgres_changes` needs the old row on UPDATE/DELETE. Default is `DEFAULT` (PK only).
   -- For tables where we want the full old row in `OLD` records, set to `FULL`.
   ALTER TABLE issues REPLICA IDENTITY FULL;
   ALTER TABLE comments REPLICA IDENTITY FULL;
   ALTER TABLE notifications REPLICA IDENTITY FULL;
   ALTER TABLE memberships REPLICA IDENTITY FULL;
   ALTER TABLE project_members REPLICA IDENTITY FULL;
   ALTER TABLE saved_views REPLICA IDENTITY FULL;
   ```
   `FULL` is more storage on the WAL but is required for `OLD` records that include all columns (the RLS policies in 2D read the old row to decide if the client is allowed to see the change).

3. **Channel authorization** — the app uses the user's JWT to subscribe; Realtime's authorization function runs the same RLS policies. No additional config needed.

**Files to create / edit:**
- `supabase/migrations/0012_realtime_publication.sql` (new)
- `supabase/migrations/0013_replica_identity.sql` (new)

**Acceptance criteria:**
- `psql` shows the publication `supabase_realtime` with the 6 tables
- `psql` shows the 6 tables with `relreplident = 'f'` (FULL)
- A smoke-test browser page can subscribe to `issues` and see a row change within 1s

---

### 2H — pgvector setup *(depends on 2C; blocks Phase 6)*

**Why now:** The `embedding` column is on `issues` already (2C). Phase 6 populates it; Phase 2 stands up the extension and the index scaffolding.

**Tasks:**

1. **Extension** — `0014_pgvector.sql`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **HNSW index** (created in a separate migration so we can recreate it without re-issuing the embedding column):
   ```sql
   -- 0015_issues_embedding_index.sql
   -- HNSW is faster to build and query than IVFFlat; Supabase recommends it.
   CREATE INDEX issues_embedding_hnsw ON issues
     USING hnsw (embedding vector_cosine_ops)
     WITH (m = 16, ef_construction = 64);
   ```
   Parameters: `m=16` (default), `ef_construction=64` (build-time recall). Query-time `ef_search` is set per-query by Drizzle.

3. **Embedding column** — already added in 2C schema as `embedding vector(1536)`. The dimension matches OpenAI's `text-embedding-3-small` (1536). If we use a different model, the column type changes here and a migration is generated.

**Files to create / edit:**
- `supabase/migrations/0014_pgvector.sql` (new)
- `supabase/migrations/0015_issues_embedding_index.sql` (new)

**Acceptance criteria:**
- `CREATE EXTENSION vector` succeeds on local Supabase
- `\d issues` shows the `embedding` column with type `vector(1536)`
- `pg_indexes` lists `issues_embedding_hnsw` with method `hnsw`

---

### 2I — pg_cron + scheduled jobs *(depends on 2C; blocks 2N)*

**Why now:** pg_cron runs inside the database — no separate cron infrastructure. The jobs are simple and idempotent; they're safe to leave running from Phase 2.

**Tasks:**

1. **Extension** — `0016_pg_cron.sql`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Jobs** — `0017_cron_jobs.sql`:
   ```sql
   -- 1. Hard-delete soft-deleted accounts after 30 days (GDPR)
   -- Runs daily at 03:00 UTC. Calls a SECURITY DEFINER function that hard-deletes
   -- user rows (and cascades) where deleted_at < now() - INTERVAL '30 days'.
   SELECT cron.schedule(
     'gdpr-hard-delete',
     '0 3 * * *',
     $$SELECT public.tg_gdpr_hard_delete();$$
   );

   -- 2. Refresh stale embeddings (Phase 6 will populate; Phase 2 just schedules the no-op)
   -- Runs every 6 hours. Re-embeds issues whose updated_at is newer than the last embed.
   SELECT cron.schedule(
     'embedding-refresh',
     '0 */6 * * *',
     $$SELECT public.tg_embedding_refresh();$$
   );

   -- 3. Cleanup orphaned attachments (file in storage but no row in attachments table)
   -- Runs weekly on Sunday at 04:00 UTC.
   SELECT cron.schedule(
     'orphan-attachment-cleanup',
     '0 4 * * 0',
     $$SELECT public.tg_orphan_attachment_cleanup();$$
   );

   -- 4. Vacuum analyze issues table nightly (Supabase does this automatically, but be explicit)
   SELECT cron.schedule(
     'issues-vacuum',
     '0 2 * * *',
     $$VACUUM ANALYZE issues;$$
   );
   ```
   The function bodies are stubs in Phase 2 (no-op `RETURN`); Phase 4 (mutations), Phase 6 (AI), and Phase 7 (storage cleanup) implement them in their respective phases.

3. **Verify**:
   ```sql
   SELECT * FROM cron.job;
   ```
   Lists all 4 jobs with their schedules.

**Files to create / edit:**
- `supabase/migrations/0016_pg_cron.sql` (new)
- `supabase/migrations/0017_cron_jobs.sql` (new)

**Acceptance criteria:**
- `pg_extension` lists both `vector` and `pg_cron`
- `cron.job` lists 4 jobs with the correct schedules
- `cron.job_run_details` records no runs yet (jobs haven't fired)

---

### 2J — Idempotent seed *(depends on 2C, 2E, 2F)*

**Why now:** The seed is the source of truth for "what does the demo workspace look like" — every new contributor runs it and gets the same starting state. It exercises the triggers from 2E and the RLS from 2D.

**Tasks:**

1. **`apps/web/lib/db/seed.ts`** — a Drizzle script that:
   - Uses `DATABASE_URL` (the pooled URL) — fine for writes since the seed is one-shot
   - Wraps the whole seed in a transaction
   - Checks for existing rows via `external_id` UNIQUE constraints; skips on second run

2. **Seed order** (preserves the demo dataset):
   1. Create the demo workspace (`external_id: "w_acme"`, `slug: "acme"`)
   2. Create the 12 demo users (`external_id: "u_aria"`, etc.) — `u_aria` is the demo identity, becomes a real auth user in Phase 3
   3. Create the membership `("u_aria", "w_acme", "owner")` and 11 other memberships
   4. Create the 4 projects with `lead` and `project_members`
   5. Create the 10 labels (per-project)
   6. Create the 3 cycles
   7. Create the 30 issues (uses the issue-numbering trigger from 2E)
   8. Create the 8 comments
   9. Create the 10 inbox items
   10. Create the 5 seed activities

3. **Map mock fields → DB fields** (preserved from the Convex version):
   - `i_1001` → `external_id: "i_1001"`, `id: <auto>`
   - `assignee_ids: ["u_aria", "u_kenji"]` → write 2 `issue_assignees` rows + mirror to `issues.assignee_ids INTEGER[]`
   - `created_at: "2026-05-22T09:14:00Z"` → `new Date(iso)` (Drizzle handles the conversion)
   - `ME_ID` constant stays as `"u_aria"` for Phase 2; Phase 3 replaces it with `useSession().user.externalId`

4. **`ME_ID` placeholder strategy:**
   - Keep the constant in `apps/web/lib/mock/users.ts` for now
   - Add a one-line re-export from `apps/web/lib/auth/demo-session.ts` that says "this is a placeholder for Better Auth; will be removed in Phase 3"
   - When Phase 3 lands, we delete the constant and use `useSession().user.externalId`

5. **Idempotency** — every insert is preceded by a `SELECT ... WHERE external_id = ...`; if found, skip. `INSERT ... ON CONFLICT (external_id) DO NOTHING` is used where natural (most tables).

6. **Command in root `package.json`** — `db:seed` (added in 2A).

7. **Verify with Supabase Studio** (http://127.0.0.1:54323) — the seed run is visible in the "Table Editor"; row counts match the mock (30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items).

**Files to create / edit:**
- `apps/web/lib/db/seed.ts` (new)
- `apps/web/lib/auth/demo-session.ts` (new) — placeholder for `ME_ID`
- `apps/web/lib/mock/users.ts` (edit) — re-export `ME_ID` from demo-session
- `apps/web/lib/mock/index.ts` (edit) — `// TODO Phase 4: remove this re-export; keep as fixture`

**Acceptance criteria:**
- `npm run db:seed` against a fresh `db:reset` creates the demo workspace with 30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items
- Running the same command again produces zero new rows (idempotent)
- Supabase Studio "Table Editor" shows the seeded rows
- `SELECT count(*) FROM activities` returns ≥ 5 (the trigger from 2E emitted them)
- `SELECT key, number FROM issues ORDER BY number` shows `ENG-0001` through `ENG-NNNN` (the issue-numbering trigger worked)
- `SELECT key FROM issues WHERE embedding IS NULL` returns 30 (Phase 6 populates)

---

### 2K — Local dev DX + .env.example *(parallel after 2A; final wiring in 2M)*

**Why now:** The first contributor onboarding story matters more than people think. "How do I get a working dev environment?" should be one command: `npm i && npm run dev`.

**Tasks:**

1. **`.env.example`** at the repo root (and a copy in `apps/web/`) with every variable the app needs (already drafted in 2A; this stream is the final wiring and review).

2. **`README.md`** — "First-time setup" section:
   ```bash
   # 1. Clone + install
   git clone <repo>
   cd rejira
   npm install

   # 2. Start local Supabase (Postgres + Realtime + Storage + Studio)
   npm run db:start
   # → Studio at http://127.0.0.1:54323
   # → Inbucket (emails) at http://127.0.0.1:54324

   # 3. Apply migrations + seed
   npm run db:reset
   # OR
   npm run db:migrate && npm run db:seed

   # 4. Start the app
   npm run dev
   # → Next dev on :3000, connected to local Supabase
   ```

3. **One-command bootstrap** — `npm run bootstrap`:
   ```bash
   supabase start
   sleep 5
   supabase db reset
   npm --prefix apps/web run dev
   ```
   Catches the case where the user just wants the demo running.

4. **First-run sanity check** — `apps/web/app/api/health/route.ts` (Phase 4) returns `{ db: "ok", realtime: "ok", storage: "ok" }`. For Phase 2, `apps/web/app/api/db-check/route.ts` runs `SELECT 1` and returns `200 OK` (or `503` with the error).

**Files to create / edit:**
- `.env.example` (new, root — finalized from 2A)
- `apps/web/.env.example` (new, copy)
- `README.md` (edit — "First-time setup" section)
- `package.json` (root) — add `bootstrap` script
- `apps/web/app/api/db-check/route.ts` (new) — smoke test

**Acceptance criteria:**
- A new contributor can clone, run `npm install && npm run bootstrap`, and have a working dev environment with seeded data
- `/api/db-check` returns 200 OK

---

### 2L — Migration workflow (dev/staging/prod) *(parallel after 2A; final wiring in 2M)*

**Why now:** Drizzle generates SQL; Supabase CLI applies it. The chain must work in dev, CI, preview, and prod without divergence.

**Tasks:**

1. **Two migration sources, one apply path**:
   - **Drizzle-generated** (`apps/web/lib/db/migrations/*.sql`) — app schema (16 tables) + Drizzle's `_meta` table. These are the source of truth.
   - **Hand-authored** (`supabase/migrations/*.sql`) — RLS, triggers, functions, storage, realtime, pgvector, pg_cron, seed data. These are peer-reviewed line-by-line.

2. **At build time**:
   ```bash
   # In CI / release:
   npm run db:generate          # if app schema changed
   cp apps/web/lib/db/migrations/*.sql supabase/migrations/
   # Or use a tool to diff: drizzle-kit's `migrate` will fail if supabase/migrations/ is out of sync.
   ```

3. **The recommended flow** (replacing the old Convex dev/deploy):
   - **Dev local:** `supabase db reset` (drops + re-applies all migrations from `supabase/migrations/`).
   - **Feature work:** create a new Drizzle migration, then copy the generated SQL into `supabase/migrations/` and commit. PR is reviewed.
   - **Preview deploys (PRs):** Supabase Branching auto-creates a preview DB from `main` and applies pending migrations. The Next.js preview deploy points at it.
   - **Staging deploy:** `supabase db push` to the staging project (applies pending migrations). The staging app redeploys.
   - **Prod deploy:** `supabase db push` to the production project. The prod app redeploys after a green smoke test.

4. **`package.json` scripts** (finalized):
   ```json
   {
     "db:diff": "supabase db diff",                    // generate SQL for drift
     "db:push:staging": "supabase db push --project-ref <staging-ref>",
     "db:push:prod": "supabase db push --project-ref <prod-ref>",
     "db:branch:create": "supabase branches create <branch-name>",
     "db:branch:delete": "supabase branches delete <branch-name>",
     "db:branch:list": "supabase branches list"
   }
   ```

5. **Drift detection in CI**:
   ```yaml
   - name: Detect DB drift
     run: |
       supabase db diff --schema public,auth_app --use-migra > /tmp/drift.sql
       if [ -s /tmp/drift.sql ]; then
         echo "::error::Database drift detected. Run 'npm run db:generate' and commit the result."
         cat /tmp/drift.sql
         exit 1
       fi
   ```

**Files to create / edit:**
- `package.json` (root) — `db:*` scripts
- `.github/workflows/ci.yml` (finalized in 2M) — drift detection

**Acceptance criteria:**
- `npm run db:diff` against a clean local DB shows no drift
- `supabase db push --project-ref <staging-ref>` from CI applies pending migrations without error
- A PR with a schema change generates a new `supabase/migrations/00NN_*.sql` that the reviewer sees
- Drift detection in CI fails on a manual `ALTER TABLE` done via Studio

---

### 2M — CI gates *(depends on 2C, 2D, 2J)*

**Why now:** CI is the safety net that prevents a broken schema or a missed RLS policy from reaching prod. Every gate here corresponds to a real failure mode that has bitten a team before.

**Tasks:**

1. **`.github/workflows/ci.yml`** — final wiring:
   ```yaml
   name: CI
   on: [pull_request, push]
   jobs:
     typecheck:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm run typecheck
         - run: npm run lint

     db-lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: supabase/setup-cli@v1
           with: { version: latest }
         - name: Start Supabase
           run: supabase start
         - name: Apply migrations
           run: supabase db reset --no-seed
         - name: Run supabase db lint
           run: supabase db lint
         - name: Detect DB drift
           run: |
             supabase db diff > /tmp/drift.sql
             if [ -s /tmp/drift.sql ]; then
               echo "::error::Drift detected"; cat /tmp/drift.sql; exit 1
             fi

     db-test:
       runs-on: ubuntu-latest
       services:
         postgres:  # not used; Supabase spins its own
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - uses: supabase/setup-cli@v1
           with: { version: latest }
         - run: npm ci
         - run: supabase start
         - run: supabase db reset
         - run: npm run db:seed
         - run: npm run db:test

     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm run build
   ```

2. **Required status checks** (set in GitHub branch protection):
   - `typecheck`
   - `db-lint` (catches schema drift, missing RLS)
   - `db-test` (catches RLS regressions)
   - `build`

3. **Supabase Branching** — Pro plan; auto-creates a preview DB on every PR. Configure in Supabase Dashboard → Settings → Integrations → GitHub.

**Files to create / edit:**
- `.github/workflows/ci.yml` (new)

**Acceptance criteria:**
- Every PR runs typecheck + lint + db-lint + db-test + build
- A schema change in a PR auto-creates a Supabase preview DB
- A `git push` to `main` with a new migration auto-applies it to the dev project (via GitHub Action in deploy.yml, Phase 8)

---

### 2N — Backups + PITR + restore drill *(depends on 2A)*

**Why now:** The first time you need a backup is the day you don't have one. PITR is on by default in Supabase Pro; the restore drill is a quarterly exercise.

**Tasks:**

1. **PITR configuration** — Supabase Pro includes 7 days of PITR by default; the team can extend to 28 days. Verify in Dashboard → Settings → Database → Point in Time Recovery.

2. **Daily logical backups** (belt + suspenders) — `0020_daily_backup_cron.sql`:
   ```sql
   -- Use Supabase's built-in pg_dump integration (a separate workflow) OR schedule
   -- a pg_dump via a Supabase Edge Function. For Phase 2 we document the runbook
   -- and rely on PITR. This migration is a placeholder.
   ```

3. **Restore drill (manual, quarterly)** — `docs/runbooks/restore-drill.md`:
   - Spin up a new Supabase project (`rejira-restore-drill`)
   - `supabase db push` against it
   - `supabase db restore --project-ref <new-ref> --timestamp <30-min-ago>` (uses PITR)
   - Verify row counts: `npm run db:test` (the RLS tests use the data shape, so they catch structural drift)
   - Verify the seed: `npm run db:seed -- --target=<new-ref>` (a future option)
   - Document the time-to-restore; target < 1 hour
   - Tear down the drill project

4. **`docs/runbooks/db-failover.md`** — what to do if Supabase has a regional outage:
   - Promote a read replica (if used)
   - Fail over to a backup region (documented in Phase 8)
   - Customer comms template

**Files to create / edit:**
- `supabase/migrations/0020_daily_backup_cron.sql` (new, placeholder)
- `docs/runbooks/restore-drill.md` (new)
- `docs/runbooks/db-failover.md` (new)

**Acceptance criteria:**
- Dashboard shows PITR enabled with at least 7 days
- `docs/runbooks/restore-drill.md` is reviewed by the team and a drill is scheduled
- `cron.job` lists the (placeholder) daily backup job
- The CI `db-test` job provides a smoke test for restore (run it against a fresh DB)

---

## Cross-cutting concerns

- **Animations:** none. This phase has no UI.
- **Accessibility:** none. This phase has no UI.
- **Performance:** Postgres on Supabase with proper indexes is sub-10ms for our scale (30 issues, 4 projects). Drizzle prepared statements are reused; no cache layer needed in Phase 2. Phase 5 adds Redis caching for hot reads.
- **Type safety:** every schema field has a Drizzle type. The inferred `typeof workspaces.$inferSelect` is the source of truth. No `any` except for the `filter JSONB` field on `saved_views` (Phase 4 re-types it).
- **Persistence boundary:** `lib/mock/` becomes a fixture file (read by the seed). The runtime data lives in Supabase. In Phase 2 the UI still reads from `lib/mock/`; in Phase 4 it switches to Drizzle.
- **Multi-tenancy boundary:** every business table has `workspace_id`. RLS policies enforce isolation at the DB level. `public.current_workspace_ids()` is the canonical "what workspaces can I see" function. Tests prove the boundary is enforced.
- **Migrations are not auto-generated for RLS** — Drizzle's generator does not understand RLS, triggers, functions, or storage. Those are hand-authored `supabase/migrations/*.sql` files, peer-reviewed line-by-line.
- **Generated code:** `apps/web/lib/supabase/database.types.ts` is committed (regenerated by `npm run db:types` after every migration). Drizzle types are inferred; no generated files outside the migration directory.
- **Phase 3 forward-compat:** the `users` table is ready to mirror Better Auth's `auth.users` (the trigger is in 2E). The `memberships.role` matches Better Auth's organization plugin's role enum. The `requireWorkspace` RLS function reads from `auth.jwt() ->> 'sub'` — Phase 3 just needs to issue JWTs with the right `sub`.

---

## File-level change summary

| File | Status | Stream |
|---|---|---|
| `supabase/config.toml` | new (from `supabase init`) | 2A |
| `supabase/migrations/0000_initial_schema.sql` | new (Drizzle-generated) | 2C |
| `supabase/migrations/0001_rls.sql` | new (hand-written) | 2D |
| `supabase/migrations/0002_rls_helpers.sql` | new (hand-written) | 2D |
| `supabase/migrations/0003_rls_policies.sql` | new (hand-written) | 2D |
| `supabase/migrations/0004_updated_at_trigger.sql` | new (hand-written) | 2E |
| `supabase/migrations/0005_issue_numbering.sql` | new (hand-written) | 2E |
| `supabase/migrations/0006_activity_log_triggers.sql` | new (hand-written) | 2E |
| `supabase/migrations/0007_user_mirror_sync.sql` | new (hand-written) | 2E |
| `supabase/migrations/0008_workspace_defaults.sql` | new (hand-written) | 2E |
| `supabase/migrations/0009_tsvector.sql` | new (hand-written) | 2E |
| `supabase/migrations/0010_storage_buckets.sql` | new (hand-written) | 2F |
| `supabase/migrations/0011_storage_rls.sql` | new (hand-written) | 2F |
| `supabase/migrations/0012_realtime_publication.sql` | new (hand-written) | 2G |
| `supabase/migrations/0013_replica_identity.sql` | new (hand-written) | 2G |
| `supabase/migrations/0014_pgvector.sql` | new (hand-written) | 2H |
| `supabase/migrations/0015_issues_embedding_index.sql` | new (hand-written) | 2H |
| `supabase/migrations/0016_pg_cron.sql` | new (hand-written) | 2I |
| `supabase/migrations/0017_cron_jobs.sql` | new (hand-written) | 2I |
| `supabase/migrations/0020_daily_backup_cron.sql` | new (hand-written, placeholder) | 2N |
| `drizzle.config.ts` | new | 2B |
| `apps/web/lib/db/client.ts` | new | 2B |
| `apps/web/lib/db/schema/*.ts` | new (16 files) | 2C |
| `apps/web/lib/db/seed.ts` | new | 2J |
| `apps/web/lib/db/_tests/rls.test.ts` | new | 2D |
| `apps/web/lib/db/_tests/setup.ts` | new | 2D |
| `apps/web/vitest.config.ts` | new | 2D |
| `apps/web/lib/auth/demo-session.ts` | new (Phase 2 placeholder) | 2J |
| `apps/web/lib/mock/users.ts` | edit (re-export `ME_ID` from demo-session) | 2J |
| `apps/web/lib/mock/index.ts` | edit (mark as fixtures-only) | 2J |
| `apps/web/lib/supabase/database.types.ts` | new (generated) | 2C |
| `apps/web/app/api/db-check/route.ts` | new | 2K |
| `.env.example` | new (root + apps/web) | 2A, 2K |
| `.gitignore` | edit (Supabase entries) | 2A |
| `package.json` (root) | extend (db:* scripts + bootstrap) | 2A, 2K, 2L |
| `README.md` | edit (first-time setup, Supabase section) | 2K |
| `.github/workflows/ci.yml` | new | 2M |
| `docs/runbooks/restore-drill.md` | new | 2N |
| `docs/runbooks/db-failover.md` | new | 2N |

**Net new files: 47. Net edited files: 5. Net new dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `tsx`, `vitest`, `concurrently` (devDeps), `@supabase/ssr`, `@supabase/supabase-js` (runtime, already there).**

---

## Execution order (recommended)

1. **2A Supabase project + local dev + env** — install CLI, init local stack, create remote project, set env vars. (1–2 hours, gated on Supabase account access.)
2. **2B Drizzle setup** — `drizzle.config.ts`, `client.ts`, empty schema barrel. Verify `db:generate` + `db:migrate` work. (Half-day.)
3. **2C App schema** — 16 Drizzle table files, enums, indexes; `db:generate`; apply via `db:migrate`; verify in Studio. (1–2 days.)
4. **2D RLS policies + isolation tests** — write the 3 hand-authored SQL files; write the 8 RLS tests; verify each fails when the boundary is violated. (1–2 days.)
5. **2E DB functions & triggers** — 6 hand-authored SQL files; verify each trigger fires correctly. (Half-day to one day.)
6. **2F Storage buckets + RLS** — 2 SQL files; verify cross-workspace denial. (Half-day.)
7. **2G Realtime publication** — 2 SQL files; smoke test. (Half-day.)
8. **2H pgvector setup** — 2 SQL files. (Half-day.)
9. **2I pg_cron + jobs** — 2 SQL files. (Half-day.)
10. **2J Idempotent seed** — write `seed.ts`, run, verify counts, run again, verify idempotency. (1 day.)
11. **2K Local dev DX + .env.example + README** — can start in parallel with 2C onward; final wiring lands at the end. (Half-day.)
12. **2L Migration workflow** — final scripts + runbook. (Half-day.)
13. **2M CI gates** — final `.github/workflows/ci.yml`, branch protection rules. (Half-day.)
14. **2N Backups + PITR + restore drill** — verify PITR, write runbooks, schedule first drill. (Half-day.)

Rough total: **5–7 working days** for a single executor; **3–4 days** with a pair.

---

## Definition of done (Phase 2 exit criteria)

- [ ] `supabase start` runs locally; Studio shows a non-empty DB with the seeded data
- [ ] Remote Supabase project exists; `supabase link` succeeds; migrations applied
- [ ] Drizzle config + client + 16 schema files + 17 hand-authored migrations all committed
- [ ] Every business table has RLS enabled; 8 RLS tests pass
- [ ] Drift detection in CI passes (`db:diff` shows no drift)
- [ ] `npm run db:seed` populates the demo workspace with 30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items
- [ ] Re-running `npm run db:seed` is idempotent (zero new rows on second run)
- [ ] All triggers fire correctly (issue numbering, activity emission, updated_at)
- [ ] Storage buckets exist; cross-workspace RLS denial proven
- [ ] Realtime publication includes the 6 hot tables; replica identity is FULL
- [ ] pgvector extension enabled; HNSW index on `issues.embedding`
- [ ] pg_cron enabled; 4 jobs scheduled
- [ ] `npm run typecheck` clean, `npm run lint` clean, `npm run build` clean, `npm run db:test` clean
- [ ] `.env.example` committed with every variable the app needs through Phase 8
- [ ] `README.md` has a "First-time setup" section that works for a new contributor
- [ ] CI: typecheck, lint, db-lint, db-test, build all pass on a sample PR
- [ ] `ME_ID` constant is still `"u_aria"`, now sourced from `apps/web/lib/auth/demo-session.ts` (Phase 3 removes the file)
- [ ] PITR enabled with at least 7 days retention; restore-drill runbook committed and scheduled
- [ ] No UI changes; the app still reads from `lib/mock/` for runtime data (Phase 4 swaps this)

---

## Phase 3 — what's next

Phase 3 lands Better Auth + the Supabase adapter. The `users` mirror table is ready (2E's trigger populates it on `auth.users` insert). The `memberships` table is ready (Better Auth's `organization` plugin's `member` table maps to it; the trigger keeps them in sync). The `audit_log` table is ready for every auth event. The RLS functions read from `auth.jwt() ->> 'sub'`, which Better Auth sets when issuing session JWTs. The `ME_ID` placeholder is removed; the UI starts reading from `useSession().user`. `demo-session.ts` is deleted.

No schema changes are required to land Phase 3. That's the test of a good data foundation: it anticipates the next phase without coupling to it.
