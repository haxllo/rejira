<!-- GSD:project-start source:PROJECT.md -->
## Project

rejira is a Linear-grade, keyboard-first, multi-tenant Jira replacement built for engineering teams that have outgrown classic Jira's interface but want its structure. It runs as a Next.js 16 web app on Vercel, persists to Supabase Postgres with Drizzle ORM, and authenticates via Better Auth. The product is opinionated about defaults, but expressive through custom views, saved filters, and progressive disclosure — fast on every interaction, even on slow networks.

**Core value:** Linear-grade speed for a Jira-shaped workspace. Every interaction must hit its interaction budget; if a feature slows the budget or adds a config screen, it doesn't ship.

**Current focus:** Phase 2 — Data layer (Supabase Postgres + Drizzle). Phase 0 (Foundation) and Phase 1 (Interactions) are complete. The next deliverable is a real, multi-tenant, multi-workspace PostgreSQL backend hosted on Supabase, with Drizzle ORM, Row Level Security on every table, Supabase Storage buckets, Realtime publication, pgvector enabled, and pg_cron schedule. The app still reads from `lib/mock/` until Phase 4 deletes mock data.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:PLAN.md (Section 4) -->
## Technology Stack

| Concern | Choice | Notes |
|---|---|---|
| App framework | **Next.js 16 (App Router)** | RSC, server actions, Turbopack, React Compiler |
| UI | **React 19 + Tailwind v4.3 + Motion 12 + Animate UI** | No framer-motion, no Lucide |
| Auth | **Better Auth 1.x** | Sessions in Postgres; plugins: organization, twoFactor, magicLink, admin |
| Database | **PostgreSQL via Supabase** | Managed Postgres 15 with PITR, branching, read replicas |
| Data access | **Drizzle ORM** (Postgres dialect) | Schema-first, type-safe, edge-compatible |
| Auth DB adapter | **pg.Pool → Supabase Postgres** | Better Auth uses the same DB as the app; one connection pooler |
| Realtime | **Supabase Realtime** (Postgres Changes + Broadcast + Presence) | WebSocket subscription per workspace |
| Object storage | **Supabase Storage** (S3-compatible) | Avatars, attachments, exports |
| Vector search | **pgvector** (Supabase-managed) | Issue embeddings, semantic ⌘K (Phase 6) |
| Email | **Resend** (prod) + **ConsoleTransport** (dev) | React Email templates |
| Observability | **Sentry** (errors) + **PostHog** (product analytics) + **Axiom** (logs) | |
| Cron / scheduled jobs | **pg_cron** (in Supabase) | Nightly cleanup, hard-delete, embedding refresh |
| Hosting | **Vercel** (web) + **Supabase Cloud** (data) | Preview envs via Supabase Branching |
| Testing | **Vitest** (unit) + **Playwright** (E2E) + **pgTAP** (DB RLS) | |

**Explicitly NOT used**: Convex, Firebase, Prisma, tRPC, TanStack Query, Drizzle Studio (we use Supabase Studio), Socket.io (Supabase Realtime replaces it), Auth.js / NextAuth (Better Auth replaces it), Supabase Auth (Better Auth is the auth; Supabase is the DB host).

**Three connection strings per env**: `DATABASE_URL` (transaction-mode 6543, app), `DIRECT_URL` (5432, migrations only, never pooled), `DATABASE_URL_SESSION` (5432 session-mode, Better Auth).
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

**Design system:**
- OKLCH color tokens; dark mode is the default; light is a real alternative
- `Geist` (sans), `Geist Mono` (code), `Inter Display` fallback for big numerals
- 8pt base grid; density modes Compact (28px) / Default (36px) / Roomy (48px)
- 5 surface levels: `bg`, `surface-1`, `surface-2`, `surface-3`, `overlay`; borders 1px at 8% alpha
- Motion: spring physics only; durations 120ms / 220ms / 320ms; `ease-spring` cubic-bezier(0.32, 0.72, 0, 1)
- Iconography: `@animate-ui/icons` (24×24 stroke 1.5px); no emoji in UI
- 2px focus ring (accent color, 2px offset) always visible on keyboard focus

**Code style:**
- TypeScript strict mode; no `any`; explicit return types on exported functions
- 2-space indentation; single quotes; trailing commas (Prettier defaults)
- Server components by default; `'use client'` only when needed (state, effects, browser APIs)
- Path alias `@/` for `apps/web/`
- No comments unless asked

**Phase 4 transitions (Drizzle queries):**
- `apply()` calls are replaced with `withTransaction(async (tx) => ...)`
- Mutations go through Drizzle; RLS enforces tenancy (no app-side `requireRole` helpers)
- Realtime subscription via `supabase.channel(...).on('postgres_changes', ...)`
- Optimistic UI via `useOptimistic` (RSC) + client cache invalidation
- `ISSUES` constant from `lib/mock/` is gone; data flows from Postgres

**Migrations:**
- 13 hand-authored SQL migrations for app schema (workspaces, projects, issues, etc.)
- Better Auth schema generated via `npx @better-auth/cli generate` (Phase 3)
- Both applied via `supabase db push`; `drizzle-kit generate` produces no diff
- pgTAP test suite for RLS enforcement (Phase 2H, expanded in Phase 4H)

**Environment:**
- `apps/web/.env.local` (gitignored) for local dev
- `.env.example` checked in (root + `apps/web/`)
- `NEXT_PUBLIC_*` for browser-exposed vars; everything else server-only
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE_13_LAYERS.md -->
## Architecture

13 layers (L1–L13) per `ARCHITECTURE_13_LAYERS.md`. The principle: **separate server-side data access (Drizzle for queries, mutations) from client-side data access (Supabase for Realtime, Storage, Auth UI).** RLS is the only tenancy boundary; the app never has a `requireRole(user, 'admin', workspaceId)` helper because RLS denies unauthorized rows at the database.

**Phase 2 (current):**
- L1: Edge → Vercel
- L2: App → Next.js 16
- L3: Server Actions / Route Handlers
- L4: Drizzle (server) — `pg.Pool` to `DATABASE_URL` (transaction-mode)
- L5: Postgres (Supabase)
- L6: Supabase Realtime / Storage (browser clients)
- L7: Better Auth (Phase 3) — `pg.Pool` to `DATABASE_URL_SESSION` (session-mode)
- L8: Resend (Phase 3) — transactional email
- L9: pg_cron (nightly housekeeping)
- L10: pgvector (Phase 6)
- L11: Sentry (Phase 5)
- L12: PostHog (Phase 5)
- L13: Upstash Redis (Phase 3, rate limits)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| skill | Description | Path |
| ----- | ----------- | ---- |

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using edit, write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
