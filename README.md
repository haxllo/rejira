# rejira

A Linear-grade redesign of Jira. Built on **Next.js 16 + React 19 + Better Auth +
Drizzle + Supabase Postgres** with the **animate-ui** component library and
**Motion** for spring-only animation.

This repository is the work in progress of an incremental rewrite. See
[`PLAN.md`](./PLAN.md) for the full 9-phase plan,
[`PHASE_2_PLAN.md`](./PHASE_2_PLAN.md) for the data layer (Supabase + Drizzle,
currently being landed), and
[`PHASE_3_PLAN.md`](./PHASE_3_PLAN.md) for the auth layer (Better Auth).

---

## First-time setup

### Prerequisites
- Node.js 22+
- npm 10+
- Docker Desktop (for Supabase CLI local stack)
- Supabase CLI (`npm install -g supabase`)

### One-command bootstrap
```bash
git clone <repo-url> && cd jira-redesign
npm install
npm run bootstrap    # starts Supabase, applies migrations, seeds, starts dev server
```

### URLs after bootstrap
| Service | URL |
|---------|-----|
| Next.js dev server | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Inbucket (emails) | http://127.0.0.1:54324 |
| Postgres (local) | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### Manual alternative
```bash
npm run db:start          # start Supabase
npm run db:reset          # apply migrations + seed
npm --prefix apps/web run dev  # start Next.js
```

### Environment variables
Copy `.env.example` to `.env.local` (gitignored) and fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key
- `DATABASE_URL` — transaction pooler (port 6543)
- `DIRECT_URL` — direct connection (port 5432)

### Verifying it works
1. Visit http://localhost:3000 — the app should load
2. Visit http://127.0.0.1:54323 — Studio should show seeded tables
3. Run `curl http://localhost:3000/api/db-check` — returns `{"ok":true}`

---

## Stack

| Concern | Tool | Where to look |
|---|---|---|
| App framework | **Next.js 16** (App Router, RSC) | `apps/web/` |
| UI | **React 19 + Tailwind v4.3 + Motion 12 + Animate UI** | `apps/web/components/` |
| Database | **PostgreSQL via Supabase** | `supabase/` + `apps/web/lib/db/` |
| ORM | **Drizzle** | `apps/web/lib/db/schema/` |
| Auth | **Better Auth 1.x** | `apps/web/lib/auth/` |
| Auth DB | pg.Pool → Supabase Postgres (session-mode pooler) | `apps/web/lib/auth/server.ts` |
| Realtime | **Supabase Realtime** | `apps/web/lib/realtime/` (Phase 4) |
| Storage | **Supabase Storage** | `apps/web/lib/supabase/` (Phase 7) |
| Vector search | **pgvector** (Supabase-managed) | `apps/web/lib/db/` (Phase 6) |
| Cron | **pg_cron** (in Supabase) | `supabase/migrations/0017_cron_jobs.sql` |
| Email | **Resend** (prod) + **Inbucket** (local via Supabase CLI) | `apps/web/lib/email/` (Phase 3) |
| Hosting | **Vercel** (web) + **Supabase Cloud** (data) | (Phase 3 3N) |

**Explicitly NOT used:** Convex, Firebase, Prisma, tRPC, TanStack Query, Socket.io, Auth.js / NextAuth, Supabase Auth (Better Auth is the auth; Supabase is the DB host).

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. (One-time) Copy .env.example to .env.local and fill in
#    DATABASE_URL, DIRECT_URL, DATABASE_URL_SESSION, NEXT_PUBLIC_SUPABASE_URL,
#    NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, BETTER_AUTH_SECRET,
#    BETTER_AUTH_URL, RESEND_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
#    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, UPSTASH_REDIS_REST_URL,
#    UPSTASH_REDIS_REST_TOKEN
cp .env.example .env.local

# 3. Start the local Supabase stack (Postgres + Realtime + Storage + Studio + Inbucket)
npm run db:start
# → Studio:    http://127.0.0.1:54323
# → Inbucket:  http://127.0.0.1:54324 (caught emails)
# → DB:        postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 4. Apply all migrations + seed the demo workspace
npm run db:reset
# OR
npm run db:migrate && npm run db:seed

