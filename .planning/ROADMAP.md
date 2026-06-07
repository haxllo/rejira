# Roadmap: rejira (Jira Redesign)

## Overview

A 9-phase brownfield rewrite that takes a runnable Next.js 16 + React 19 + Tailwind v4.3 prototype (with the design system, IA shell, and `apply()` pipeline from Phases 0–1) to a GA-ready multi-tenant workspace on Supabase Postgres + Drizzle + Better Auth. The journey is: lock the data layer (Phase 2), wire real auth and workspaces (Phase 3), replace the mock data layer with Drizzle queries and mutations (Phase 4), add live collaboration and resilience (Phase 5), search and AI (Phase 6), integrations (Phase 7), and launch readiness (Phase 8). Phases execute in numeric order (Sequential); Phase 2 is unblocked and is the current focus.

## Phases

- [x] **Phase 0: Foundation** - Runnable Next.js app, design system, IA shell, 3 primary screens with mock data
- [x] **Phase 1: Interactions** - `apply()` pipeline, URL-synced filters, density, drag, multi-select, toast undo
- [ ] **Phase 2: Data layer (Supabase + Drizzle)** - 16-table multi-tenant schema, RLS, Storage, Realtime, pgvector, pg_cron
- [~] **Phase 3: Auth & Identity (Better Auth)** - Sessions (4/7 plans), workspaces, invites, 2FA, OAuth, magic link, GDPR delete
- [ ] **Phase 4: Drizzle queries & mutations** - All `apply()` calls replaced; realtime wiring; `lib/mock/` data deleted
- [ ] **Phase 5: Live & resilience** - Presence, live updates, Yjs collab, Sentry, security headers, mobile
- [ ] **Phase 6: Search & AI** - pgvector embeddings, hybrid BM25+cosine, `⌘K` semantic, AI triage, cost cap
- [ ] **Phase 7: Integrations** - GitHub PR link, Slack DM, outbound webhooks, file uploads, public REST API
- [ ] **Phase 8: Launch** - WCAG 2.2 AA, Lighthouse > 95, Stripe billing, i18n (6 locales), GDPR, PITR drill, browser matrix

## Phase Details

### Phase 0: Foundation ✅
**Goal**: Runnable Next.js 16 app with the design system, primary nav skeleton, and 3 most-important screens with mock data.
**Depends on**: Nothing (first phase)
**Requirements**: CMDP-01, CMDP-02, CMDP-03
**Status**: Complete
**Completed**: 2026-06-07

Plans:
- [x] 00-01: Next.js 16 + React 19 + Tailwind v4.3 + Animate UI scaffold
- [x] 00-02: Design tokens (OKLCH, Geist fonts, motion variants)
- [x] 00-03: TopBar, PrimaryNav, ViewHeader, IssueRow primitives
- [x] 00-04: Inbox, My Issues, Project issues, Cycle board screens with mock data
- [x] 00-05: `⌘K` command palette with cmdk
- [x] 00-06: Right-side drawer for issue context (peer of list)
- [x] 00-07: Keyboard status changes (`1`–`5`), `Esc` dismisses

### Phase 1: Interactions ✅
**Goal**: Optimistic mutations with rollback, URL-synced filters, density toggle, drag-to-reorder, multi-select + bulk action bar.
**Depends on**: Phase 0
**Requirements**: CMDP-01..03 (verified)
**Status**: Complete
**Completed**: 2026-06-07

Plans:
- [x] 01-01: `apply()` pipeline with toast undo window
- [x] 01-02: URL-synced filters (encode/decode round-trips)
- [x] 01-03: Density toggle (Compact/Default/Roomy)
- [x] 01-04: Drag-to-reorder in lists and boards
- [x] 01-05: Multi-select + bulk action bar
- [x] 01-06: `lastError` global subscription
- [x] 01-07: Convex removal: deleted `.convex/`, deps, scripts, env, CI; rewrote 4 files as Convex-free

