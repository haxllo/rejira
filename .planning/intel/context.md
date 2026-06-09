# Context (DOC Extract)

## Source Documents (Synthesized)

| Source | Type | Topic |
|--------|------|-------|
| PHASE_4_PLAN.md | DOC | Phase 4 execution plan — Drizzle queries & mutations |
| threat-model.md | DOC | STRIDE threat model for auth system |
| restore-drill.md | DOC | Quarterly database restore drill runbook |
| db-failover.md | DOC | Regional database outage response runbook |
| db-migration.md | DOC | Migration workflow (Drizzle + Supabase) |
| prod-rollback.md | DOC | Production rollback runbook |
| prod-deploy.md | DOC | Production deployment runbook |

## Excluded Cyclic Documents

The following DOC-classified documents were excluded from synthesis due to cross-ref cycle detection. Their content is already captured in existing `.planning/` files:

| Source | Already Captured In |
|--------|--------------------|
| PLAN.md | `.planning/PROJECT.md`, `.planning/ROADMAP.md` |
| README.md | `.planning/PROJECT.md` |
| ARCHITECTURE_13_LAYERS.md | `.planning/codebase/ARCHITECTURE.md` |
| JIRA_PAIN_POINTS_REPORT.md | `.planning/PROJECT.md` (User research section) |

---

## Phase 4 — Drizzle Queries & Mutations (PHASE_4_PLAN.md)

**Goal:** Replace mock data (`lib/mock/`) with real Drizzle queries and transactions against Supabase Postgres (Phase 2). The `apply()` pipeline from Phase 1 is retained; the underlying mutation is now an awaited server action. RLS is the only authorization check.

