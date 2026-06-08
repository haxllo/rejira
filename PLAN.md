# PLAN.md — rejira (Jira Redesign)

> Linear-grade Jira redesign. **Stack: Next.js 16 + React 19 + Tailwind v4.3 + Motion 12 + Animate UI + Drizzle ORM + PostgreSQL (Supabase) + Better Auth + Supabase Realtime + Supabase Storage + pgvector.** Auth is Better Auth; the database, realtime, storage and vector engine are Supabase.

This is the **execution order** of the 9-phase rewrite. `ARCHITECTURE_13_LAYERS.md` defines the architecture; this document defines what gets built when, and the DoD at the end.

---

## 1. North star

> **Linear-grade speed, opinionated defaults, progressive disclosure, keyboard-first.**

Every decision is tested against this. If a feature slows the interaction budget or adds a config screen, it doesn't ship.

---

## 2. Visual direction (unchanged across stack pivots)

**Tone**: precise, editorial, quietly luxurious. Think Linear meets Stripe Press.
**Typography**: `Geist` (sans), `Geist Mono` (code), `Inter Display` fallback for big numerals.
**Color**: neutral-first OKLCH palette with a single warm accent. Dark mode is the default; light is a real alternative, not a yellow filter.
**Motion**: spring physics only. Durations: 120ms micro, 220ms enter, 320ms layout. No `ease-in-out` linear curves.
**Layout grid**: 8pt base. Density modes: Compact (28px row), Default (36px), Roomy (48px).
**Iconography**: `@animate-ui/icons` (24×24 stroke icons, 1.5px weight). No emoji in UI.
**Surfaces**: 5 levels (`bg`, `surface-1`, `surface-2`, `surface-3`, `overlay`). Borders are 1px at 8% alpha, never hard-coded hex.
**Focus ring**: 2px outline, accent color, 2px offset. Always visible on keyboard focus.

---

## 3. Information architecture (unchanged)

```
TopBar       — workspace switcher · global ⌘K · presence · profile
PrimaryNav   — Inbox (badge) · My Issues · Projects ▼ · Views · Cycles
View         — the page; varies by route
  ┌──────────────────────────────────────────────────┐
  │ ViewHeader    — title, filters, view-as, share  │
  ├──────────────────────────────────────────────────┤
  │ ViewBody                                       │
  │  ┌────────────┬─────────────────┬────────────┐  │
  │  │   List     │     Content     │  Drawer    │  │
  │  │ (resizable)│   (resizable)  │  (toggle)  │  │
  │  └────────────┴─────────────────┴────────────┘  │
  └──────────────────────────────────────────────────┘
StatusBar    — connectivity · build · keyboard cheatsheet toggle
```

The **Drawer is a peer of the list, not a child**. This is the key to making Jira feel like Linear: the list never goes away, the drawer slides in from the right with the issue context.

---

## 4. Stack lock-in (no more pivots after this)

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

> Rationale: Convex is an outstanding product but it was the wrong fit for this project. We needed a real Postgres (RLS, pgvector, pg_cron, branching, PITR) and a real auth framework with first-class TypeScript ergonomics. Better Auth + Supabase gives us both with one database, one ORM, one migration story.

---

## 5. Routes (Phase 0–8, unchanged)

| Route | Purpose | Notes |
|---|---|---|
| `/inbox` | Notifications + assignments | Live feed, mark-read, snooze |
| `/my-issues` | Issues where I am assignee / watcher / author | Quick filters, group by status |
| `/projects/[key]` | Project landing | Recent activity, members, settings entry |
| `/projects/[key]/issues` | Default issue list | The workhorse view |
| `/projects/[key]/cycles/[id]` | Cycle board | Kanban within a cycle |
| `/projects/[key]/roadmap` | Timeline | Gantt-lite |
| `/projects/[key]/activity` | Audit log | Phase 5 |
| `/views/[id]` | Custom saved view | Filters, sort, group, share |
| `/search` | Search results | Faceted, with `⌘K` quick switcher |
| `/settings/*` | Workspace, members, billing, integrations | Phase 3+ |
| `/sign-in` `/sign-up` `/invite/[token]` | Auth flows | Phase 3 |
| `/onboarding` | Post-signup wizard | Phase 3 |

---

## 6. Phases

### Phase 0 — Foundation ✅

**Goal**: a runnable Next.js app with the design system and the primary nav skeleton, demonstrating 3 of the most-important screens with mock data.

**Status**: complete.

### Phase 1 — Interactions ✅

Optimistic mutations with rollback, URL-synced filters, density toggle, drag-to-reorder, multi-select + bulk action bar, toast undo window, `lastError` global subscription, all routes URL-synced.

**Status**: complete.

### Phase 2 — Data layer (Supabase Postgres + Drizzle) 📌

