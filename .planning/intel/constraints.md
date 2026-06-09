# Constraints (SPEC Extract)

## Source Documents

No standalone SPEC documents outside the cyclic set were synthesized. The only incoming SPEC-classified document, PHASE_2_PLAN.md, is in the excluded 5-doc cyclic set ({PLAN.md, PHASE_2_PLAN.md, ARCHITECTURE_13_LAYERS.md, README.md, JIRA_PAIN_POINTS_REPORT.md}).

## Assessment

**No new SPEC content synthesized from incoming documents.** Existing constraints are already captured in:

| Source | What It Covers |
|--------|---------------|
| `.planning/PROJECT.md` (Constraints section) | Stack, performance, test coverage, security, architecture, brownfield constraints |
| `.planning/codebase/STACK.md` | Technology stack with version pins and explicit NOT-used list |
| `.planning/codebase/CONVENTIONS.md` | Design system, code style, Phase 4 transitions, migrations, env |

## Constraint Categories (from existing context)

### Stack Constraints
- Next.js 16, React 19, Tailwind v4.3, Motion 12 (no framer-motion), Animate UI (no Lucide)
- Drizzle ORM, Supabase Postgres, Better Auth
- Supabase Realtime, Storage, pgvector, pg_cron
- Resend, Sentry, PostHog
- **Explicitly NOT used**: Convex, Firebase, Prisma, tRPC, TanStack Query, Socket.io, Auth.js, Supabase Auth, Drizzle Studio

### Connection String Constraints
- `DATABASE_URL` — transaction-mode (port 6543, PgBouncer, `prepare: false`)
- `DIRECT_URL` — direct (port 5432, migrations only)
- `DATABASE_URL_SESSION` — session-mode (port 5432, Better Auth)

### Migration Constraints
- 13 hand-authored SQL migrations for app schema (Phase 2)
- Better Auth schema via `@better-auth/cli generate` (Phase 3)
- Both applied via `supabase db push`; `drizzle-kit generate` produces no diff
- pgTAP for RLS enforcement (Phase 2H, expanded in Phase 4H)

### Performance Constraints
- Lighthouse > 95 (perf, a11y, best-practices, SEO)
- LCP < 1.2s, INP < 200ms, CLS < 0.05
- 80% test coverage on `lib/`, 60% on `components/`

### Security Constraints
- RLS as only tenancy boundary
- WCAG 2.2 AA
- CSRF + origin checks, per-endpoint rate limits, HIBP, 30-day soft-delete
- No app-side `requireRole` helpers (deleted in Phase 4)
