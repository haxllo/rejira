# PLAN.md — Jira Redesign

> Read `ARCHITECTURE_13_LAYERS.md` first. This document is execution order, not architecture.

---

## North star

> **Linear-grade speed, opinionated defaults, progressive disclosure, keyboard-first.**

Every decision is tested against this. If a feature slows the interaction budget or adds a config screen, it doesn't ship.

---

## Visual direction

**Tone**: precise, editorial, quietly luxurious. Think Linear meets Stripe Press.
**Typography**: `Geist` (sans), `Geist Mono` (code), `Inter Display` fallback for big numerals.
**Color**: neutral-first OKLCH palette with a single warm accent. Dark mode is the default; light is offered as a real alternative, not a yellow filter.
**Motion**: spring physics only. Durations: 120ms micro, 220ms enter, 320ms layout. No `ease-in-out` linear curves.
**Layout grid**: 8pt base. Density modes: Compact (28px row), Default (36px), Roomy (48px).
**Iconography**: `@animate-ui/icons` (24×24 stroke icons, 1.5px weight). No emoji in UI.
**Surfaces**: 5 levels (`bg`, `surface-1`, `surface-2`, `surface-3`, `overlay`). Borders are 1px at 8% alpha, never hard-coded hex.
**Focus ring**: 2px outline, accent color, 2px offset. Always visible on keyboard focus.

---

## Information architecture

```
TopBar       — workspace switcher · global ⌘K · presence · profile
PrimaryNav   — Inbox (badge) · My Issues · Projects ▼ · Views · Cycles
View         — the page; varies by route
  ┌──────────────────────────────────────────────────┐
  │ ViewHeader    — title, filters, view-as, share  │
  ├──────────────────────────────────────────────────┤
  │ ViewBody                                       │
  │  ┌────────────┬─────────────────┬────────────┐  │
  │  │            │                 │            │  │
  │  │   List     │     Content     │  Drawer    │  │
  │  │  (resizable)│  (resizable)  │  (toggle)  │  │
  │  │            │                 │            │  │
  │  └────────────┴─────────────────┴────────────┘  │
  └──────────────────────────────────────────────────┘
StatusBar    — connectivity · build · keyboard cheatsheet toggle
```

The **Drawer is a peer of the list, not a child**. This is the key to making Jira feel like Linear: the list never goes away, the drawer slides in from the right with the issue context.

---

## Routes (Phase 0–8)

| Route | Purpose | Notes |
|---|---|---|
| `/inbox` | Notifications + assignments | Live feed, mark-read, snooze |
| `/my-issues` | Issues where I am assignee / watcher / author | Quick filters, group by status |
| `/projects/[key]` | Project landing | Recent activity, members, settings entry |
| `/projects/[key]/issues` | Default issue list | The workhorse view |
| `/projects/[key]/cycles/[id]` | Cycle board | Kanban within a cycle |
| `/projects/[key]/roadmap` | Timeline | Gantt-lite |
| `/views/[id]` | Custom saved view | Filters, sort, group, share |
| `/search` | Search results | Faceted, with `⌘K` quick switcher |
| `/settings/*` | Workspace, members, billing, integrations | Stub for now |

---

## Phases

> Phase 0 and Phase 1 ship the UI. Everything after is what turns the prototype into a product. **Phases 2–4 are the ship-blocker layer** — Convex data layer, Better Auth, then real backend queries — that has to land before any backend-touching work in Phase 5+. Stack: **Convex** (database + functions + realtime + storage + vector search) + **Better Auth** (sessions in Convex, framework-agnostic, no vendor lock-in for auth).

### Phase 0 — Foundation ✅

**Goal**: a runnable Next.js app with the design system and the primary nav skeleton, demonstrating 3 of the most-important screens with mock data.

Deliverables:
- `apps/web` Next.js 15.5 + React 19 + TS 5.7
- Tailwind v4.3 CSS-first config in `globals.css`
- Animate UI installed via shadcn registry
- Motion 12 wired with our variant set
- Mock data layer in `lib/mock/` (issues, users, projects, cycles)
- Routes: `/inbox`, `/my-issues`, `/projects/ENG/issues`, `/projects/ENG/cycles/23`
- Top bar, command palette (`⌘K`), primary nav
- Issue list + right-side drawer for issue detail
- Keyboard shortcuts: `⌘K`, `C` create, `1-5` status, `Esc` close drawer, `?` cheatsheet

### Phase 1 — Interactions ✅

- Optimistic mutations with rollback (`apply()` engine, `lib/state/mutations.ts`)
- URL-synced filters (group, sort, status, assignee, label, priority, due) via `useViewQuery`
- Density toggle (Compact / Default / Roomy) with status-bar indicator + URL param
- Drag-to-reorder on lists; drag-to-change-status on board (`@dnd-kit/*`)
- Multi-select + bulk action bar (undoable)
- Toast undo window (5s expiry, click-to-undo, retry, viewAction)
- `lastError` global subscription for failed mutations
- All routes URL-synced, all state recoverable from URL