**See `PHASE_2_PLAN.md`.**

> **Milestone:** a real, multi-tenant, multi-workspace PostgreSQL backend hosted on Supabase, with Drizzle ORM, Row Level Security on every table, Supabase Storage buckets for avatars/attachments, Supabase Realtime publication for live updates, pgvector enabled for the Phase 6 search index, and a pg_cron schedule for nightly housekeeping. The app still reads from `lib/mock/`; Supabase is parallel infrastructure with no UI changes. This phase is unblockable — no dependencies on auth, API, or UI. **This is where we are starting.**

Production-grade: 13 SQL migrations, RLS policies for every table, storage RLS, realtime publication, seed data, branching, CI gates. **Not minimal.**

### Phase 3 — Auth & Identity (Better Auth + Supabase) 📌

**See `PHASE_3_PLAN.md`.**

> **Milestone:** users sign in to use the app. Real sessions in Postgres via Better Auth, real workspaces (Better Auth organization plugin mapped to our `workspaces` table), real invites, real 2FA, real OAuth, real audit log, real GDPR delete. Closed-beta-ready: invite a handful of users, they can log in, switch workspaces, and use every page — but state still doesn't persist across the database boundary (the app still reads `lib/mock/` until Phase 4). Phase 3 is the security-phase: every stream ships behind a passing test suite.

Production-grade: Better Auth core + organization + twoFactor + magicLink + admin plugins; pg.Pool to Supabase; Resend transport with ConsoleTransport fallback; per-endpoint rate limits; CSRF + origin checks; session cookie cache (JWE); IP tracking with proxy header support; audit log via database hooks; 30-day soft-delete then pg_cron hard-delete; HIBP password breach check; full sign-in surface (email/password, magic link, Google, GitHub); accessibility (axe-core, keyboard-only) and i18n for emails. **Not minimal.**

### Phase 4 — App data layer (Drizzle queries & mutations)

> **Milestone:** every mutation in the UI hits a real Postgres function behind Drizzle. RBAC enforced at the RLS layer. The app is now a real multi-tenant backend. State survives reloads, is shared across users, respects permissions, and the realtime channel keeps everyone in sync. This is the GA-ready backend — closed-beta can promote to open-beta after this lands.

- 4A — Drizzle queries (issues, projects, cycles, labels, memberships)
- 4B — Drizzle mutations (replace `apply()` with transactional writes)
- 4C — Comments, notifications, saved views
- 4D — Activity / audit log writes from every mutation (via Postgres triggers + Drizzle)
- 4E — Realtime subscription wiring (`supabase.channel(...).on('postgres_changes', ...)`)
- 4F — Optimistic UI via Drizzle + `useOptimistic` (RSC) + client cache invalidation
- 4G — Cleanup: `lib/mock/` is deleted; only types remain for the seed
- 4H — pgTAP test suite: RLS enforcement + cross-tenant denial (CI gate)

### Phase 5 — Live & resilience

- 5.1 — Supabase Realtime: presence, live issue updates, conflict resolution
- 5.2 — Live activity feed in Inbox
- 5.3 — Optimistic concurrent edits on issue description (Yjs + Supabase Realtime Broadcast)
- 5.4 — Search backend (pgvector + `tsvector` hybrid; see Phase 6)
- 5.5 — Page-level error boundaries
- 5.6 — Telemetry & observability (Sentry + PostHog + Axiom)
- 5.7 — Security headers & rate limiting (Vercel middleware + Upstash Redis)
- 5.8 — Mobile & responsive design
- 5.9 — Email & notifications
- 5.10 — Activity log / audit trail surface

### Phase 6 — Search & AI

- pgvector embeddings on issue create/update via pg_net → external embedding service (OpenAI or self-hosted)
- Hybrid search: BM25 on `tsvector` + cosine similarity on embeddings
- ⌘K semantic + lexical
- AI triage on new-issue dialog
- "Summarize this issue" action
- Per-workspace AI key (BYO OpenAI / Anthropic); not stored in our DB, only referenced
- Cost cap: hard ceiling per workspace; admin sees current spend in settings

### Phase 7 — Integrations

- GitHub PR ↔ issue linking: webhook → matches PR title/body to issue key → links with status
- Slack DM on assignment
- Outbound webhooks per event (`issue.created`, `issue.updated`, `comment.created`); per-workspace signing secret
- File uploads & attachments: Supabase Storage with signed URLs; previews for images / PDFs
- Data export: CSV (issues, comments) and JSON (full workspace); generated async, emailed when ready
- Public API (REST) for the same mutations the UI uses; token-based auth; rate-limited

### Phase 8 — Launch

