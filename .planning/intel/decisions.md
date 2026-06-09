# Decisions (ADR Extract)

No standalone ADR documents were found in the ingest set. However, the following documents contain embedded architecture decisions embedded within non-ADR classified content:

## Embedded Decisions in PHASE_3_PLAN.md (classified as PRD)

The document defines 17 architecture decisions (AD-1 through AD-17). These are informational — Phase 3 is marked as complete in the existing roadmap and STATE.md:

- **AD-1**: Use Better Auth core + organization plugin, mapping to workspaces/memberships/invitations/teams tables via `modelName`
- **AD-2**: Better Auth tables use default names (user, session, account, verification, twoFactor); org plugin tables use our names via config
- **AD-3**: Keep Phase 2 `users` mirror table; trigger syncs from `auth.user`
- **AD-4**: Better Auth runs inside Next.js at `[...all]/route.ts`; uses `pg.Pool` against session-mode pooler
- **AD-5**: Foreign keys into user table reference `public.users.id` (BIGINT); bridged via mirror trigger
- **AD-6**: Email transport: Resend (prod) + Inbucket (local) + ConsoleTransport (fallback)
- **AD-7**: 2FA is optional per user; per-workspace "require 2FA for admins" toggle
- **AD-8**: Account deletion has 30-day grace period via pg_cron job
- **AD-9**: Workspace switcher in sidebar (TopBar), not separate page
- **AD-10**: Sign-in is a page (`/sign-in`) for unauthenticated users; modal for switching accounts
- **AD-11**: Workspaces are team-only in Phase 3; personal workspaces deferred
- **AD-12**: Dev seed keeps `u_aria` as "demo owner" with known password (`password-demo`) — **superseded by Phase 3 completion**
- **AD-13**: Rate limiting uses Upstash Redis (prod) + in-memory fallback (dev)
- **AD-14**: All Better Auth JWTs carry `sub` claim as user's `external_id`
- **AD-15**: Sessions stored in Postgres, not in client cookies
- **AD-16**: Passkeys (WebAuthn) supported in 3K; SAML SSO deferred to Phase 8
- **AD-17**: Audit log writes via Better Auth's `databaseHooks`, complementary to Phase 2 Postgres triggers

None of these are formal locked ADRs. They are planning decisions recorded within a PRD document.

*Note: The cyclic document set (PLAN.md, PHASE_2_PLAN.md, ARCHITECTURE_13_LAYERS.md, README.md, JIRA_PAIN_POINTS_REPORT.md) was excluded from synthesis due to cross-ref cycles. Their decisions are already captured in existing context files (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, codebase docs).*
