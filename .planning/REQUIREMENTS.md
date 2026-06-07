# Requirements: rejira (Jira Redesign)

**Defined:** 2026-06-07
**Core Value:** Linear-grade speed for a Jira-shaped workspace. Every interaction must hit its interaction budget; if a feature slows the budget or adds a config screen, it doesn't ship.

## v1 Requirements

### Authentication & Identity (Phase 3)

- [x] **AUTH-01**: User can sign up with email and password (min 12 chars, HIBP-checked) — HIBP deferred to Plan 03-05
- [x] **AUTH-02**: User receives email verification after signup via Resend (ConsoleTransport in dev)
- [x] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh for 7 days (cookie cache JWE 5 min)
- [ ] **AUTH-05**: User can sign in via Google OAuth
- [ ] **AUTH-06**: User can sign in via GitHub OAuth
- [ ] **AUTH-07**: User can sign in via magic link (passwordless)
- [ ] **AUTH-08**: User can enable TOTP-based 2FA with backup codes
- [ ] **AUTH-09**: User can enable passkey (WebAuthn) as a 2FA method
- [ ] **AUTH-10**: User session is tracked with IP and user agent; suspicious activity surfaced
- [ ] **AUTH-11**: All Better Auth endpoints are rate-limited (per-IP + per-account)
- [ ] **AUTH-12**: All Better Auth endpoints enforce CSRF + origin checks

### Workspaces & Memberships (Phase 2 + Phase 3)

- [ ] **WORK-01**: System supports multiple workspaces per database (multi-tenant)
- [ ] **WORK-02**: User can create a workspace (becomes owner)
- [ ] **WORK-03**: Workspace owner can invite users by email
- [ ] **WORK-04**: Invited user receives email with signed token; can accept and join
- [ ] **WORK-05**: User can be a member of multiple workspaces
- [ ] **WORK-06**: Workspace owner can change a member's role (admin / member / guest)
- [ ] **WORK-07**: Workspace owner can remove a member
- [ ] **WORK-08**: User can switch between workspaces via workspace switcher
- [ ] **WORK-09**: Workspace data is isolated by RLS (cross-workspace queries return 0 rows; pgTAP proves it)

### Projects & Cycles (Phase 2 + Phase 4)

- [ ] **PROJ-01**: User can create a project within a workspace (name, key, description, lead)
- [ ] **PROJ-02**: Project has a unique key (e.g., `ENG`) used in issue identifiers (`ENG-1234`)
- [ ] **PROJ-03**: User can edit project details
- [ ] **PROJ-04**: User can archive a project (soft delete; 30-day retention)
- [ ] **PROJ-05**: User can add/remove project members
- [ ] **PROJ-06**: Project can have multiple cycles (sprints) with start/end dates and goals
- [ ] **PROJ-07**: Cycle board view shows issues grouped by status; drag-to-move
- [ ] **PROJ-08**: Cycle automatically advances to the next active cycle on schedule
- [ ] **PROJ-09**: Project roadmap shows cycles on a timeline

### Issues (Phase 2 + Phase 4)

- [ ] **ISSUE-01**: User can create an issue (title, description, status, priority, assignee, labels, cycle, due date)
- [ ] **ISSUE-02**: Issue has a unique key per project (`PROJ-1234`)
- [ ] **ISSUE-03**: User can edit any issue property
- [ ] **ISSUE-04**: User can change issue status via keyboard (`1`–`5`) or dropdown
- [ ] **ISSUE-05**: User can assign issue to one or more members
- [ ] **ISSUE-06**: User can add/remove labels
- [ ] **ISSUE-07**: User can set priority (urgent/high/medium/low/none)
- [ ] **ISSUE-08**: User can set due date with relative + absolute display
- [ ] **ISSUE-09**: User can add sub-issues (parent/child relationship)
- [ ] **ISSUE-10**: User can link related issues (blocks, relates-to, duplicates)
- [ ] **ISSUE-11**: Issue list view shows: key, title, status, priority, assignees, labels, due date
- [ ] **ISSUE-12**: Issue list is virtualized (renders 10k+ rows smoothly)
- [ ] **ISSUE-13**: Issue list is sortable by every column
- [ ] **ISSUE-14**: Issue list supports multi-select and bulk actions
- [ ] **ISSUE-15**: Issue list supports group-by (status, priority, assignee, label, cycle)
- [ ] **ISSUE-16**: Issue drawer slides in from the right without hiding the list
- [ ] **ISSUE-17**: Issue drawer shows all properties, activity, comments, sub-issues
- [ ] **ISSUE-18**: User can comment on an issue (markdown supported)
- [ ] **ISSUE-19**: User can @-mention members in comments
- [ ] **ISSUE-20**: User can delete an issue (soft delete; 30-day retention)

### Inbox & Notifications (Phase 4 + Phase 5)

- [ ] **INBOX-01**: User has an Inbox showing assignments, mentions, status changes on watched issues
- [ ] **INBOX-02**: User can mark a notification as read
- [ ] **INBOX-03**: User can snooze a notification
- [ ] **INBOX-04**: User can mark all as read
- [ ] **INBOX-05**: Unread count badge appears in PrimaryNav