- 8.1 — Accessibility (WCAG 2.2 AA)
- 8.2 — Performance (Lighthouse > 95, LCP < 1.2s, INP < 200ms, CLS < 0.05)
- 8.3 — Testing (Vitest + Playwright + pgTAP, 80% lib coverage, 60% components)
- 8.4 — Storybook + Chromatic
- 8.5 — Stripe billing (Free / Pro / Enterprise), webhook updates Drizzle
- 8.6 — First-run onboarding (5-step wizard + 7-day checklist)
- 8.7 — i18n & l10n (`next-intl`, 6 locales at GA)
- 8.8 — GDPR & privacy (data export, soft 30-day delete, cookie consent, DPA)
- 8.9 — Theming (real light mode, per-workspace accent)
- 8.10 — Backup & disaster recovery (Supabase PITR, quarterly restore drill, S3 lifecycle)
- 8.11 — Browser support matrix
- 8.12 — Documentation (user docs, dev docs, ADRs, CHANGELOG)
- 8.13 — Marketing & launch readiness (landing, status page, security disclosure, drip emails)

---

## 7. Design tokens (initial values)

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
--color-accent          oklch(0.72 0.18 40);
--color-accent-fg       oklch(0.16 0.005 250);
--color-success         oklch(0.78 0.16 150);
--color-warning         oklch(0.82 0.15 80);
--color-danger          oklch(0.68 0.20 25);

--color-prio-urgent     oklch(0.68 0.20 25);
--color-prio-high       oklch(0.78 0.16 50);
--color-prio-medium     oklch(0.78 0.10 90);
--color-prio-low        oklch(0.70 0.04 250);
--color-prio-none       oklch(0.55 0.005 250);

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
--space-1               4px;
--space-2               8px;
--space-3               12px;
--space-4               16px;
--space-5               20px;
--space-6               24px;
--space-8               32px;
--space-10              40px;
--space-12              48px;

--radius-sm             4px;
--radius-md             6px;
--radius-lg             8px;
--radius-xl             12px;

--shadow-1              0 1px 0 0 oklch(0 0 0 / 0.2), 0 1px 3px 0 oklch(0 0 0 / 0.3);
--shadow-2              0 4px 12px -2px oklch(0 0 0 / 0.4);
--shadow-popover        0 8px 24px -4px oklch(0 0 0 / 0.5);

--ease-spring           cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring-bounce    cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-micro        120ms;
--duration-enter        220ms;
--duration-layout       320ms;
```

---

## 8. Component inventory (Phase 0)

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

## 9. File layout

```
jira redesign/
  apps/
    web/
      app/
        (auth)/                                                                     ← Phase 3
          sign-in/page.tsx
          sign-up/page.tsx
          invite/[token]/page.tsx
        (workspace)/
          layout.tsx
          inbox/page.tsx
          my-issues/page.tsx
          projects/[key]/{issues,cycles,roadmap,activity}/page.tsx
          views/[id]/page.tsx
          search/page.tsx
          settings/{account,workspace,members,billing}/page.tsx
          onboarding/page.tsx                                                       ← Phase 3
        api/
          auth/[...all]/route.ts    (Better Auth handler)                            ← Phase 3
        layout.tsx
        globals.css
      components/
        ui/                 (Animate UI components, copied)
        shell/              (TopBar, PrimaryNav, CommandPalette, WorkspaceSwitcher)   ← Phase 3
        issue/              (IssueRow, IssueDrawer, IssueProperties)
        views/              (GroupedList, CycleBoard, FilterPopover, BulkActionBar)
        primitives/         (Button, Input, Kbd, etc.)
        icons/              (re-exports of @animate-ui/icons)
        auth/               (SignInForm, TwoFactorSetup, InviteAccept, ...)         ← Phase 3
      lib/
        motion/variants.ts
        a11y/focus.ts
        mock/               (issues.ts, users.ts, projects.ts) — Phase 4 deletes data, keeps types
        state/              (Zustand stores: useUI stays local; useIssues → Drizzle in Phase 4)
        auth/               (Better Auth client + server config)                     ← Phase 3
        db/                                                                          
          client.ts         (Drizzle client — pg.Pool)                                ← Phase 2
          schema/           (Drizzle table definitions)                               ← Phase 2
          migrations/       (generated SQL via drizzle-kit)                           ← Phase 2
          rls/              (raw SQL for RLS policies, applied via migration)        ← Phase 2
          seed.ts           (idempotent demo data)                                    ← Phase 2
        supabase/           (browser/server/middleware clients for Realtime + Storage)← Phase 2
        email/              (transactional templates, Resend transport)               ← Phase 3
        observability/      (Sentry, PostHog, RUM helpers)                            ← Phase 5
        i18n/               (next-intl config, message catalogs)                      ← Phase 3
        utils/              (cn, formatDate, etc.)
        validation/         (Zod schemas shared client/server)                        ← Phase 2
      emails/               (React Email templates)                                    ← Phase 3
      tests/                (Vitest + Playwright + pgTAP)                              ← Phase 2
      package.json
      tsconfig.json
      next.config.ts
      postcss.config.mjs
  supabase/                (Supabase CLI local dev — committed)                       ← Phase 2
    config.toml
    migrations/            (mirror of apps/web/lib/db/migrations for `supabase db push`)
    seed.sql               (alternative SQL seed for the Supabase dashboard)
    functions/             (Supabase Edge Functions, if any land)
  scripts/                 (build, screenshots, CI helpers)
  .github/
    workflows/
      ci.yml               (typecheck + lint + vitest + playwright + pgTAP + supabase db lint)
      deploy.yml           (Vercel + Supabase Branching promotion)
  ARCHITECTURE_13_LAYERS.md
  JIRA_PAIN_POINTS_REPORT.md
  PLAN.md                  (this file)
  PHASE_2_PLAN.md
  PHASE_3_PLAN.md
  package.json             (root, with workspaces)
  .env.example             (DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, ...)
  biome.json
  .gitignore
  README.md