**Key design decisions:**
- **10 sub-phases** (4A–4J), redesigned from original 10 streams into 8 GSD plans across 4 waves
- `withTransaction()` helper sets `request.jwt.claims` for RLS context (user's `external_id`)
- Activity log written by Phase 2 trigger (`tg_emit_activity()`), not app code
- Supabase Realtime subscribes to 6 hot tables via 2G publication
- `apply()` signature does not change — just adds a server action call
- Drizzle client uses `prepare: false` for PgBouncer compatibility
- Sentry + PostHog + pino structured logging in 4J

**Dependencies:** Phase 0 ✅, Phase 1 ✅, Phase 2 📌, Phase 3 📌
**Blocks:** Phase 5 (realtime), Phase 6 (search/AI), Phase 7 (integrations), Phase 8 (launch)
**Current status:** Ready to execute (not started)

**Net changes:** ~30 new files, ~25 edited files, 7 deleted files

---

## Auth System Threat Model (threat-model.md)

**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
**Scope:** Full Phase 3 auth system — authentication, authorization, sessions, multi-tenancy, email, i18n
**Document version:** 1.0
**Last updated:** 2026-06-08

### Trust Boundaries (6 identified)
- Browser → App Server (HTTPS, TLS 1.3)
- App Server → Supabase Postgres (pooler port 6543, RLS)
- App Server → Better Auth (server-side, session tokens via DB lookup)
- App Server → Resend (API key auth, server-side templates)
- App Server → Upstash Redis (REST API with token auth)
- App Server → Sentry/PostHog (client-side SDKs, no PII)
- Browser → Supabase Realtime (WSS, RLS-enforced visibility)
- Accept-Language header (untrusted, validated against allowlist)

### Threat Register Summary
- **24 threats** documented across 6 STRIDE categories
- **High-risk**: Session token forgery (T-03-S1), workspace policy tampering (T-03-T1), session cookie tampering (T-03-T2), CSP bypass (T-03-I4), brute force login (T-03-D1), 2FA bypass (T-03-E1), cross-workspace access via RLS (T-03-E3), admin role escalation (T-03-E4)
- **Medium-risk**: Email spoofing (T-03-S2), OAuth provider spoofing (T-03-S3), email link tampering (T-03-T3), rate limit bypass (T-03-T4), repudiation (T-03-R1, T-03-R2), session token in URL (T-03-I1), error message enumeration (T-03-I3), email bombing (T-03-D2), npm dependency vulns (T-03-D3), domain restriction bypass (T-03-E2)
- **Low-risk accepted**: Locale header spoofing (T-03-S4), i18n dictionary exposure (T-03-I2)
- All Medium+ threats have mitigations implemented in Phase 3

### Key Mitigations
- JWT signed with `BETTER_AUTH_SECRET`, validated every request
- Email verification before account activation
- OAuth redirect URIs whitelisted + state parameter validated
- HttpOnly + Secure + SameSite=Lax cookies
- Single-use tokens for magic links (15min expiry)
- Rate limits in Redis (5 attempts/IP/15min for sign-in)
- Generic error messages (no user existence disclosure)
- Strict CSP with `script-src` controls
- Audit log with actor_id, IP, user_agent, timestamp
- RLS on every table (cross-workspace isolation)

---

## Runbooks

### 1. Production Deployment (prod-deploy.md)

**10-step process:**
1. Create Supabase prod project (eu-west-1, enable PITR + Branching)
2. Set 17 environment variables in Vercel
3. Run `supabase db push` for migrations
4. Seed production data
5. Register Google OAuth + GitHub OAuth apps with correct callback URLs
6. Verify Resend domain (SPF, DKIM, DMARC DNS records)
7. Configure Sentry + PostHog monitoring
8. Deploy via Vercel (GitHub integration or CLI)
9. DNS configuration (CNAME to Vercel, auto SSL)
10. Smoke tests: 10 checks against production

**Prerequisites:** supabase CLI, vercel CLI, GitHub access, Google Cloud Console access, GitHub Developer Settings access, Resend account with verified domain

### 2. Production Rollback (prod-rollback.md)

**Quick rollback:** `vercel rollback` or Vercel Dashboard → Promote to Production (instant, database not affected)

**Database rollback options:**
- **Option 1 — PITR**: Supabase Dashboard → Backups → Point-in-time restore (pre-migration snapshot)
- **Option 2 — Manual migration down**: `psql "$DIRECT_URL"` with reverse SQL
- **Option 3 — Supabase Branching**: Branch from pre-migration snapshot, verify, promote

**Post-mortem checklist:** root cause documented, timeline recorded, impact assessed, preventative measures identified, new tests added, runbook updated

### 3. Migration Workflow (db-migration.md)

**Two migration sources, one apply path:**
- Drizzle-generated (`apps/web/lib/db/migrations/`) — app schema from Drizzle schema files
- Hand-authored (`supabase/migrations/`) — RLS, triggers, storage, realtime, pgvector, pg_cron

**Workflow:**
1. Edit schema in `apps/web/lib/db/schema/*.ts`
2. Run `npm run db:generate` → review SQL → copy to `supabase/migrations/` with sequential number
3. Add hand-authored SQL for RLS/triggers
4. Commit both schema files AND migration SQL
5. Apply via `supabase db push`

**Production rollback path:** PITR (reference: restore-drill.md)

**Drift detection:** `npm run db:diff` — CI runs on every PR, non-empty output fails the build

**Supabase Branching:** `db:branch:create`, `db:branch:list`, `db:branch:delete`

### 4. Database Failover (db-failover.md)

**Regional outage response (5 steps):**
1. Confirm incident on Supabase status page
2. Assess impact (db ping, error rates, affected services)
3. Communicate (Phase 8 adds status page + email to workspace admins)
4. Promote read replica in healthy region (Supabase Pro): Dashboard → Promote to primary → update env vars → redeploy
5. Post-mortem documentation

**PITR verification:** Enabled in Dashboard (Settings → Database → PITR), verify 7-day retention

### 5. Restore Drill (restore-drill.md)

**Quarterly exercise (6 steps):**
1. Pre-drill: confirm PITR enabled, migrations in main, notify team
2. Create temporary restore project (same region, Pro tier)
3. Link and push schema to new project
4. Restore from PITR at ~30 minutes ago
5. Verify: `npm run db:test` + `npm run typecheck`
6. Document time-to-restore (target: < 60 min) and errors
7. Teardown (delete branch + project)

**Note:** This runbook cross-references db-migration.md via the rollback path.