### Phase 2: Data layer (Supabase Postgres + Drizzle) 📌
**Goal**: Real, multi-tenant, multi-workspace PostgreSQL backend hosted on Supabase, with Drizzle ORM, Row Level Security on every table, Supabase Storage buckets for avatars/attachments, Supabase Realtime publication for live updates, pgvector enabled for the Phase 6 search index, and a pg_cron schedule for nightly housekeeping. The app still reads from `lib/mock/`; Supabase is parallel infrastructure with no UI changes. **This is the current phase.**
**Depends on**: Phase 1
**Requirements**: WORK-01, WORK-09, PROJ-01..06, ISSUE-01..20 (schema), VIEW-01..05 (schema), FILE-01..03 (storage), SEC-01 (RLS enforcement)
**Success Criteria** (what must be TRUE):
  1. `supabase start` brings up local stack; `supabase db reset` applies all 13 migrations cleanly
  2. 16 tables exist in `public` schema with RLS enabled and policies for every table
  3. Drizzle schema mirrors migrations 1:1; `drizzle-kit generate` produces no diff
  4. RLS policies allow a member to read/write their workspace's data and deny all others (pgTAP proves it)
  5. Supabase Storage buckets `avatars` and `attachments` enforce workspace-scoped RLS via `storage.objects` policies
  6. Realtime publication `supabase_realtime` includes every business table; `pg_notify` test fires events on insert
  7. pgvector extension enabled; `issue_embeddings` table (Phase 6) pre-created
  8. pg_cron schedule runs nightly housekeeping; logs visible in `cron.job_run_details`
  9. CI gate (`supabase db lint` + drift detection + `db:test` pgTAP) blocks PRs that break the schema or RLS
  10. Seed script populates a demo workspace, project, and 50 issues for local dev
**Status**: Not started (ready to plan and execute)
**Detailed plan**: `PHASE_2_PLAN.md` (1208 lines, 14 streams: 2A–2N)

Plans (streams):
- [ ] 02-01: Supabase project + local dev stack (`supabase init`, `config.toml`, local Postgres; 14 db:* scripts)
- [ ] 02-02: Drizzle setup (`drizzle.config.ts`, `pg.Pool` client, schema barrel, smoke-test `SELECT 1`)
- [ ] 02-03: 16-table Drizzle schema + 7 pgEnums (workspaces, users, memberships, projects, project_members, labels, issues, issue_assignees, cycles, cycle_issues, saved_views, comments, notifications, activities, attachments, audit_log)
- [ ] 02-04: RLS policies + isolation tests (3 SQL files; 5 helper functions; 8 Vitest RLS tests)
- [ ] 02-05: DB functions & triggers (6 SQL files: `tg_set_updated_at`, `tg_assign_issue_number`, `tg_emit_activity`, user mirror, workflow_statuses, `search_vector` + GIN)
- [ ] 02-06: Storage buckets + RLS (2 SQL files for `avatars`/`attachments`/`exports`; `lib/supabase/storage.ts` helper)
- [ ] 02-07: Realtime publication (`supabase_realtime` on 6 hot tables; `REPLICA IDENTITY FULL`)
- [ ] 02-08: pgvector setup (extension + HNSW index on `issues.embedding`)
- [ ] 02-09: pg_cron + scheduled jobs (4 jobs: GDPR hard-delete, embedding refresh, orphan-attachment cleanup, nightly vacuum)
- [ ] 02-10: Idempotent seed (`apps/web/lib/db/seed.ts`; demo workspace with 30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items; `ME_ID` placeholder in `demo-session.ts`)
- [ ] 02-11: Local dev DX + `.env.example` (bootstrap script, `/api/db-check` smoke test, README "First-time setup" section)
- [ ] 02-12: Migration workflow (`db:diff`/`db:push:staging`/`db:push:prod` scripts; `docs/runbooks/db-migration.md`)
- [ ] 02-13: CI gates (`.github/workflows/ci.yml` finalized with typecheck + lint + db-lint + drift + db-test + build; branch protection documented)
- [ ] 02-14: Backups + PITR + restore drill (PITR verified in Dashboard; `docs/runbooks/restore-drill.md` + `db-failover.md`; placeholder daily backup cron)