### Saved Views (Phase 2 + Phase 4)

- [ ] **VIEW-01**: User can save current filters/sort/group as a view
- [ ] **VIEW-02**: User can share a view with workspace
- [ ] **VIEW-03**: User can mark a view as personal or shared
- [ ] **VIEW-04**: View encodes filters, sort, group in the URL
- [ ] **VIEW-05**: Views appear in PrimaryNav

### Search (Phase 6)

- [ ] **SRCH-01**: `⌘K` opens command palette with fuzzy search across issues, projects, views
- [ ] **SRCH-02**: Search returns results in < 300ms across 10k issues
- [ ] **SRCH-03**: Search is hybrid (BM25 on `tsvector` + cosine on pgvector embeddings)
- [ ] **SRCH-04**: Search results are faceted (project, status, assignee, label, cycle)
- [ ] **SRCH-05**: AI-powered semantic search in `⌘K` returns cited answers

### Command Palette (Phase 0 — done)

- [x] **CMDP-01**: `⌘K` opens command palette
- [x] **CMDP-02**: Palette fuzzy-searches across issues and navigation
- [x] **CMDP-03**: Palette supports keyboard navigation (`↑` `↓` `Enter` `Esc`)

### Real-time & Collaboration (Phase 5)

- [ ] **REALT-01**: Issue updates from other users appear in < 1 second via Supabase Realtime
- [ ] **REALT-02**: Drawer shows presence avatars of users currently viewing the same issue
- [ ] **REALT-03**: Concurrent edits to issue description resolve without lost work (Yjs)
- [ ] **REALT-04**: Inbox streams new notifications without refresh

### Activity & Audit Log (Phase 4 + Phase 5)

- [ ] **ACT-01**: Every state change (issue created/updated/assigned/commented/etc.) is logged in `activity`
- [ ] **ACT-02**: Activity log writes happen in the same transaction as the change (Postgres trigger)
- [ ] **ACT-03**: Audit log captures all auth events (sign-in, sign-out, password change, 2FA events) in `audit_log`
- [ ] **ACT-04**: Audit log is append-only (no UPDATE/DELETE permissions)
- [ ] **ACT-05**: Project activity page shows recent activity for that project

### File Uploads & Attachments (Phase 2 + Phase 7)

- [ ] **FILE-01**: User can upload files (images, PDFs, archives) to an issue
- [ ] **FILE-02**: Files stored in Supabase Storage with workspace-scoped bucket
- [ ] **FILE-03**: Files are served via signed URLs (1-hour TTL)
- [ ] **FILE-04**: Image attachments show inline preview
- [ ] **FILE-05**: PDF attachments show inline preview

### Integrations (Phase 7)

- [ ] **INTG-01**: GitHub PR title/body matches issue key → links with status (open/merged/closed)
- [ ] **INTG-02**: Slack DM on assignment with deep link
- [ ] **INTG-03**: Outbound webhooks per event (`issue.created`, `issue.updated`, `comment.created`); per-workspace signing secret
- [ ] **INTG-04**: Public REST API for the 5 most-used mutations; rate-limited
- [ ] **INTG-05**: Data export: CSV (issues, comments) and JSON (full workspace); emailed when ready

### Security & Compliance (Phase 2 + Phase 3 + Phase 5 + Phase 8)

- [ ] **SEC-01**: RLS is the only tenancy boundary; pgTAP proves it in CI
- [ ] **SEC-02**: All passwords checked against HIBP (Have I Been Pwned) on signup/password change
- [ ] **SEC-03**: All user accounts support soft 30-day delete, then pg_cron hard delete
- [ ] **SEC-04**: GDPR data export endpoint (per-user, all workspaces, JSON)
- [ ] **SEC-05**: Cookie consent banner (per-workspace configurable)
- [ ] **SEC-06**: DPA published; privacy policy; security disclosure policy
- [ ] **SEC-07**: Vercel middleware adds security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **SEC-08**: Per-endpoint rate limits via Upstash Redis

### Performance & Quality (Phase 8)

- [ ] **PERF-01**: Lighthouse score > 95 (perf, a11y, best-practices, SEO) on all routes
- [ ] **PERF-02**: Core Web Vitals: LCP < 1.2s, INP < 200ms, CLS < 0.05
- [ ] **PERF-03**: 80% test coverage on `lib/`, 60% on `components/`
- [ ] **PERF-04**: ~218 tests (Vitest + Playwright + pgTAP)
- [ ] **PERF-05**: Supabase PITR enabled; quarterly restore drill passes

### Accessibility (Phase 8)

- [ ] **A11Y-01**: WCAG 2.2 AA: axe 0 critical issues
- [ ] **A11Y-02**: Screen reader test passes for 6 core screens
- [ ] **A11Y-03**: Full keyboard navigation across every interactive element
- [ ] **A11Y-04**: 2px focus ring (accent color, 2px offset) always visible on keyboard focus

### i18n (Phase 3 + Phase 8)

