# Jira Redesign — 13-Layer System Architecture (v2)

> **Status**: v2 — rewritten from the original folder-listing into a true layered system.
> **Stack target**: Next.js 15.5 + React 19 + Tailwind v4.3 + Motion 12 + Animate UI + Drizzle + Auth.js v5 + Socket.io.
> **Principles**: Linear-grade speed, opinionated defaults, progressive disclosure, keyboard-first.

---

## What changed vs v1

The original doc listed folders. v2 defines **layers with strict contracts, ownership, and dependencies**. A layer can only depend on the layer directly below it. No layer may skip ahead. This is the only way 13 layers stay coherent instead of collapsing into a tangle.

```
┌──────────────────────────────────────────────────────────────┐
│  L13  Observability & Compliance   (audit, traces, GDPR)     │
│  L12  Background Workers & Jobs    (queues, cron)            │
│  L11  Integration Adapters         (GitHub, Slack, Figma)    │
│  L10  AI & Intelligence            (triage, summarize, cmdK) │
│  L9   Notifications & Presence     (push, email, in-app)     │
│  L8   Search & Indexing            (lexical + semantic)      │
│  L7   Realtime Engine              (Socket.io, CRDT lite)    │
│  L6   Auth, Identity & Permissions (Auth.js v5, RBAC)        │
│  L5   Data & Persistence           (Drizzle, Postgres, S3)   │
│  L4   Domain Services              (Issue, Project, Cycle)   │
│  L3   API Surface                  (tRPC + Server Actions)   │
│  L2   Client State                 (TanStack Query, Zustand) │
│  L1   Presentation                 (Next.js, Animate UI)     │
└──────────────────────────────────────────────────────────────┘
        ▲  Dependency direction flows downward only.   ▼
```

**Removed from v1** (folded into stronger layers): "File Storage" (→ L5), "Analytics" (→ L13), "Security" (→ L6 + L13).
**Added**: AI & Intelligence (L10), Notifications & Presence (L9), Observability (L13), Client State (L2) as a first-class layer, Domain Services (L4) separated from API Surface (L3).

---

## L1 — Presentation (`apps/web/`)

**Owns**: rendering, routing, motion, accessibility, theming, design tokens, iconography.
**Does not own**: data fetching rules, business logic, persistent state.

```
apps/web/
  app/
    (auth)/              login, signup, magic-link
    (workspace)/         authenticated shell
      layout.tsx         ← TopBar + PrimaryNav + CommandPalette + Outlet
      inbox/             ← Inbox view
      my-issues/         ← My Issues view
      views/[id]/        ← Custom saved view
      projects/[key]/
        issues/          ← Issue list (default view)
        cycles/[id]/     ← Cycle board (Scrum-lite)
        roadmap/         ← Timeline
      search/            ← Search results
      settings/          ← Team, members, billing
  components/
    ui/                  ← Animate UI primitives (shadcn registry)
    icons/               ← @animate-ui/icons (replaces lucide-react)
    shell/               ← TopBar, PrimaryNav, CommandPalette
    issue/               ← IssueListRow, IssueDetailDrawer, IssueProperties
    primitives/          ← Button, Input, Kbd, Tooltip, Dialog (local)
  styles/
    globals.css          ← @import "tailwindcss" + @theme tokens
  lib/
    motion/              ← variants, easings, durations
    a11y/                ← focus rings, live regions
```

**Contracts**
- `components/ui/*` is the **only** import path for visual primitives below the shell.
- `lib/motion/variants.ts` is the **only** source of motion variants — no ad-hoc easings.
- Icons: `@animate-ui/icons` exclusively. No lucide-react.

**Resolves Jira pain points**
- "Outdated interface design" → opinionated token system + Animate UI.
- "Inconsistent design patterns" → single design system layer.

---

## L2 — Client State (`apps/web/lib/state/`)

**Owns**: cache, optimistic updates, ephemeral UI state, focus/context state.
**Tools**: TanStack Query v5 (server cache), Zustand v5 (UI store), nuqs for URL state.

```
lib/state/
  queries/        useIssues, useProject, useCycle, useInbox  (TanStack)
  mutations/      useUpdateIssue, useCreateIssue             (optimistic)
  stores/         command-palette.store, focus.store,
                  presence.store, theme.store                 (Zustand)
  url/            issue filters, view state                   (nuqs)
```