### Phase 2 — Data layer (Convex)

> **Milestone:** Convex schema deployed, seeded with the demo workspace, multi-tenant queries isolated. The app still uses `lib/mock/`; the Convex deployment is parallel infrastructure with no UI changes. This phase is unblockable — no dependencies on auth, API, or UI. Convex replaces Drizzle + Postgres + migrations + seed script + indexes with one TypeScript file.

**2.1 Convex setup**
- `npx convex dev` to create a project + dev deployment
- `convex/` directory at repo root (or `apps/web/convex/` — choose one and stick with it)
- `convex/schema.ts` with typed validators (`v.id`, `v.string`, `v.union`, etc.)
- `convex.json` config; `npx convex deploy` for production

**2.2 Schema & indexes** — `convex/schema.ts`
- 14 entities: `users`, `workspaces`, `memberships` (role: owner / admin / member / guest), `projects`, `projectMembers`, `labels`, `issues`, `issueAssignees` (many-to-many), `issueLabels`, `cycles`, `cycleIssues`, `savedViews`, `comments`, `notifications`, `activities`
- Indexes declared on the schema: `issues.by_workspace_status`, `issues.by_workspace_assignee`, `issues.by_workspace_due`, `savedViews.by_workspace_user`, `notifications.by_user_read`
- Convex's `.index("name", ["workspaceId", "status"])` pattern — every query uses an index, no full scans
- `defineSchema({...})` exports the schema; Convex validates on write

**2.3 Multi-tenancy**
- Every business table has `workspaceId: v.id("workspaces")`; every query/mutation takes a workspace-scoped identity
- Soft-delete with `archivedAt: v.optional(v.number())` on `workspaces`, `projects`, `issues`
- Cross-workspace invite model: `memberships(userId, workspaceId, role, invitedBy, joinedAt)`
- Helper `requireWorkspace(ctx, workspaceId)` reads identity, asserts membership, returns the role
- Data isolation tests: every query helper tested to refuse cross-workspace access

**2.4 Seed & dev data**
- `convex/seed.ts` — internal mutation that creates the demo workspace, 3 users, 3 projects, ~100 issues from `lib/mock/`
- Called once via `npx convex run seed:seed` after a fresh deploy
- Stable IDs via Convex's `_id` generation; reproducible across dev/prod seeds
- Convex dashboard "Data" tab for manual inspection during development

**2.5 Local dev DX**
- `npx convex dev` runs the local backend (no Docker, no Postgres install)
- Hot-reload: schema and function changes deploy on save
- `npx convex dashboard` opens the dashboard for the current dev deployment
- `.env.local` with `CONVEX_DEPLOY_KEY`, `BETTER_AUTH_SECRET`, `SENTRY_DSN`; `.env.example` checked in
- README section: "First-time setup" (`pnpm i && npx convex dev && pnpm dev`)

**2.6 CI**
- PR check: `npx convex dev --once` validates the schema compiles and indexes are well-formed
- Deploy previews: each PR gets a Convex preview deployment (built into Convex)
- Typecheck via `tsc --noEmit` (Convex types are first-class)