- [ ] **I18N-01**: 6 locales at GA (en, es, fr, de, ja, zh)
- [ ] **I18N-02**: No hardcoded strings (CI enforced via lint)
- [ ] **I18N-03**: Transactional emails localized
- [ ] **I18N-04**: Date/time/timezone display per user preference

### Onboarding & Settings (Phase 3 + Phase 8)

- [ ] **ONB-01**: 5-step first-run wizard (workspace name, project name, first issue, invite teammates, theme)
- [ ] **ONB-02**: 7-day activation checklist
- [ ] **ONB-03**: Settings pages: account, workspace, members, billing, integrations, security
- [ ] **ONB-04**: Workspace owner can set workspace-level policies (2FA required, password min length, etc.)

### Billing (Phase 8)

- [ ] **BILL-01**: Stripe Checkout: Free / Pro / Enterprise self-serve
- [ ] **BILL-02**: Webhook updates Postgres; subscription state drives feature flags
- [ ] **BILL-03**: Downgrade to read-only on subscription cancel
- [ ] **BILL-04**: Per-workspace billing (not per-user)

## v2 Requirements

Deferred to post-GA. Tracked but not in current roadmap.

### Mobile

- **MOB-01**: Native iOS app (read-only first; full CRUD in v2.1)
- **MOB-02**: Native Android app
- **MOB-03**: Push notifications

### Time Tracking

- **TIME-01**: Per-issue time entries
- **TIME-02**: Timesheet view
- **TIME-03**: Time reports by project/assignee

### Custom Fields

- **CFLD-01**: Per-workspace custom field definitions
- **CFLD-02**: Field types: text, number, date, single-select, multi-select, user
- **CFLD-03**: Required vs optional per field
- **CFLD-04**: Filter/sort/group by custom fields

### Advanced Workflows

- **FLOW-01**: State machines per project (custom status workflows)
- **FLOW-02**: Automation rules (if X then Y)
- **FLOW-03**: Webhook triggers for external automation

### Enterprise SSO

- **ENT-01**: SAML SSO (Okta, Azure AD, Google Workspace)
- **ENT-02**: SCIM provisioning
- **ENT-03**: Audit log export to SIEM

## Out of Scope

| Feature | Reason |
|---------|--------|
| Convex, Firebase, Prisma, tRPC, TanStack Query | Deliberately replaced; one DB, one ORM, one migration story |
| Auth.js / NextAuth | Better Auth has first-class TS ergonomics and runs on the same Postgres |
| Socket.io | Supabase Realtime replaces it (Postgres Changes + Broadcast + Presence) |
| Supabase Auth | Better Auth is the auth framework; Supabase is the DB host |
| Drizzle Studio | We use Supabase Studio |
| Full CRDT replication at storage layer | Optimistic UI + Realtime is sufficient; Yjs scoped to descriptions (Phase 5) |
| Native mobile apps (v1) | Web is responsive and tested on mobile browsers; native is post-GA |
| Email-only login fallback | Magic link is the recovery path |
| Real-time chat | Not in core product (issue comments + mentions suffice) |
| Video posts | Storage/bandwidth costs; defer to v2+ |
| Self-hosted option (v1) | Vercel + Supabase Cloud; self-host is post-GA |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01..12 | Phase 3 (3A, 3B, 3C, 3D) | Pending |
| WORK-01..09 | Phase 2 (2D) + Phase 3 (3E, 3F, 3G, 3H) | Pending |
| PROJ-01..09 | Phase 2 (2D) + Phase 4 (4A, 4B) | Pending |
| ISSUE-01..20 | Phase 2 (2D) + Phase 4 (4A, 4B, 4E) | Pending |
| INBOX-01..05 | Phase 4 (4C) + Phase 5 (5.2) | Pending |
| VIEW-01..05 | Phase 2 (2D) + Phase 4 (4C) | Pending |
| SRCH-01..05 | Phase 6 | Pending |
| CMDP-01..03 | Phase 0 | ✓ Complete |
| REALT-01..04 | Phase 5 (5.1, 5.2, 5.3) | Pending |
| ACT-01..05 | Phase 4 (4D) + Phase 5 (5.10) | Pending |
| FILE-01..05 | Phase 2 (2J) + Phase 7 (7.4) | Pending |
| INTG-01..05 | Phase 7 (7.1, 7.2, 7.3, 7.5) | Pending |
| SEC-01..08 | Phase 2 (2H) + Phase 3 (3J, 3K, 3L, 3N) + Phase 5 (5.7) + Phase 8 (8.8) | Pending |
| PERF-01..05 | Phase 8 (8.2, 8.3, 8.10) | Pending |
| A11Y-01..04 | Phase 8 (8.1) | Pending |
| I18N-01..04 | Phase 3 (3P) + Phase 8 (8.7) | Pending |
| ONB-01..04 | Phase 3 (3H) + Phase 8 (8.6) | Pending |
| BILL-01..04 | Phase 8 (8.5) | Pending |

**Coverage:**
- v1 requirements: 130 total
- Mapped to phases: 130
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-07*
*Last updated: 2026-06-07 after GSD project initialization (synthesized from PLAN.md + PHASE_1/2/3/4_PLAN.md)*