# 5. Run the Next.js dev server (mock data is used until Phase 4 wires up Drizzle)
npm run dev
```

The app is now on `http://localhost:3000`. The data layer is fully populated
by the seed: 1 workspace, 12 users, 4 projects, 30 issues, 3 cycles, 10 labels,
7 comments, 10 notifications, 12 activities.

---

## Scripts

### App

| Script                  | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Next.js dev server on `http://localhost:3000`                        |
| `npm run build`         | Production build                                                     |
| `npm run start`         | Serve the production build                                           |
| `npm run typecheck`     | `tsc --noEmit` across the whole monorepo                             |
| `npm run lint`          | Biome lint across the whole monorepo                                 |
| `npm run screenshots`   | Capture 39+ PNGs into `./screenshots/` for visual review             |

### Supabase + Drizzle

| Script                   | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm run db:start`       | Start the local Supabase stack (Postgres + Realtime + Storage + Studio) |
| `npm run db:stop`        | Stop the local Supabase stack                                          |
| `npm run db:status`      | Print the local stack URLs and credentials                             |
| `npm run db:reset`       | Drop everything, re-apply all migrations, run seed                     |
| `npm run db:migrate`     | Apply pending Drizzle migrations                                       |
| `npm run db:generate`    | Generate a new Drizzle migration from the schema diff                  |
| `npm run db:push`        | Push pending migrations to the linked remote Supabase project          |
| `npm run db:diff`        | Show the SQL diff between local and remote                             |
| `npm run db:seed`        | Run the idempotent seed script (`apps/web/lib/db/seed.ts`)             |
| `npm run db:studio`      | Open Supabase Studio in a browser                                      |
| `npm run db:types`       | Regenerate `apps/web/lib/supabase/database.types.ts`                   |
| `npm run db:lint`        | Run `supabase db lint` + detect schema drift (CI gate)                 |
| `npm run db:test`        | Run the Vitest + RLS + auth suite against the local Supabase           |

### Better Auth

| Script                   | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm run auth:generate`  | Generate Better Auth's auth tables schema (run after plugin changes)   |
| `npm run auth:migrate`   | Apply the Better Auth schema to the database                           |

### Testing