**Contracts**
- All server data flows through TanStack Query. No `fetch` in components.
- Optimistic updates **must** be reversible (`onMutate` + `onError` rollback).
- URL is the source of truth for view state (filters, sort, grouping).

**Resolves Jira pain points**
- "Page refreshes for nearly every action" → optimistic mutations + cache.
- "Laggy UI" → fine-grained subscriptions, no full route rerenders.
- "JQL has learning barrier" → typed filter builders mirror URL state.

---

## L3 — API Surface (`apps/api/`)

**Owns**: type-safe RPC, input validation, transport.
**Tools**: tRPC v11 (primary), Server Actions for forms, REST only for webhooks.

```
apps/api/
  trpc/
    routers/
      issue.ts      list, get, create, update, archive, transition
      project.ts    list, get, members
      cycle.ts      list, get, advance, complete
      inbox.ts      feed, markRead, snooze
      search.ts     query (lexical + semantic)
      view.ts       list, create, update, share
    middleware/     auth, rateLimit, audit, workspace
  actions/          Next.js Server Actions (createIssue, comment)
  webhooks/         GitHub, Slack, generic
```

**Contracts**
- Every tRPC procedure takes a `Zod` input. No `any`.
- Every mutation writes an audit log entry (L13).
- Webhooks bypass tRPC and authenticate via signature.

**Resolves Jira pain points**
- "Slow loading times with large datasets" → cursor pagination, partial responses.
- "Configuration overhead" → opinionated default procedures; admins don't write code.

---

## L4 — Domain Services (`apps/api/services/`)

**Owns**: business rules, invariants, cross-entity orchestration. **Knows nothing about HTTP.**

```
services/
  issue/
    create.ts       validates, assigns ID, emits IssueCreated
    transition.ts   workflow state machine, guards
    archive.ts      soft delete, retention policy
  cycle/
    advance.ts      moves issues to next cycle
    complete.ts     computes velocity, closes cycle
  project/
    membership.ts   role transitions
  search/
    query.ts        builds SQL from typed filter AST
    rank.ts         re-ranks with semantic similarity
```

**Contracts**
- Services are **pure functions** that take a `ctx` (DB, actor, requestId) and return a result or throw a typed `DomainError`.
- Services **never** call tRPC. They are the layer tRPC delegates to.
- Cross-service calls go through events (L7/L9) or explicit injection, not direct imports.

**Resolves Jira pain points**
- "Complex customization requires admin expertise" → opinionated workflows with extension points.
- "Permission schemes are overly complicated" → 3 roles (Admin / Member / Guest) + per-project overrides.

---

## L5 — Data & Persistence (`packages/db/`)

**Owns**: schema, migrations, queries, object storage.
**Tools**: Drizzle ORM (Postgres), S3-compatible blob storage, Redis for hot cache.

```
packages/db/
  schema/
    workspace.ts    tenants
    user.ts         users, accounts
    project.ts      projects, members
    issue.ts        issues, labels, relations
    cycle.ts        cycles, assignments
    comment.ts      comments, reactions
    view.ts         saved views
    audit.ts        audit log
  queries/          reusable typed queries
  migrations/       drizzle-kit generated
  storage/          upload, presign, cdn
```

**Contracts**
- Every table has `id (uuid)`, `createdAt`, `updatedAt`, `createdBy`, `deletedAt?`.
- Soft delete only. Hard delete is admin-only and audited.
- All FKs use UUIDs, no auto-increment.

**Resolves Jira pain points**
- "Custom fields proliferation" → typed property system on `Issue.metadata jsonb` with validation schema per project.
- "Maintenance burden" → single migration tool, single ORM.

---

## L6 — Auth, Identity & Permissions (`apps/api/auth/`)

**Owns**: sessions, OAuth, RBAC, API tokens.
**Tools**: Auth.js v5 (NextAuth), oslo for crypto, jose for JWT.

```
apps/api/auth/
  config.ts        Auth.js v5 config
  providers/
    github.ts       OAuth
    google.ts       OAuth
    email.ts        magic link
  permissions/
    policy.ts       Effect-based policy engine (e.g. "member can edit own issues")
    rbac.ts         role definitions
  tokens.ts         personal access tokens
```

