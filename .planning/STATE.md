# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-07)

**Core value:** Linear-grade speed for a Jira-shaped workspace. Every interaction must hit its interaction budget; if a feature slows the budget or adds a config screen, it doesn't ship.
**Current focus:** Phase 3 — Auth & Identity (Better Auth)

## Current Position

Phase: 3 of 8 (Auth & Identity — Better Auth + Supabase)
Plan: 06 of 7 in current phase
Status: Plan 03-06 complete; THE CUTOVER — demo-session.ts deleted, ME_ID constant removed, all 15+ components read real Better Auth sessions, Next.js middleware protects all workspace routes (cookie presence check + security headers), client-side RequireAuth wrapper with loading skeleton, useCurrentUser returns null when no session (no mock fallback), 8 cutover tests pass (131 total)
Last activity: 2026-06-08 — Phase 3 Plan 06 executed; cutover to real Better Auth sessions

Progress: [██████░░░░] 38% (34/89 plans: phases 0–2 done, phase 3: 6/7)

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
| 3. Auth & Identity | 6/7 | 7 | ~20 min |
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
- **Phase 3A (03-01)**: Better Auth 1.6.14 core with pg.Pool, email/password auth, 6 auth pages, 22 tests
- **Phase 3B-C-D (03-02)**: Magic link plugin + genericOAuth (Google, GitHub) + session device tracking (IP/UA SHA-256) + TOTP 2FA (twoFactor plugin, issuer 'rejira') + backup codes, 31 new tests
- **Phase 3E-F-G (03-03)**: Organization plugin mapped to workspaces/memberships/invitations/teams via modelName, JWT claims sub={{user.external_id}} for RLS, workspace CRUD helpers, member invitations with signed tokens (7-day expiry), role management (owner/admin/member/guest), workspace switcher replacing ?w= hack, settings members page with role editing, invite accept page with auth gate, 27 new tests (80 total)
- **Phase 3H-I (03-04)**: Account settings UI with card-grid navigation (6 hub cards, 5 sub-pages), interactive form components (profile with avatar color picker, password with strength indicator, email with dual-verification info, 2FA with enable/disable flow), 5-step onboarding wizard with spring-motion slide transitions and horizontal pill progress indicator, useWorkspace hook replacing Phase 1 ?w= hack with Better Auth useActiveOrganization, notification preferences page, data export and account deletion with confirmation modal (30-day soft-delete), 16 new tests (96 total)
- **Phase 3J-K (03-05)**: Production hardening: Upstash Redis rate limiter with sliding window per-endpoint policies, HIBP k-anonymity breach check with prefix cache, async password validation with zxcvbn-style strength meter, Drizzle-based audit log with 21 event types, GDPR soft-delete with 30-day grace + pg_cron hard-delete (migrations 0018/0019), anomaly detection, WebAuthn passkey plugin (enroll + sign-in + list + remove), Sentry + PostHog observability with graceful degradation, email bounce webhook with Resend HMAC verification, 38 new tests (123 passing total)
- **Phase 3L (03-06)**: THE CUTOVER — replaced Phase 1 demo session (ME_ID constant) with real Better Auth sessions across all workspace pages; created Next.js middleware for route protection (cookie-only fast path + security headers); built client-side RequireAuth wrapper with motion-pulse loading skeleton; created useSession/useUser convenience hooks; deleted demo-session.ts and proxy.ts; updated 15+ components to read real user from session; 8 cutover tests (131 total); zero ME_ID/ME_EXTERNAL_ID references remain in production code
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

Last session: 2026-06-08
Stopped at: Completed 03-06-PLAN.md — cutover to real Better Auth sessions, middleware route protection, ME_ID removal
Resume file: None
