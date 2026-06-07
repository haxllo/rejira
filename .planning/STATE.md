# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-07)

**Core value:** Linear-grade speed for a Jira-shaped workspace. Every interaction must hit its interaction budget; if a feature slows the budget or adds a config screen, it doesn't ship.
**Current focus:** Phase 3 — Auth & Identity (Better Auth)

## Current Position

Phase: 3 of 8 (Auth & Identity — Better Auth + Supabase)
Plan: 01 of 7 in current phase
Status: Plan 03-01 complete; Better Auth server, email/password auth, auth UI shipped
Last activity: 2026-06-07 — Phase 3 Plan 01 executed; Better Auth core with pg.Pool, email/password auth with verification and reset, 6 auth pages, 22 tests

Progress: [████░░░░░░] 33% (29/89 plans: phases 0–2 done, phase 3: 1/7)

## Performance Metrics

**Velocity:**
- Total plans completed: 14 (Phase 0: 7, Phase 1: 7)
- Total execution time: ~6 hours (Phase 0 + 1)
- Average duration: ~25 min/plan

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 0. Foundation | 7/7 | 7 | ~25 min |
| 1. Interactions | 7/7 | 7 | ~25 min |
| 2. Data layer | 14/14 | 14 | ~10 min |
| 3. Auth & Identity | 1/7 | 7 | ~54 min |
| 4. Drizzle queries | 0/10 | 10 | TBD |
| 5. Live & resilience | 0/9 | 9 | TBD |
| 6. Search & AI | 0/6 | 6 | TBD |
| 7. Integrations | 0/6 | 6 | TBD |
| 8. Launch | 0/13 | 13 | TBD |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Recent decisions (full log in PROJECT.md):

- **Phase 0**: Next.js 16 + React 19 + Tailwind v4.3 + Animate UI; OKLCH tokens; Geist fonts
- **Phase 1**: `apply()` pipeline with toast undo; URL-synced filters; Convex removed
- **Phase 2 prep**: Replaced Convex with Supabase Postgres + Drizzle + Better Auth (one DB, one ORM, one migration story)
- **Phase 2 config**: Three connection strings per env (transaction-mode for app, direct for migrations, session-mode for Better Auth)
- **Phase 2 schema**: 16 tables including `audit_log` and `attachments` (added during Convex pivot)
- **GSD config**: YOLO mode, Fine granularity (8–12 phases; we have 9), Sequential execution, Git tracking enabled, Research on, Plan Check on, Verifier off, Smart model profile

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 2 → 3 dependency**: Phase 3 (Better Auth) cannot start until Phase 2 (Supabase + Drizzle) lands. Better Auth needs the Postgres database and the user/workspaces schema. Per PHASE_2_PLAN.md stream 2D, our `workspaces` table is the target of Better Auth's organization plugin (renamed via `organization.modelName: "workspaces"`).
- **Better Auth schema generation timing**: `@better-auth/cli generate` must run AFTER Phase 2D migrations apply the `workspaces` table, but BEFORE Phase 3A. This is a tight constraint and the only way the two schema layers coexist.
- **Convex → Supabase migration is irrevocable**: We deleted `.convex/`, deps, scripts, CI references, and env. If Phase 2 fails, we don't roll back to Convex — we fix the Supabase integration. The plan is sound.
- **RLS as only tenancy boundary**: We're deleting the Convex-era `requireRole` helpers in Phase 4. Defense in depth means even a bug in app code can't leak data. pgTAP proves it (2H, 4H).

## Deferred Items

Items acknowledged and carried forward:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| (none) | | | |

## Session Continuity

Last session: 2026-06-07
Stopped at: GSD project initialized; 18 agents installed at `C:\Users\mshab\.config\opencode\agents\`; `.planning/{config.json, PROJECT.md, REQUIREMENTS.md, ROADMAP.md}` committed. Phase 2 ready to plan and execute.
Resume file: None