**Contracts**
- Every procedure resolves `ctx.actor` (user or service).
- Permissions are a **policy function** `can(actor, action, resource) -> boolean`, not scattered `if` checks.

**Resolves Jira pain points**
- "Permission schemes are overly complicated" → 3 base roles, per-project overrides, per-issue visibility (Public / Project / Private).

---

## L7 — Realtime Engine (`apps/realtime/`)

**Owns**: live updates, presence, optimistic conflict resolution.
**Tools**: Socket.io 4, Redis pub/sub for fan-out, in-memory LRU for room state.

```
apps/realtime/
  server.ts          Socket.io bootstrap
  rooms/
    issue.ts         subscribe to an issue: edit, comment, status change
    project.ts       project-wide events
  presence.ts        who's viewing what, cursor positions (debounced)
  events.ts          typed event bus (zod schemas)
```

**Contracts**
- Events are typed end-to-end: server schema in `packages/contracts` shared with client.
- Presence events are debounced to 1 Hz max.
- All events are workspace-scoped; cross-workspace fan-out is forbidden.

**Resolves Jira pain points**
- "No real-time collaboration features" → live editing, presence, instant comment delivery.
- "Status update friction - too many clicks" → status changes broadcast and apply on all clients.

---

## L8 — Search & Indexing (`apps/api/services/search/` + worker)

**Owns**: full-text + semantic search, faceted filters, saved queries.
**Tools**: Postgres `tsvector` + GIN index for lexical, pgvector for semantic embeddings.

```
search/
  indexer.ts         listens to DB change stream, writes to search tables
  query.ts           builds tsquery + vector query, merges + re-ranks
  filters.ts         typed filter AST → SQL WHERE
  embeddings.ts      OpenAI / Voyage embeddings, batched
```

**Contracts**
- Indexer is idempotent. Replaying events is safe.
- Search is **eventually consistent** within 500 ms p99.

**Resolves Jira pain points**
- "JQL has learning barrier" → typed filter AST in UI compiles to optimized SQL.
- "Limited out-of-box meaningful metrics" → faceted counts come for free from indexed data.

---

## L9 — Notifications & Presence (`apps/api/services/notify/`)

**Owns**: fan-out delivery, channel preferences, snooze/digest.
**Tools**: Resend (email), Web Push, Slack (via L11), in-app inbox (uses L4 inbox service).

```
notify/
  triggers.ts        maps domain events → notification intents
  channels/
    email.ts         transactional + digest
    push.ts          web push
    slack.ts         DM and channel
    inapp.ts         writes to inbox
  preferences.ts     per-user, per-event, per-channel
  digest.ts          hourly/daily rollup
```

**Contracts**
- Notification intent (e.g. `IssueAssignedToMe`) is **separate from delivery channel**.
- A single intent can fan out to multiple channels based on user prefs.
- Inbox is always-on; other channels are user-controlled.

**Resolves Jira pain points**
- "Comments and notifications can be noisy" → per-event, per-channel preferences + smart digests.
- "Context switching" → in-app inbox is the default destination.

---

## L10 — AI & Intelligence (`apps/api/services/ai/`)

**Owns**: triage, summarization, semantic search, command bar NLP, drafting.
**Tools**: OpenAI / Anthropic via Vercel AI SDK, pgvector for memory.

```
ai/
  triage.ts          auto-assign, auto-priority, auto-label
  summarize.ts       issue + thread summary, weekly digest
  draft.ts           suggest replies, suggest descriptions
  command.ts         natural language → typed action
  embed.ts           embedding generation, caching
  guardrails.ts      PII redaction, jailbreak detection
```

**Contracts**
- Every AI call has a `purpose` enum and is logged for audit.
- All prompts and responses stored for evaluation (L13).
- PII is redacted before any external call.

**Resolves Jira pain points**
- "Extensive setup required" → AI suggests sensible defaults on project creation.
- "Status update friction" → `/cycle review` command in command bar.

---

## L11 — Integration Adapters (`apps/api/integrations/`)

**Owns**: third-party sync. Does **not** own: real-time UI (L7), search (L8), notifications (L9).
**Tools**: webhook receivers, OAuth flows, polling fallbacks.

```
integrations/
  github/
    webhook.ts       PR, issue, branch events
    sync.ts          bi-directional issue ↔ PR linking
  slack/
    bot.ts           slash commands, notifications
  figma/
    sync.ts          link frames to issues
  generic-webhook/
    receiver.ts      user-defined POST → domain event
```