```

---

## 10. Acceptance criteria

> Each phase has a detailed plan in `PHASE_N_PLAN.md` with workstreams, file-level changes, and DoD. **`PHASE_2_PLAN.md` and `PHASE_3_PLAN.md` are the current focus** and are intentionally production-grade, not minimal.

### Phase 0 ✅
- [x] `npm run dev` starts on `:3000` with no errors
- [x] `/inbox`, `/my-issues`, `/projects/ENG/issues`, `/projects/ENG/cycles/23` all render with mock data
- [x] `⌘K` opens the command palette, fuzzy-searches across issues and navigation
- [x] Clicking an issue row opens the right-side drawer
- [x] The drawer is keyboard-dismissable (`Esc`)
- [x] Status can be changed with `1`-`5` keys while focused on a row
- [x] All colors, fonts, and motion come from the token system
- [x] No lucide-react, no Tailwind v3 syntax, no `framer-motion` import (use `motion/react`)
- [x] Build (`npm run build`) passes with zero errors

### Phase 1 ✅
- [x] Every state change flows through `apply()` and is revertible via toast
- [x] Every list view's filters are encoded in the URL and survive reload
- [x] Density change is visible (status-bar flash + URL param + first-paint animation)
- [x] Any list row can be reordered by drag; any board card can be moved across columns by drag
- [x] Multi-select bar appears for any list; bulk actions are undoable
- [x] `tsc --noEmit` clean, `next build` clean
- [x] 39 screenshots regenerated

### Phase 2 (Data layer — Supabase + Drizzle) — see `PHASE_2_PLAN.md`

### Phase 3 (Auth & Identity — Better Auth) — see `PHASE_3_PLAN.md`

### Phase 4 (Drizzle queries & mutations)
- [ ] Every existing `apply()` call site routes through a Drizzle transaction
- [ ] `useIssues` is replaced with `useLiveQuery(issuesQuery, ...)`; `useUI` stays local
- [ ] No TanStack Query; no manual cache invalidation; Supabase Realtime owns live updates
- [ ] RLS policies enforce workspace isolation on every query (pgTAP proves it)
- [ ] `ISSUES` constant from `lib/mock/` is gone; data flows from Postgres
- [ ] Mutation → optimistic UI → server confirm → pending cleared (or error surfaced)
- [ ] Vercel + Supabase Branching preview per PR; Sentry catching errors
- [ ] E2E test: signup → create workspace → create project → create issue → assign → close passes

### Phase 5 (Live & resilience)
- [ ] Realtime presence shows other viewers in the drawer header within 1s
- [ ] Inbox streams new notifications without refresh
- [ ] Concurrent description edits resolve without lost work (Yjs + Realtime Broadcast)
- [ ] `/search` returns relevant results in < 300ms across 10k issues (pgvector + tsvector hybrid)
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
- [ ] Stripe Checkout: Free/Pro/Enterprise self-serve; webhook updates Postgres; downgrade to read-only on cancel
- [ ] First-run onboarding: 5-step flow, dismissible; 7-day checklist
- [ ] i18n: 6 locales at GA; no hardcoded strings (CI enforced)
- [ ] GDPR: data export + account deletion (soft 30 days); cookie consent
- [ ] Real light mode: every token has a light counterpart; system preference auto-detected
- [ ] Supabase PITR enabled; quarterly restore drill passes
- [ ] Browser support matrix: Chrome/Edge/Safari/Firefox latest 2; graceful degradation
- [ ] Landing page live; status page; security disclosure policy; launch checklist signed off
- [ ] Better Auth enterprise plugins enabled: SAML SSO, MFA (TOTP), passkeys, organization UI; admin sees audit log