### Phase 3: Auth & Identity (Better Auth + Supabase) 📌
**Goal**: Users sign in to use the app. Real sessions in Postgres via Better Auth, real workspaces (organization plugin mapped to our `workspaces` table), real invites, real 2FA, real OAuth, real audit log, real GDPR delete. Closed-beta-ready: invite a handful of users, they can log in, switch workspaces, and use every page — but state still doesn't persist across the database boundary (the app still reads `lib/mock/` until Phase 4). Phase 3 is the security phase: every stream ships behind a passing test suite.
**Depends on**: Phase 2
**Requirements**: AUTH-01..12, WORK-02..08, I18N-01..04 (email localization), ONB-01..04
**Success Criteria** (what must be TRUE):
  1. User can sign up with email + password (min 12 chars, HIBP-checked) and receives verification email via Resend
  2. User can sign in via Google, GitHub, or magic link
  3. User session persists 7 days; cookie cache JWE 5 min; session token rotated on use
  4. User can enable TOTP 2FA with 8 backup codes (one-time use)
  5. User can enable passkey (WebAuthn) as a 2FA method
  6. User can create a workspace and is auto-assigned owner role
  7. User can invite by email; invitee receives signed token; accepts and joins as member
  8. User can switch workspaces via TopBar workspace switcher
  9. All Better Auth endpoints rate-limited (per-IP + per-account); CSRF + origin checks enforced
  10. Audit log captures all auth events in `audit_log` (append-only, pg_cron never deletes)
  11. User can request GDPR data export (JSON, all workspaces) and account deletion (soft 30 days, then hard)
  12. ~218 tests pass (Vitest + Playwright + pgTAP)
**Status**: In progress (4/7 plans complete — 03-01, 03-02, 03-03, 03-04)
**Detailed plan**: `PHASE_3_PLAN.md` (1220 lines, 17 streams consolidated into 7 GSD plans)
**Plans:** 7 plans

Plans:
- [x] 03-01-PLAN.md — Better Auth core + pg.Pool + email/password auth (sign-up, sign-in, verification, reset) + auth UI forms + email transport
- [x] 03-02-PLAN.md — Magic link + OAuth (Google, GitHub) + session management (IP/UA binding, device tracking) + TOTP 2FA with backup codes
- [x] 03-03-PLAN.md — Organization plugin mapped to workspaces/memberships/invitations tables + member invites + role management + workspace switcher
- [x] 03-04-PLAN.md — Account settings UI (profile, security, sessions, data, notifications) + 5-step onboarding wizard
- [ ] 03-05-PLAN.md — Production hardening (rate limits, HIBP, password policy) + audit log + GDPR export/deletion + passkeys (WebAuthn) + Sentry/PostHog observability
- [ ] 03-06-PLAN.md — App cutover: replace ME_ID demo session with real Better Auth sessions + middleware route protection + RequireAuth component
- [ ] 03-07-PLAN.md — i18n (6 locales) + accessibility (axe-core, keyboard) + security headers (CSP, HSTS) + workspace security policy + deploy runbooks + test suite consolidation

### Phase 4: Drizzle queries & mutations
**Goal**: Every mutation in the UI hits a real Postgres function behind Drizzle. RBAC enforced at the RLS layer. The app is now a real multi-tenant backend. State survives reloads, is shared across users, respects permissions, and the realtime channel keeps everyone in sync. This is the GA-ready backend — closed-beta can promote to open-beta after this lands.
**Depends on**: Phase 3
**Requirements**: PROJ-01..09, ISSUE-01..20, INBOX-01..05, VIEW-01..05, ACT-01..05
**Success Criteria** (what must be TRUE):
  1. Every existing `apply()` call site routes through a Drizzle transaction (`withTransaction()` helper)
  2. `useIssues` is replaced with `useLiveQuery(issuesQuery, ...)`; `useUI` stays local (Zustand)
  3. No TanStack Query; no manual cache invalidation; Supabase Realtime owns live updates
  4. RLS policies enforce workspace isolation on every query (pgTAP proves it for 16 tables)
  5. `ISSUES` constant from `lib/mock/` is gone; data flows from Postgres
  6. Mutation → optimistic UI → server confirm → pending cleared (or error surfaced)
  7. Vercel + Supabase Branching preview per PR; Sentry catching errors
  8. E2E test: signup → create workspace → create project → create issue → assign → close passes
  9. Activity log writes happen via Postgres trigger (same transaction as data change)
  10. Comments, notifications, saved views all backed by Drizzle queries
**Status**: Not started
**Detailed plan**: `PHASE_4_PLAN.md` (528 lines, 10 streams: 4A–4J)