**Contracts**
- Integrations emit **domain events**, never raw payloads.
- Every external call has a circuit breaker + retry with exponential backoff (L12).

**Resolves Jira pain points**
- "Context switching between Confluence, Jira, other tools" → deep, opinionated GitHub + Slack integrations.

---

## L12 — Background Workers & Jobs (`apps/workers/`)

**Owns**: async processing, cron, scheduled tasks.
**Tools**: BullMQ on Redis, cron via node-cron.

```
workers/
  queues.ts          queue definitions
  handlers/
    indexIssue.ts    L8 indexer
    sendNotification.ts  L9 fan-out
    aiTriage.ts      L10 background inference
    githubSync.ts    L11 periodic sync
    cleanup.ts       L13 retention enforcement
  scheduler.ts       cron entries
```

**Contracts**
- Jobs are idempotent. `jobId` is deterministic per domain event.
- Failed jobs go to a DLQ with reason, never silently lost.

**Resolves Jira pain points**
- Reports loading slowness → pre-computed, refreshed on a schedule.

---

## L13 — Observability & Compliance (`packages/obs/`)

**Owns**: logs, metrics, traces, audit trail, GDPR tooling.
**Tools**: OpenTelemetry, Sentry, Better Stack, custom audit table.

```
packages/obs/
  logger.ts          structured logger
  metrics.ts         counters, histograms
  tracer.ts          OTEL spans
  audit.ts           append-only audit log
  compliance/
    gdpr.ts          right-to-erasure, export
    retention.ts     configurable per workspace
    classify.ts      data classification (public / internal / PII)
```

**Contracts**
- Every domain service call emits a span and a log line.
- Every mutation writes an audit row (actor, action, before, after).
- PII fields are tagged in schema and redacted in logs.

**Resolves Jira pain points**
- Hidden costs and feature gates → compliance and observability are part of the platform, not an enterprise add-on.

---

## Cross-cutting decisions

| Decision | Choice | Why |
|---|---|---|
| Monorepo | `pnpm` workspaces + Turborepo | Build perf, shared types |
| Shared types | `packages/contracts` (Zod schemas) | One source of truth for client + server |
| Code style | Biome 2 (format + lint) | One tool, fast |
| Tests | Vitest (unit) + Playwright (e2e) | Speed + realism |
| Deploy | Vercel (web), Fly.io (api + realtime + workers) | Matched to each workload |
| DB | Postgres 16 on Neon | Branchable per-PR DBs |
| Cache | Redis on Upstash | Edge-friendly |
| Object storage | Cloudflare R2 | S3-compatible, no egress |

---

## Layer dependency matrix

| Layer | May import from |
|---|---|
| L1 Presentation | L2 |
| L2 Client State | L3 (via fetcher), L7 (via socket) |
| L3 API Surface | L4, L6, L13 |
| L4 Domain Services | L5, L6, L9 (event bus) |
| L5 Data | (nothing above) |
| L6 Auth | L5 |
| L7 Realtime | L4, L5 |
| L8 Search | L5, L10 (embeddings) |
| L9 Notifications | L4, L11 (channels) |
| L10 AI | L4, L5 |
| L11 Integrations | L4, L12 (retries) |
| L12 Workers | L4–L11 (any) |
| L13 Observability | All layers emit; reads only what they need |

Acyclic. Enforced by `eslint-plugin-import` boundaries and CI check.

---

## What we are building first

Phases 0–2 ship a working demo. See `PLAN.md`.

| Phase | Layers exercised | Outcome |
|---|---|---|
| 0. Foundation | L1, L2 | Design system, app shell, theme tokens |
| 1. Core read paths | + L3, L4, L5 | Issue list, issue detail, inbox |
| 2. Write paths | + L2 mutations | Create / update / transition issues |
| 3. Realtime | + L7 | Live updates and presence |
| 4. Search | + L8 | Command bar, filters, saved views |
| 5. Board | + L4 cycles | Cycle view, drag-and-drop |
| 6. AI | + L10 | Triage, summarize, NL command |
| 7. Integrations | + L11, L12, L9 | GitHub, Slack, notifications |
| 8. Compliance | + L13 | Audit, GDPR tooling |