| Script                  | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run db:test`       | Vitest + pg: RLS isolation, auth, Drizzle transactions, integration     |
| `npm run test:e2e`      | Playwright E2E suite (3 browsers, 4 workers, retries on CI)            |
| `npm run test:a11y`     | Playwright + axe-core + keyboard walkthrough                           |
| `npm run test:coverage` | Vitest coverage report → Codecov                                       |

---

## Architecture overview

```
/
├── apps/
│   └── web/                                # Next.js 16 app (the only deployable)
│       ├── app/                            # Routes (RSC + client components)
│       │   ├── (auth)/                     # Phase 3: sign-in, sign-up, magic-link, 2FA
│       │   ├── (workspace)/                # Authenticated shell (TopBar, PrimaryNav)
│       │   │   ├── inbox/                  # Notifications + assignments
│       │   │   ├── my-issues/              # My assignments / watch / author
│       │   │   ├── projects/[key]/         # Project landing + sub-pages
│       │   │   ├── views/[id]/             # Custom saved views
│       │   │   ├── settings/               # Account, workspace, members, billing
│       │   │   └── onboarding/             # Phase 3: post-signup wizard
│       │   ├── api/
│       │   │   ├── auth/[...all]/          # Phase 3: Better Auth HTTP handler
│       │   │   └── email/webhook/          # Phase 3: Resend bounce handler
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                         # Animate UI components
│       │   ├── shell/                      # TopBar, PrimaryNav, CommandPalette
│       │   ├── issue/                      # IssueRow, IssueDrawer, IssueProperties
│       │   ├── views/                      # GroupedList, CycleBoard, FilterPopover
│       │   ├── primitives/                 # Button, Input, Kbd, etc.
│       │   ├── icons/                      # @animate-ui/icons
│       │   ├── auth/                       # Phase 3: SignInForm, TwoFactorSetup, ...
│       │   ├── team/                       # Phase 3: WorkspaceSwitcher, MembersTable
│       │   ├── settings/                   # Phase 3: ProfileForm, SessionsList, ...
│       │   └── onboarding/                 # Phase 3: WorkspaceSetupWizard
│       ├── emails/                         # Phase 3: React Email templates
│       ├── hooks/                          # useSession, useUser, useRealtimeIssues, ...
│       ├── lib/
│       │   ├── auth/                       # Phase 3: Better Auth server + client
│       │   ├── db/                         # Phase 2: Drizzle schema, client, RSC helpers
│       │   ├── email/                      # Phase 3: Resend + Inbucket + Console transports
│       │   ├── realtime/                   # Phase 4: Supabase Realtime subscriptions
│       │   ├── mock/                       # Phase 1 fixtures (Phase 4 deletes data)
│       │   ├── state/                      # Zustand stores (useUI local; useIssues derived)
│       │   ├── motion/                     # Spring variants, motion tokens
│       │   ├── observability/              # Phase 4J: Sentry, PostHog, pino
│       │   ├── i18n/                       # Phase 3M: next-intl dictionaries
│       │   ├── validation/                 # Zod schemas shared client/server
│       │   └── utils/                      # cn, formatDate, etc.
│       ├── tests/                          # Vitest + Playwright
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── postcss.config.mjs
├── supabase/                               # Supabase CLI local dev (committed)
│   ├── config.toml                         # Ports, feature flags
│   ├── migrations/                         # Versioned SQL migrations (Drizzle + hand-authored)
│   │   ├── 0000_initial_schema.sql         # Drizzle-generated
│   │   ├── 0001_rls.sql                    # Hand-authored
│   │   ├── 0002_rls_helpers.sql            # Hand-authored
│   │   ├── 0003_rls_policies.sql           # Hand-authored
│   │   ├── 0004-0017_*.sql                 # Hand-authored (triggers, storage, realtime, pgvector, pg_cron)
│   │   └── 0020-0021_*.sql                 # Phase 3 hardening + per-workspace security
│   ├── seed.sql                            # Alternative SQL seed (Drizzle seed is the source)
│   └── functions/                          # Supabase Edge Functions (none in Phase 2/3)
├── docs/
│   ├── runbooks/                           # Phase 2N, 3N, 3P: deploy, rollback, restore-drill
│   └── security/                           # Phase 3P: threat model, pen-test report
├── scripts/                                # Build, screenshots, CI helpers
├── screenshots/                            # Playwright output (gitignored)
├── PHASE_2_PLAN.md                         # 📌 Current phase plan
├── PHASE_3_PLAN.md                         # 📌 Next phase plan
├── PLAN.md                                 # Full 9-phase plan
├── ARCHITECTURE_13_LAYERS.md               # 13-layer component architecture
├── JIRA_PAIN_POINTS_REPORT.md              # User research
├── package.json                            # Root, with workspaces
├── .env.example                            # Copy → .env.local before first run
├── biome.json
└── .gitignore
```

See [`ARCHITECTURE_13_LAYERS.md`](./ARCHITECTURE_13_LAYERS.md) for the
component layer hierarchy and
[`JIRA_PAIN_POINTS_REPORT.md`](./JIRA_PAIN_POINTS_REPORT.md) for the
research that drove the redesign.

---

## Status

| Phase | Streams | Status |
| ----- | ------- | ------ |
| 0     | Bootstrap monorepo, design tokens, motion preset                          | done |
| 1     | 6 streams (1A-1F): primitives → templates, full app shell, mock data       | done |
| 2     | 14 streams (2A-2N): Supabase data layer + Drizzle + RLS + Storage + Realtime + pgvector + pg_cron | **current** |
| 3     | 17 streams (3A-3Q): Better Auth + Supabase + workspaces + 2FA + passkeys + GDPR | next |
| 4     | 10 streams (4A-4J): Drizzle queries & mutations + Realtime wiring + RLS as the only guard | |
| 5     | Live & resilience (presence, conflict resolution, search, error boundaries, email)        | |
| 6     | Search & AI (pgvector hybrid, ⌘K, AI triage, summarization)                              | |
| 7     | Integrations (GitHub, Slack, webhooks, file uploads, data export, public API)              | |
| 8     | Launch (a11y, perf, testing, Storybook, billing, onboarding, i18n, GDPR, light mode, theming, backup, browser matrix, docs, landing) | |

**Phase 2 deliverables (in progress):**
- 16-entity Drizzle schema (14 from PLAN.md + `audit_log` + `attachments`)
- 17 hand-authored SQL migrations (RLS, triggers, storage, realtime, pgvector, pg_cron, security policy)
- 8 RLS tests proving cross-tenant isolation
- Idempotent Drizzle seed script
- Local dev with `supabase start`; CI gates on schema drift and RLS regressions

See [`PHASE_2_PLAN.md`](./PHASE_2_PLAN.md) for the per-stream DoD check.

---

## First-time setup (new contributor)

1. **Install Node 22+**, **Docker Desktop** (for Supabase local), and **Supabase CLI** (`brew install supabase/tap/supabase` on macOS, `scoop install supabase` on Windows). Clone the repo.
2. `npm install` — installs all workspace deps.
3. `cp .env.example .env.local` and fill in at minimum:
   - `BETTER_AUTH_SECRET` (run `openssl rand -base64 32`)
   - `BETTER_AUTH_URL=http://localhost:3000`
   - The Supabase env vars (after step 4)