Plans (streams):
- [ ] 04-A: Drizzle query helpers (issues, projects, cycles, labels, memberships) with proper joins
- [ ] 04-B: Drizzle mutations (replace `apply()` with transactional writes; `withTransaction()` helper)
- [ ] 04-C: Comments, notifications, saved views queries + mutations
- [ ] 04-D: Activity / audit log writes from every mutation (via Postgres triggers + Drizzle)
- [ ] 04-E: Realtime subscription wiring (`supabase.channel(...).on('postgres_changes', ...)`)
- [ ] 04-F: Optimistic UI via Drizzle + `useOptimistic` (RSC) + client cache invalidation
- [ ] 04-G: Cleanup: `lib/mock/` data deleted; only types remain for the seed
- [ ] 04-H: pgTAP test suite: RLS enforcement + cross-tenant denial (CI gate; expanded from Phase 2)
- [ ] 04-I: Performance tuning: query plans, indexes, prepared statements, statement timeouts
- [ ] 04-J: Observability: Sentry, PostHog events, query tracing, slow-query log

### Phase 5: Live & resilience
**Goal**: Supabase Realtime presence, live issue updates, Yjs collaborative editing on descriptions, page-level error boundaries, full telemetry & observability, security headers & rate limiting, mobile & responsive design, transactional emails, and the activity log surface.
**Depends on**: Phase 4
**Requirements**: REALT-01..04, INBOX-04, INBOX-05, ACT-05, SEC-07, SEC-08, FILE-04, FILE-05
**Success Criteria** (what must be TRUE):
  1. Realtime presence shows other viewers in the drawer header within 1s
  2. Inbox streams new notifications without refresh
  3. Concurrent description edits resolve without lost work (Yjs + Supabase Realtime Broadcast)
  4. `/search` returns relevant results in < 300ms across 10k issues (pgvector + tsvector hybrid)
  5. Page-level error boundaries catch and report; user sees retry
  6. Sentry catches all unhandled errors; alerts wired
  7. Lighthouse a11y score > 95 on mobile
  8. Tested on iOS Safari 17+ and Android Chrome latest
  9. Transactional emails land in inbox (not spam); unsubscribe works
  10. Project `/activity` page renders the audit trail
**Status**: Not started

Plans:
- [ ] 05-01: Supabase Realtime presence + live issue updates
- [ ] 05-02: Live activity feed in Inbox
- [ ] 05-03: Yjs collaborative editing on description (Supabase Realtime Broadcast)
- [ ] 05-04: Page-level error boundaries + retry UX
- [ ] 05-05: Sentry + PostHog + Axiom telemetry
- [ ] 05-06: Security headers & rate limiting (Vercel middleware + Upstash Redis)
- [ ] 05-07: Mobile & responsive design (iOS Safari 17+, Android Chrome latest)
- [ ] 05-08: Email & notifications (transactional templates, unsubscribe)
- [ ] 05-09: Activity log / audit trail surface (project /activity page)

### Phase 6: Search & AI
**Goal**: Hybrid search (BM25 + cosine), `⌘K` semantic search, AI triage on create-issue dialog, "Summarize this issue" action, per-workspace AI key (BYO OpenAI/Anthropic), cost cap.
**Depends on**: Phase 5
**Requirements**: SRCH-01..05
**Success Criteria** (what must be TRUE):
  1. `⌘K` AI queries return cited, structured answers for 80% of test prompts
  2. AI triage on create-issue dialog reduces time-to-create by 30%
  3. Embedding pipeline runs nightly + on-write; index lag < 5 minutes
  4. Per-workspace AI cost cap enforced; admin sees spend
  5. `/search` returns hybrid results with facets
**Status**: Not started

Plans:
- [ ] 06-01: pgvector embeddings on issue create/update via pg_net → external embedding service
- [ ] 06-02: Hybrid search backend (BM25 on `tsvector` + cosine similarity on embeddings)
- [ ] 06-03: `⌘K` semantic + lexical search
- [ ] 06-04: AI triage on new-issue dialog
- [ ] 06-05: "Summarize this issue" action
- [ ] 06-06: Per-workspace AI key (BYO OpenAI / Anthropic); admin cost cap

### Phase 7: Integrations
**Goal**: GitHub PR ↔ issue linking, Slack DM on assignment, outbound webhooks per event, file uploads with previews, data export, public REST API.
**Depends on**: Phase 6
**Requirements**: INTG-01..05, FILE-04, FILE-05
**Success Criteria** (what must be TRUE):
  1. GitHub PR ↔ issue linking: webhook → match → link within 30s
  2. Slack DM on assignment: message with deep link, no auth redirects
  3. Outbound webhooks fire for the 5 most common events; signing secret verified
  4. File upload (10MB image) completes and previews in < 3s
  5. CSV export of 1k issues completes in < 60s; emailed when ready
  6. Public API: 5 most-used mutations work via REST; rate-limited