**Acceptance criteria:**
- [ ] `npx convex dev` runs locally; dashboard shows empty deployment
- [ ] `convex/schema.ts` defines all 14 entities with `workspaceId` everywhere it belongs
- [ ] Every index is declared on the schema; no unindexed queries
- [ ] `npx convex run seed:seed` populates the demo workspace
- [ ] Data isolation tests pass (queries can't cross workspaces)
- [ ] No UI changes; the app still reads from `lib/mock/`

---

### Phase 3 — Auth & SSR (Better Auth + Convex)

> **Milestone:** users must sign in to use the app. Real sessions, real workspaces, but data is still mock. Closed-beta-ready: invite a handful of users, they can log in, switch workspaces, and use every page — but state doesn't persist across the database boundary (it's still `lib/mock/` + the auth layer is real, with sessions stored in Convex via Better Auth's Convex adapter).

**3.1 Better Auth setup**
- `better-auth` v1.x with the Convex adapter (sessions stored in Convex `sessions` table)
- Magic link (Resend / Postmark) + Google OAuth providers
- `lib/auth/server.ts` — `betterAuth({...})` config; `lib/auth/client.ts` — `createAuthClient()` for React
- `app/api/auth/[...all]/route.ts` — Next.js route handler that Better Auth owns
- Convex function `convex/auth.ts` reads `ctx.auth.getSession()` from the cookie forwarded by Better Auth
- `app/(auth)/login`, `app/(auth)/signup`, `app/(auth)/invite/[token]` routes with the same Linear-style visual language

**3.2 Workspace switcher**
- TopBar component: `WorkspaceSwitcher` with avatar + name + chevron
- `?w=...` URL param drives the active workspace; `useWorkspace()` hook reads it
- "Create workspace" flow from the switcher (gated to authenticated users)
- Memberships fetched via Convex query `memberships:listForUser`

**3.3 SSR with auth**
- `(workspace)/layout.tsx` becomes a server component: calls Better Auth's `getSession()`, redirects to `/login` if missing
- All routes inside `(workspace)/` are server-rendered; no client-side redirect flicker
- `loading.tsx` skeletons for every route (paired with Convex's reactive queries in Phase 4)
- `error.tsx` page-level boundaries (still in mock-data mode; Sentry wiring lands in Phase 4)

**3.4 Session & account**
- `useUser()` hook reads Better Auth's session client-side; replaces `ME_ID` constant everywhere
- `/settings/account`: profile (name, avatar, email), sessions list, "Sign out everywhere", "Delete account"
- `getCurrentUser()` server helper used in every server component
- Convex functions get the user via `getAuthUserId(ctx)` from Better Auth's Convex plugin

**3.5 First-pass deploy (skeleton)**
- Vercel project (or equivalent); Convex auto-deploys on push to main
- Sentry DSN wired (errors start landing even before the real backend lands)
- `.env.example` checked in with `CONVEX_DEPLOY_KEY`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`
- One preview deploy per PR (Convex preview deployment auto-created)

**Acceptance criteria:**
- [ ] Signup → email magic link → workspace creation → log in works end-to-end
- [ ] Google OAuth login works
- [ ] Invite link → new user joins existing workspace
- [ ] All `(workspace)/*` routes redirect to `/login` when unauthenticated
- [ ] `ME_ID` constant removed from codebase; `useUser()` returns the session user
- [ ] Workspace switcher in TopBar; `?w=...` URL param works
- [ ] Vercel preview deploys per PR; Convex preview deployment created; Sentry catching errors

---

### Phase 4 — Convex queries & mutations

> **Milestone:** every mutation in the UI hits a real Convex function against the schema from Phase 2. RBAC enforced. The app is now a real multi-tenant backend. State survives reloads, is shared across users, and respects permissions. This is the GA-ready backend — closed-beta can promote to open-beta after this lands. No server actions layer, no TanStack Query — Convex's `useQuery` / `useMutation` replace both, with optimistic updates built in.

**4.1 Convex functions wrapping `apply()`'s UI contract**
- Every existing call site (`setStatus`, `setPriority`, `bulkArchive`, `reorderIssues`, `addIssue`, `setTitle`, `setDescription`, …) becomes a Convex mutation in `convex/issues.ts`, `convex/cycles.ts`, etc.
- `apply()`'s public shape unchanged: `apply({message, detail, affectedIds, undo, retry, viewAction})` — but `undo`/`retry` now invoke Convex mutations
- Convex's `mutation({ handler, args })` validators are the input schemas (shared client/server via `convex/_generated/`)
- `pending` set in client cache before mutation, cleared on success, restored on error (Convex mutations are already optimistic)
- `lastError` populated on failure with `{op, message, retry}`

**4.2 Reactive queries replace the server state layer**
- `useIssues` is replaced with `useQuery(api.issues.list, { workspaceId, filter, group, sort })` from `convex/react`
- Convex queries are reactive: any mutation that touches the result automatically re-runs the query — no `queryClient.invalidateQueries` plumbing
- Optimistic updates via Convex's `useMutation` with the `optimisticUpdate` field
- `useUI` (density, commandOpen, drawerIssueId, selection) stays local — per-tab
- `useSavedViews` migrates from localStorage to Convex per user
- React Suspense boundaries around every data hook; `loading.tsx` skeletons
- No TanStack Query, no separate cache, no invalidation rules — Convex owns all of it

**4.3 Authorization / RBAC**
- `can(user, action, resource)` helper in `convex/rbac.ts`: `canEdit`, `canArchive`, `canInvite`, `canManageBilling`
- Every Convex mutation re-checks permission via `requireRole(ctx, workspaceId, "admin")` (never trust the client)
- Drawer actions gated on permission client-side for UX; bulk actions refuse to run for unauthorised IDs (with a toast)
- `<RoleGate role="admin">` component for settings screens
- Audit log: every Convex mutation writes to `activities` (who, what, when, before/after)

**4.4 Multi-tenant data access**
- All Convex queries/mutations scoped by `workspaceId` from the session; `requireWorkspace(ctx, workspaceId)` is the standard preamble
- Switching workspace invalidates everything automatically (different `workspaceId` arg → different query result)
- Cross-workspace sharing only via explicit invite (no "share by URL" until Phase 7)

**4.5 Real mutations end-to-end**
- Every page reads from Convex (no more `ISSUES` constant from `lib/mock/`)
- `apply()` retry: mutation can be re-attempted; the toast UI already supports this
- Pending state visible: rows pulse, drawer shows a thin progress bar
- Undo: re-fires the inverse Convex mutation; selection restored from `prevSelected`

**4.6 Full deploy & CI**
- Convex auto-deploys on push to main; preview deployments per PR
- "View as user" impersonation for debugging (admin can switch identity in Convex dashboard)
- CI gates: typecheck, lint, unit tests, E2E signup→create→close flow
- Sentry release tags; source maps uploaded
- Production deploy gated on green main; rollback to previous Convex deployment one click

**Acceptance criteria:**
- [ ] Every existing `apply()` call site routes through a Convex mutation
- [ ] `useIssues` is replaced with `useQuery(api.issues.list, ...)`; `useUI` stays local
- [ ] No TanStack Query in the codebase; no manual cache invalidation
- [ ] `can(user, action, resource)` enforces RBAC on both client and server
- [ ] `ISSUES` constant from `lib/mock/` is gone; data flows from Convex
- [ ] Mutation → optimistic UI → server confirm → pending cleared (or error surfaced)
- [ ] Convex preview deployment per PR; "View as user" impersonation works
- [ ] Sentry source maps uploaded; release tags wired
- [ ] E2E test: signup → create project → create issue → assign → close passes

---

### Phase 5 — Live & resilience

> Phase 4 gave us a real backend; Phase 5 makes it feel alive. Every interaction is fast, every failure is graceful, every device works.

**5.1 Real-time (mostly already there from Convex)**
- Convex's reactive `useQuery` already gives live updates — most of this section is "now make the UI take advantage of it"
- Presence: "Alice is viewing ENG-1234" with avatar in drawer header — Convex `presence` table + heartbeat pattern
- Live updates: another user's status flip appears in your list within ~100ms (Convex subscription latency)
- Conflict resolution: last-write-wins on title/description with a "X edited this 3s ago" toast (Convex's `updatedAt` is the source of truth)

**5.2 Live activity feed in Inbox**
- `notifications` table populated by Convex mutations (issue assigned, status changed, mentioned, commented)
- Inbox page streams new items via reactive `useQuery`; unread badge updates without refresh
- Mark-read (single + bulk), snooze (re-surfaces at a time), archive

**5.3 Optimistic concurrent edits on issue description**
- Convex has a CRDT option for collaborative editing (`convex crdt`); use it for description
- Avatar stack in drawer header for everyone with the drawer open
- "Alice is typing…" indicator via Convex presence

**5.4 Search backend (Convex vector search)**
- `vq.filter.search` is a JS `.includes()`; replace with Convex vector search (`defineVectorIndex` in schema)
- Embeddings generated server-side on issue create/update via Convex action calling OpenAI
- `/search` route: faceted results (project, status, assignee, label, date) + semantic similarity
- Highlighting in result titles via Convex's built-in vector search ranking
- (No Meilisearch or Postgres FTS needed — Convex's vector index is enough for our scale)

**5.5 Page-level error boundaries**
- `app/(workspace)/error.tsx` per segment; `app/global-error.tsx` for unrecoverable
- `error.tsx` shows: "Something went wrong. [Retry] [Reload] [Report]"
- Sentry capture on every boundary trigger

**5.6 Telemetry & observability**
- Sentry: error tracking, performance (transactions), release health (already wired in Phase 4; expanded here)
- Analytics: PostHog or Plausible for product analytics (page views, funnels, feature flags)
- RUM: Web Vitals reported to Sentry
- Server logs structured (JSON), shipped to a log aggregator (Axiom / Logflare)

**5.7 Security headers & rate limiting**
- CSP (no inline scripts, no eval, frame-ancestors 'none')
- CSRF: Convex HTTP actions validate same-origin + Origin header check; Better Auth's CSRF token on all `/api/auth/*` routes
- Rate limiting: per-IP and per-user on auth, create, bulk ops (Upstash or `@vercel/edge-rate-limit`)
- HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Audit log retention policy: 90 days hot, 2 years cold

**5.8 Mobile & responsive design**
- Breakpoint strategy: `< 640px` mobile, `640–1024px` tablet, `> 1024px` desktop
- PrimaryNav collapses to bottom tab bar on mobile (< 640px)
- Drawer becomes full-screen sheet on mobile
- List rows: density auto-compacts on narrow widths
- Touch targets ≥ 44px on mobile
- Tested in BrowserStack (or equivalent) on iOS Safari, Android Chrome

**5.9 Email & notifications**
- Transactional email: magic link (already in Phase 3), invite, assignment mention, due-soon digest
- Provider: Resend or Postmark (template syntax in `lib/email/`)
- Preferences per user (`/settings/notifications`): per-event opt-in
- Unsubscribe link in every email (one-click, no login)
- In-app notifications mirror email (read state synced)

**5.10 Activity log / audit trail**
- Every mutation writes `Activity` row: `{workspaceId, actorId, verb, objectType, objectId, before, after, createdAt}` (already in Phase 4; surfaced here)
- `/projects/[key]/activity` route: filtered, paginated
- Used by the Inbox feed and for compliance/enterprise sales

---

### Phase 6 — Search & AI

- Command bar with semantic + lexical (Convex vector search + OpenAI embeddings hybrid; vector index from Phase 5.4)
- `⌘K` "Ask: what did Alice ship this week?" → typed action; LLM returns a structured answer citing issue keys
- AI triage on the new-issue dialog: suggests project, labels, priority based on title; user accepts with one keystroke
- "Summarize this issue" action in the drawer (one click, no modal)
- Embedding generation: Convex action on issue create/update calling OpenAI; nightly refresh via Convex cron
- Per-workspace AI key (BYO OpenAI / Anthropic); not stored in our DB, only referenced
- Cost cap: hard ceiling per workspace; admin sees current spend in settings

---

### Phase 7 — Integrations

- GitHub PR ↔ issue linking: webhook → matches PR title/body to issue key → links with status (open/merged/closed); surfaces in the drawer
- Slack DM on assignment: message with deep link to issue
- Webhook receiver: outbound webhooks per event (`issue.created`, `issue.updated`, `comment.created`); per-workspace signing secret
- File uploads & attachments: S3 (or equivalent) with signed URLs; previews for images / PDFs
- Data export: CSV (issues, comments) and JSON (full workspace); generated async, emailed when ready
- Public API (REST) for the same mutations the UI uses; token-based auth; rate-limited

---

### Phase 8 — Launch

> Everything in earlier phases makes the product work. Phase 8 makes it shippable to paying customers.

**8.1 Accessibility (WCAG 2.2 AA)**
- axe audit on every route, every component
- Keyboard-only walkthrough script (already in Phase 1 DoD); all flows pass
- Screen reader test: VoiceOver + NVDA on the 6 most-used screens
- Color contrast verified for all text (not just body — chips, badges, dim labels)
- Focus management: every modal/drawer traps focus, restores on close
- Reduced motion: `prefers-reduced-motion` shortens springs to instant; layout still works

**8.2 Performance**
- Lighthouse > 95 on every route (perf, a11y, best-practices, SEO)
- Core Web Vitals: LCP < 1.2s, INP < 200ms, CLS < 0.05
- Bundle budget: route bundles < 200KB gz; vendor < 350KB gz
- Image optimisation: `next/image` everywhere; AVIF + WebP fallback
- Font subsetting: Geist variable, woff2 only, preload
- Virtualised lists for > 100 rows (already in plan, verify in implementation)

**8.3 Testing**
- Unit (Vitest): pure functions in `lib/state`, helpers, parsers
- Integration (Vitest + Testing Library): components with state
- E2E (Playwright): the 5 critical flows (signup → create project → create issue → assign → close)
- Visual regression (Playwright + snapshot): the 6 most-used screens, 3 densities, light + dark
- Mutation tests on `apply()`: every error branch reachable
- Coverage gate: 80% on `lib/`, 60% on `components/`

**8.4 Component library & docs**
- Storybook for every component: 3 states × 3 densities × light/dark
- Auto-generated prop tables (react-docgen)
- Published to Chromatic for visual review per PR
- Animate UI components: track upstream, periodic `sync` script, breaking-change review

**8.5 Billing**
- Stripe Checkout for self-serve (Free / Pro / Enterprise)
- Per-workspace subscription; seats counted by `Membership` rows
- `/settings/billing`: plan, invoices, payment method, cancel
- Webhook: subscription state → DB; downgrade to read-only on cancel
- Usage metering for AI features (Phase 6): metered billing line item

**8.6 Onboarding**
- First-run: workspace creation → first project → first issue → invite teammate (5 steps, dismissible)
- Per-page empty states with a single CTA ("Create your first issue")
- Sample workspace import (one click: 50 demo issues across 3 projects)
- Checklist in TopBar for the first 7 days (X/Y completed)
- "What's new" toast on each release

**8.7 i18n & l10n**
- All UI text in `messages/en.json` (and other locales); `next-intl` for routing
- Locales: en (default), de, fr, es, ja, pt-BR at GA; more on request
- Date / number / relative-time formatting per locale
- RTL support (verify, even if not in v1 launch)
- Translatable strings never hardcoded; CI linter enforces (`no-hardcoded-strings`)

**8.8 GDPR & privacy**
- `/settings/privacy`: data export (full JSON), delete account (soft 30 days, hard after)
- Cookie consent banner (EU); "reject all" is one click
- Privacy policy + Terms of Service (legal review)
- DPA (Data Processing Agreement) for enterprise
- Audit log retained for 2 years (configurable per workspace)

**8.9 Theming (real light mode)**
- Light mode is a peer of dark, not a yellow filter
- Every OKLCH token has a light counterpart; tokens are media-query-driven
- User can override accent color (workspace setting); saved per user
- System preference auto-detected; manual override wins

**8.10 Backup & disaster recovery**
- Convex automatic daily backups, 14-day retention (Pro plan) — verified in Convex dashboard
- Point-in-time recovery via Convex's `convex import` from snapshot
- Quarterly restore drill (restore a snapshot to a sandbox project, run smoke tests)
- Off-site backup of S3 attachments (lifecycle: 30d → Glacier)
- Incident runbook (who pages whom, status page template)

**8.11 Browser support matrix**
- Chrome, Edge, Safari, Firefox (latest 2 versions)
- iOS Safari 17+, Android Chrome latest
- Graceful degradation: no `backdrop-filter` in Firefox < 103, no `oklch` in Safari < 15.4 — fall back to `hsl`
- `caniuse` check in CI; CSS validator

**8.12 Documentation**
- User docs: help center (Intercom / Notion), keyboard cheatsheet in-app, video walkthroughs
- Developer docs: API reference (OpenAPI from Convex HTTP actions), webhook recipes
- Internal: runbook for on-call, architecture decision records (ADRs)
- CHANGELOG.md auto-generated from commits; release notes per version

**8.13 Marketing & launch readiness**
- Landing page: hero, 3-feature grid, keyboard demo GIF, pricing
- Status page (status.rejira.app): uptime, incident history
- Security page: disclosure policy, bug bounty
- Onboarding emails (drip, 7 emails over 14 days)
- Launch checklist: legal, support, billing, observability, rollback plan

---

## Design tokens (initial values)

```css
/* Color (OKLCH for perceptual uniformity) */
--color-bg              oklch(0.16 0.005 250);
--color-surface-1       oklch(0.19 0.006 250);
--color-surface-2       oklch(0.22 0.007 250);
--color-surface-3       oklch(0.26 0.008 250);
--color-overlay         oklch(0.10 0.004 250 / 0.6);
--color-border          oklch(1 0 0 / 0.08);
--color-border-strong   oklch(1 0 0 / 0.14);
--color-text            oklch(0.98 0.002 250);
--color-text-muted      oklch(0.72 0.005 250);
--color-text-subtle     oklch(0.55 0.005 250);
--color-accent          oklch(0.72 0.18 40);     /* warm amber, not Jira blue */
--color-accent-fg       oklch(0.16 0.005 250);
--color-success         oklch(0.78 0.16 150);
--color-warning         oklch(0.82 0.15 80);
--color-danger          oklch(0.68 0.20 25);

/* Priority colors (used in icons + chips) */
--color-prio-urgent     oklch(0.68 0.20 25);
--color-prio-high       oklch(0.78 0.16 50);
--color-prio-medium     oklch(0.78 0.10 90);
--color-prio-low        oklch(0.70 0.04 250);
--color-prio-none       oklch(0.55 0.005 250);

/* Status colors (workflow) */
--color-status-backlog  oklch(0.55 0.005 250);
--color-status-todo     oklch(0.72 0.10 250);
--color-status-progress oklch(0.78 0.16 200);
--color-status-review   oklch(0.78 0.16 300);
--color-status-done     oklch(0.78 0.16 150);
--color-status-cancel   oklch(0.50 0.005 250);

/* Type scale */
--font-sans             "Geist", ui-sans-serif, system-ui;
--font-mono             "Geist Mono", ui-monospace, monospace;
--font-display          "Geist", ui-sans-serif;
--text-xs               11px / 16px;
--text-sm               12px / 18px;
--text-base             13px / 20px;
--text-md               14px / 22px;
--text-lg               16px / 24px;
--text-xl               20px / 28px;
--text-2xl              24px / 32px;
--text-3xl              32px / 40px;

/* Spacing (8pt) */
--space-1               4px;   /* half-step for inline rhythm */
--space-2               8px;
--space-3               12px;
--space-4               16px;
--space-5               20px;
--space-6               24px;
--space-8               32px;
--space-10              40px;
--space-12              48px;

/* Radii */
--radius-sm             4px;
--radius-md             6px;
--radius-lg             8px;
--radius-xl             12px;

/* Shadows (subtle, layered) */
--shadow-1              0 1px 0 0 oklch(0 0 0 / 0.2), 0 1px 3px 0 oklch(0 0 0 / 0.3);
--shadow-2              0 4px 12px -2px oklch(0 0 0 / 0.4);
--shadow-popover        0 8px 24px -4px oklch(0 0 0 / 0.5);

/* Motion */
--ease-spring           cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring-bounce    cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-micro        120ms;
--duration-enter        220ms;
--duration-layout       320ms;
```

---

## Component inventory (Phase 0)

| Component | Source | Notes |
|---|---|---|
| `Button` | local + Animate UI motion wrapper | sizes: xs/sm/md, variants: primary/secondary/ghost/danger |
| `Input` | local | inline label, prefix/suffix slots |
| `Kbd` | local | monospace, 1px border, used in command palette hints |
| `Tooltip` | Animate UI primitive | 200ms delay, 8px arrow, instant on kbd |
| `Dialog` | Animate UI primitive | drawer variants: right, full, modal |
| `Avatar` | Animate UI | 6 sizes, status dot |
| `IconButton` | local | square, accessible name required |
| `Icon` | `@animate-ui/icons` | 24×24 default, 16 for inline |
| `StatusDot` | local | 4 workflow states + 2 neutral |
| `PriorityIcon` | local | 5 levels, no color in compact mode |
| `LabelChip` | local | rounded full, color = label hash |
| `DateChip` | local | relative + absolute on hover |
| `IssueKey` | local | mono, dim, `ENG-1234` |
| `Drawer` | Animate UI | 480/640/960 widths, right slide-in |
| `CommandPalette` | local + cmdk | grouped, ⌘K, fuzzy |
| `TopBar` | local | 48px tall, sticky |
| `PrimaryNav` | local | 56px wide, icon+label on hover, badges |
| `ViewHeader` | local | title, filters chip-row, view-as, share |
| `IssueRow` | local | 8 columns, virtualized |
| `EmptyState` | local | illustration slot, copy, CTA |
| `Skeleton` | local | shimmer, 1.2s loop |

---

## File layout

```
jira redesign/
  convex/                  (Convex backend — schema, functions, auth, rbac)        ← Phase 2-4
    schema.ts
    auth.ts
    rbac.ts
    issues.ts
    cycles.ts
    projects.ts
    notifications.ts
    activities.ts
    seed.ts
    _generated/            (auto-generated API types, committed)
  apps/
    web/
      app/
        (workspace)/
          layout.tsx
          inbox/page.tsx
          my-issues/page.tsx
          projects/
            [key]/
              issues/page.tsx
              cycles/[id]/page.tsx
              activity/page.tsx                                                  ← Phase 5
        (auth)/                                                                     ← Phase 3
          login/page.tsx
          signup/page.tsx
          invite/[token]/page.tsx
        api/
          auth/[...all]/route.ts    (Better Auth handler)                          ← Phase 3
        (marketing)/                                                                ← Phase 8
          page.tsx
          pricing/page.tsx
          legal/{terms,privacy}/page.tsx
        page.tsx            (redirect to /inbox)
        layout.tsx
        globals.css
      components/
        ui/                 (Animate UI components, copied)
        shell/              (TopBar, PrimaryNav, CommandPalette, WorkspaceSwitcher ← Phase 3)
        issue/              (IssueRow, IssueDrawer, IssueProperties)
        views/              (GroupedList, CycleBoard, FilterPopover, BulkActionBar)
        primitives/         (Button, Input, Kbd, etc.)
        icons/              (re-exports of @animate-ui/icons)
      lib/
        motion/variants.ts
        a11y/focus.ts
        mock/               (issues.ts, users.ts, projects.ts) — used by convex/seed.ts in Phase 2
        state/              (Zustand stores: useUI stays local; useIssues → useQuery in Phase 4)
        auth/               (Better Auth client + server config)                  ← Phase 3
        email/              (transactional templates, send helpers)                ← Phase 5
        observability/      (Sentry, PostHog, RUM helpers)                         ← Phase 5
        i18n/               (next-intl config, message catalogs)                   ← Phase 8
        utils/              (cn, formatDate, etc.)
      package.json
      tsconfig.json
      next.config.ts
      postcss.config.mjs
  ARCHITECTURE_13_LAYERS.md
  JIRA_PAIN_POINTS_REPORT.md
  PLAN.md
  PHASE_1_PLAN.md
  package.json             (root, with workspaces)
  pnpm-workspace.yaml
  biome.json
  .gitignore
  README.md
```

---

## Acceptance criteria

> Each phase has a detailed plan in `PHASE_N_PLAN.md` with workstreams, file-level changes, and DoD. `PHASE_1_PLAN.md` is the template.

### Phase 0 ✅
- [x] `pnpm dev` (or `npm run dev`) starts on `:3000` with no errors
- [x] `/inbox`, `/my-issues`, `/projects/ENG/issues`, `/projects/ENG/cycles/23` all render with mock data
- [x] `⌘K` opens the command palette, fuzzy-searches across issues and navigation
- [x] Clicking an issue row opens the right-side drawer
- [x] The drawer is keyboard-dismissable (`Esc`)
- [x] Status can be changed with `1`-`5` keys while focused on a row
- [x] All colors, fonts, and motion come from the token system
- [x] No lucide-react, no Tailwind v3 syntax, no `framer-motion` import (use `motion/react`)
- [x] Build (`pnpm build`) passes with zero errors

### Phase 1 ✅
- [x] Every state change flows through `apply()` and is revertible via toast
- [x] Every list view's filters are encoded in the URL and survive reload
- [x] Density change is visible (status-bar flash + URL param + first-paint animation)
- [x] Any list row can be reordered by drag; any board card can be moved across columns by drag
- [x] Multi-select bar appears for any list; bulk actions are undoable
- [x] `tsc --noEmit` clean, `next build` clean (10 static + 2 dynamic routes)
- [x] 39 screenshots regenerated (3 densities × 10 routes + 9 special captures)

### Phase 2 (Data layer — Convex)
- [ ] Convex project created; `npx convex dev` runs locally; dashboard accessible
- [ ] `convex/schema.ts` defines all 14 entities with `workspaceId` everywhere it belongs
- [ ] Every index declared on the schema; no unindexed queries
- [ ] `npx convex run seed:seed` populates the demo workspace
- [ ] Data isolation tests pass (queries can't cross workspaces)
- [ ] No UI changes; the app still reads from `lib/mock/`

### Phase 3 (Auth & SSR — Better Auth)
- [ ] Signup → email magic link (Resend) → workspace creation → log in works end-to-end
- [ ] Google OAuth login works
- [ ] Invite link → new user joins existing workspace
- [ ] All `(workspace)/*` routes redirect to `/login` when unauthenticated
- [ ] `ME_ID` constant removed; `useUser()` returns the Better Auth session user
- [ ] Workspace switcher in TopBar; `?w=...` URL param works
- [ ] Vercel preview deploys per PR; Convex preview deployment created; Sentry catching errors
- [ ] `tsc --noEmit` clean, `next build` clean

### Phase 4 (Convex queries & mutations)
- [ ] Every existing `apply()` call site routes through a Convex mutation
- [ ] `useIssues` is replaced with `useQuery(api.issues.list, ...)`; `useUI` stays local
- [ ] No TanStack Query in the codebase; no manual cache invalidation
- [ ] `can(user, action, resource)` enforces RBAC on both client and server (via `requireRole` in mutations)
- [ ] `ISSUES` constant from `lib/mock/` is gone; data flows from Convex
- [ ] Mutation → optimistic UI → server confirm → pending cleared (or error surfaced)
- [ ] Convex preview deployment per PR; "View as user" impersonation works
- [ ] Sentry source maps uploaded; release tags wired
- [ ] E2E test: signup → create project → create issue → assign → close passes

### Phase 5 (Live & resilience)
- [ ] Real-time presence shows other viewers in the drawer header within 1s (Convex reactive queries)
- [ ] Inbox streams new notifications without refresh
- [ ] Concurrent description edits resolve without lost work (Convex CRDT)
- [ ] `/search` returns relevant results in < 300ms across 10k issues (Convex vector index)
- [ ] Page-level error boundaries catch and report; user sees retry
- [ ] Sentry catches all unhandled errors; alerts wired
- [ ] Lighthouse a11y score > 95 on mobile
- [ ] Tested on iOS Safari 17+ and Android Chrome latest
- [ ] Transactional emails land in inbox (not spam); unsubscribe works

### Phase 6 (Search & AI)
- [ ] `⌘K` AI queries return cited, structured answers for 80% of test prompts
- [ ] AI triage on create-issue dialog reduces time-to-create by 30%
- [ ] Embedding pipeline runs nightly + on-write; index lag < 5 minutes
- [ ] Per-workspace AI cost cap enforced; admin sees spend

### Phase 7 (Integrations)
- [ ] GitHub PR ↔ issue linking: webhook → match → link within 30s
- [ ] Slack DM on assignment: message with deep link, no auth redirects
- [ ] Outbound webhooks fire for the 5 most common events; signing secret verified
- [ ] File upload (10MB image) completes and previews in < 3s
- [ ] CSV export of 1k issues completes in < 60s; emailed when ready
- [ ] Public API: 5 most-used mutations work via REST; rate-limited

### Phase 8 (Launch)
- [ ] WCAG 2.2 AA: axe 0 critical issues, screen reader test passes for 6 core screens
- [ ] Lighthouse > 95 on all routes (perf, a11y, best-practices, SEO)
- [ ] Core Web Vitals: LCP < 1.2s, INP < 200ms, CLS < 0.05
- [ ] Test coverage: 80% on `lib/`, 60% on `components/`; 5 critical E2E flows pass
- [ ] Storybook published; 3 densities × light/dark for every component
- [ ] Stripe Checkout: Free/Pro/Enterprise self-serve; webhook updates Convex; downgrade to read-only on cancel
- [ ] First-run onboarding: 5-step flow, dismissible; 7-day checklist
- [ ] i18n: 6 locales at GA; no hardcoded strings (CI enforced)
- [ ] GDPR: data export + account deletion (soft 30 days); cookie consent
- [ ] Real light mode: every token has a light counterpart; system preference auto-detected
- [ ] Convex daily snapshots; quarterly restore drill passes
- [ ] Browser support matrix: Chrome/Edge/Safari/Firefox latest 2; graceful degradation
- [ ] Landing page live; status page; security disclosure policy; launch checklist signed off
- [ ] Better Auth enterprise plugins enabled: SAML SSO, MFA (TOTP), passkeys, organization UI; admin sees audit log
