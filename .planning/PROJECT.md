# rejira (Jira Redesign)

## What This Is

rejira is a Linear-grade, keyboard-first, multi-tenant Jira replacement built for engineering teams that have outgrown classic Jira's interface but want its structure. It runs as a Next.js 16 web app on Vercel, persists to Supabase Postgres with Drizzle ORM, and authenticates via Better Auth. The product is opinionated about defaults, but expressive through custom views, saved filters, and progressive disclosure — fast on every interaction, even on slow networks.

## Core Value

**Linear-grade speed for a Jira-shaped workspace.** Every interaction must hit its interaction budget; if a feature slows the budget or adds a config screen, it doesn't ship.

## Requirements

### Validated

- ✓ Next.js 16 (App Router) + React 19 + Tailwind v4.3 app boots cleanly on `:3000` (Phase 0)
- ✓ Design system: OKLCH tokens, Geist/Geist Mono, Motion 12 spring physics, 5 surface levels (Phase 0)
- ✓ Three primary screens render with mock data: Inbox, My Issues, Project issues, Cycle board (Phase 0)
- ✓ `⌘K` command palette with fuzzy search across issues and navigation (Phase 0)
- ✓ Right-side drawer for issue context (peer of list, not child) (Phase 0)
- ✓ Keyboard status changes (`1`–`5` while focused on row), `Esc` dismisses drawer (Phase 0)
- ✓ State change pipeline: optimistic mutations with rollback, URL-synced filters, density toggle, drag-to-reorder, multi-select + bulk action bar, toast undo window (Phase 1)
- ✓ `lastError` global subscription, 39 screenshots regenerated, `tsc --noEmit` clean (Phase 1)
- ✓ Convex fully removed from codebase, dependencies, scripts, CI, env (Phase 1 → Phase 2 prep)

### Active

- [ ] **Supabase + Drizzle data layer** (Phase 2 — current): 16-table multi-tenant schema, RLS on every table, Supabase Storage buckets, Realtime publication, pgvector enabled, pg_cron schedules
- [ ] **Better Auth + organization plugin** (Phase 3): sessions in Postgres, real workspaces, invites, 2FA, OAuth (Google, GitHub), magic link, GDPR delete
- [ ] **Drizzle queries & mutations** (Phase 4): every `apply()` call site replaced; realtime subscription wiring; `lib/mock/` data deleted (types retained for seed); RLS as only guard
- [ ] **Live & resilience** (Phase 5): presence, live updates, Yjs collaborative editing, error boundaries, Sentry, security headers
- [ ] **Search & AI** (Phase 6): pgvector embeddings, hybrid BM25+cosine, `⌘K` semantic, AI triage, per-workspace cost cap
- [ ] **Integrations** (Phase 7): GitHub PR ↔ issue, Slack DM, outbound webhooks, file uploads, public REST API
- [ ] **Launch readiness** (Phase 8): WCAG 2.2 AA, Lighthouse > 95, Stripe billing, onboarding wizard, i18n (6 locales), GDPR, PITR drill, browser matrix

### Out of Scope

- **Convex, Firebase, Prisma, tRPC, TanStack Query, Socket.io, Auth.js, Supabase Auth** — we deliberately replaced Convex (Phase 2 pivot) and chose Better Auth + Supabase Postgres for a single ORM, single DB, single migration story
- **Email-only login fallback when password is forgotten** — magic link is the recovery path; password reset via Resend is the path
- **Offline-first editing** — we use optimistic UI with realtime sync, not full CRDT replication at the storage layer (Phase 5 Yjs is scoped to descriptions)
- **Native mobile apps** — web is responsive and tested on mobile browsers; native is a future consideration
- **Time tracking / billing** — not in core product; integration via webhooks in Phase 7
- **Custom fields per workspace** — Phase 4+ via `issue.custom_fields jsonb`; full field-builder UI is post-GA

## Context

**User research** (`JIRA_PAIN_POINTS_REPORT.md`): classic Jira is slow, has too many clicks for status changes, hides the list when opening issues, and treats keyboard shortcuts as power-user features. rejira's IA treats the list and the drawer as peers (not parent/child) — the list never goes away.