**Status**: Not started

Plans:
- [ ] 07-01: GitHub PR ↔ issue linking (webhook + matcher)
- [ ] 07-02: Slack DM on assignment
- [ ] 07-03: Outbound webhooks per event (per-workspace signing secret)
- [ ] 07-04: File uploads & attachments (Supabase Storage with signed URLs; previews)
- [ ] 07-05: Data export (CSV + JSON; async generation; emailed)
- [ ] 07-06: Public REST API (5 most-used mutations; token auth; rate-limited)

### Phase 8: Launch
**Goal**: WCAG 2.2 AA, Lighthouse > 95, Stripe billing, onboarding wizard, i18n (6 locales), GDPR & privacy, real light mode, PITR drill, browser support matrix, documentation, marketing & launch readiness.
**Depends on**: Phase 7
**Requirements**: A11Y-01..04, PERF-01..05, I18N-01..04, ONB-01..04, BILL-01..04, SEC-04..06, SEC-10
**Success Criteria** (what must be TRUE):
  1. WCAG 2.2 AA: axe 0 critical issues, screen reader test passes for 6 core screens
  2. Lighthouse > 95 on all routes (perf, a11y, best-practices, SEO)
  3. Core Web Vitals: LCP < 1.2s, INP < 200ms, CLS < 0.05
  4. Test coverage: 80% on `lib/`, 60% on `components/`; 5 critical E2E flows pass
  5. Storybook published; 3 densities × light/dark for every component
  6. Stripe Checkout: Free/Pro/Enterprise self-serve; webhook updates Postgres; downgrade to read-only on cancel
  7. First-run onboarding: 5-step flow, dismissible; 7-day checklist
  8. i18n: 6 locales at GA; no hardcoded strings (CI enforced)
  9. GDPR: data export + account deletion (soft 30 days); cookie consent
  10. Real light mode: every token has a light counterpart; system preference auto-detected
  11. Supabase PITR enabled; quarterly restore drill passes
  12. Browser support matrix: Chrome/Edge/Safari/Firefox latest 2; graceful degradation
  13. Landing page live; status page; security disclosure policy; launch checklist signed off
  14. Better Auth enterprise plugins enabled: SAML SSO, MFA (TOTP), passkeys, organization UI; admin sees audit log
**Status**: Not started

Plans:
- [ ] 08-01: WCAG 2.2 AA (axe, screen reader, keyboard)
- [ ] 08-02: Lighthouse perf > 95; Core Web Vitals
- [ ] 08-03: Test coverage (Vitest + Playwright + pgTAP)
- [ ] 08-04: Storybook + Chromatic
- [ ] 08-05: Stripe billing (Free / Pro / Enterprise)
- [ ] 08-06: First-run onboarding (5-step + 7-day checklist)
- [ ] 08-07: i18n & l10n (next-intl, 6 locales)
- [ ] 08-08: GDPR & privacy (export, delete, cookie consent, DPA)
- [ ] 08-09: Theming (real light mode, per-workspace accent)
- [ ] 08-10: Backup & DR (PITR, quarterly drill, S3 lifecycle)
- [ ] 08-11: Browser support matrix
- [ ] 08-12: Documentation (user docs, dev docs, ADRs, CHANGELOG)
- [ ] 08-13: Marketing & launch readiness (landing, status, security disclosure, drip emails)

## Progress

**Execution Order:**
Phases execute in numeric order: 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundation | 7/7 | Complete | 2026-06-07 |
| 1. Interactions | 7/7 | Complete | 2026-06-07 |
| 2. Data layer (Supabase + Drizzle) | 0/14 | Ready to execute | - |
| 3. Auth & Identity (Better Auth) | 4/7 | Ready to execute | - |
| 4. Drizzle queries & mutations | 0/10 | Not started | - |
| 5. Live & resilience | 0/9 | Not started | - |
| 6. Search & AI | 0/6 | Not started | - |
| 7. Integrations | 0/6 | Not started | - |
| 8. Launch | 0/13 | Not started | - |

---
*Roadmap defined: 2026-06-07 after GSD project initialization*
*Detailed plans: `PHASE_2_PLAN.md` (current focus), `PHASE_3_PLAN.md`, `PHASE_4_PLAN.md` in repo root*