4. `npm run db:start` — boots the local Supabase stack (Postgres 15 + Realtime + Storage + Studio + Inbucket in Docker). `supabase status` prints the URLs.
5. `supabase link --project-ref <ref>` (optional) — links to your personal remote Supabase project for preview deploys.
6. `npm run db:reset` — applies all migrations + seeds the demo workspace. Safe to re-run.
7. `npm run auth:generate && npm run auth:migrate` — generates and applies Better Auth's schema (Phase 3 3A; no-op until Phase 3 starts).
8. `npm run dev` — open `http://localhost:3000`.
9. (Optional) `npm run db:test` — runs the RLS + auth test suite against the local DB. `npm run test:e2e` runs Playwright. `npm run test:a11y` runs axe-core.

If you have a Supabase project already linked (check `.env.local`), skip step 5 and just run `npm run db:reset` then `npm run dev`.

---

## Environment variables

The full list lives in `.env.example` at the repo root. Highlights:

```bash
# ─── Supabase ────────────────────────────────────────────────────────────
# Transaction-mode pooler (port 6543) — used by Drizzle in the app
DATABASE_URL=

# Direct connection (port 5432) — used by drizzle-kit migrations only
DIRECT_URL=

# Session-mode pooler (port 5432) — used by Better Auth (Phase 3)
DATABASE_URL_SESSION=

# Public Supabase config (anon key, URL) — for Realtime + Storage clients
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only service role key — NEVER expose to the client
SUPABASE_SERVICE_ROLE_KEY=

# ─── Better Auth (Phase 3) ───────────────────────────────────────────────
BETTER_AUTH_SECRET=                  # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# ─── Resend (Phase 3) ────────────────────────────────────────────────────
RESEND_API_KEY=                      # Phase 3 transactional email
RESEND_WEBHOOK_SECRET=               # Phase 3 bounce handling

# ─── OAuth (Phase 3) ─────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ─── Rate limiting (Phase 3) ─────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── Observability (Phase 4J) ────────────────────────────────────────────
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
POSTHOG_API_KEY=
```

`.env.local` is gitignored. `.env.example` is committed.

---

## Conventions

- **No new dependencies without a discussion.** The package.json is a contract.
- **No `any`** in TypeScript. If you can't type it, it's not ready.
- **No `console.log`** in app code. Use `lib/observability/logger.ts` (Phase 4J).
- **No hard-coded user-facing strings.** Use `useT()` from `lib/i18n/` (Phase 3M).
- **Every business table has RLS enabled.** Verified by the `rls.test.ts` CI gate.
- **Every mutation runs inside `withTransaction()`.** Verified by the `transactions.test.ts` (Phase 4).
- **Every new feature ships behind tests.** Unit, E2E, or a11y.
- **Visual changes ship with a screenshot.** `npm run screenshots` regenerates `./screenshots/`.

---

## License

Private. Not for distribution.