**Technical environment**: brownfield Next.js 16 monorepo (`apps/web`), Supabase Cloud for managed Postgres 15 (PITR, branching, read replicas), Vercel for web hosting. Three connection strings per env: `DATABASE_URL` (transaction-mode 6543 for app), `DIRECT_URL` (5432 for migrations only), `DATABASE_URL_SESSION` (5432 session-mode for Better Auth). Better Auth and Drizzle share one Postgres database with two schema layers: Better Auth tables managed by `@better-auth/cli generate`, app tables managed by Drizzle.

**Prior decisions** (archived in git history): we started on Convex. Convex is an outstanding product but it was the wrong fit for this project — we needed real Postgres (RLS, pgvector, pg_cron, branching, PITR) and a real auth framework with first-class TypeScript ergonomics. Better Auth + Supabase gives us both with one database, one ORM, one migration story.

**Known issues to address**: RLS is the primary tenancy boundary (not app-side helpers); `requireRole` helpers from the Convex version are deleted in Phase 4. Auth flow is non-trivial (17 streams in Phase 3) and must ship behind a passing test suite. Realtime authorization is enforced by RLS, not channel names. Better Auth organization plugin must be renamed to our domain terms (`workspaces`/`memberships`/`invitations`/`teams`).

## Constraints

- **Stack**: Next.js 16, React 19, Tailwind v4.3, Motion 12 (no framer-motion), Animate UI (no Lucide), Drizzle ORM, Supabase Postgres, Better Auth, Supabase Realtime, Supabase Storage, pgvector, pg_cron, Resend, Sentry, PostHog — locked, no more pivots
- **Performance**: Lighthouse > 95 (perf, a11y, best-practices, SEO); Core Web Vitals LCP < 1.2s, INP < 200ms, CLS < 0.05 (Phase 8 gate)
- **Test coverage**: 80% on `lib/`, 60% on `components/`, ~218 tests (Vitest + Playwright + pgTAP)
- **Security**: WCAG 2.2 AA, CSRF + origin checks, per-endpoint rate limits, HIBP password breach check, audit log via database hooks, 30-day soft-delete then pg_cron hard-delete, IP tracking with proxy header support
- **Architecture**: 13 layers (L1–L13 in `ARCHITECTURE_13_LAYERS.md`); separation of server-side Drizzle (server components, mutations) from client-side Supabase (Realtime, Storage); RLS as the only tenancy boundary
- **Brownfield**: existing Phase 0 + Phase 1 code with mock data, design system, IA shell, `apply()` pipeline, 39 screenshots — must coexist with new data layer until Phase 4 deletes mock data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Convex with Supabase Postgres + Drizzle | Real Postgres (RLS, pgvector, pg_cron, PITR) and real TypeScript auth framework; one DB, one ORM, one migration story | ✓ Convex removed from `apps/`, scripts, deps, CI, env; Phase 2 underway |
| Better Auth (not Supabase Auth) | First-class TS ergonomics, organization plugin mappable to our `workspaces`/`memberships`/`invitations`/`teams`, no vendor lock-in, runs on the same Postgres | — Pending Phase 3 (3A) |
| Three connection strings per env | PgBouncer (Supabase transaction pooler) is fine for app queries with `prepare: false`; migrations need a direct connection; Better Auth prefers session-mode | ✓ `.env.example` rewritten |
| RLS as only tenancy boundary | Defense in depth; even a bug in app code can't leak across workspaces; pgTAP proves it in CI | — Pending Phase 2 (2H) |
| Sequential execution (not parallel) | 9 phases with hard dependencies (Phase 2 → 3 → 4); parallel plan-level work would risk merge conflicts on shared schema/migration files | ✓ Config: `parallelization.enabled: false` |
| Fine granularity (8–12 phases) | Plan has 9 phases; each is small enough to plan in one pass and verify before moving on | ✓ Config: `granularity: "fine"` |
| Git tracking enabled (commit_docs: true) | Planning artifacts tracked in version control; the team can review what changed and why | ✓ Config: `planning.commit_docs: true` |
| Activity log writes via Postgres trigger | Same-transaction audit trail; can't be lost on app crash; reads consistently with the change | — Pending Phase 4 (4D) |
| Yjs for descriptions only (Phase 5) | Full CRDT replication is overkill; descriptions are the only long-form content where concurrent edits matter | — Pending Phase 5 |

---

*Last updated: 2026-06-07 after Phase 1 completion and GSD project initialization*
