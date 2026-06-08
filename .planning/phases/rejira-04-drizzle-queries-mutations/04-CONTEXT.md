# Phase 4: Drizzle queries & mutations — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning
**Source:** User redesign directive — "find a better approach redesign phase 4 with the best and robust path"
**Padded phase:** 04

<domain>
## Phase Boundary

Phase 4 replaces every read of mock data (`apps/web/lib/mock/`) and every write through the in-memory
`apply()` pipeline with real Drizzle queries and Drizzle-wrapped server actions against the
Supabase Postgres data layer that Phase 2 stood up. RLS is the only authorization boundary
(Better Auth + the Phase 2 `memberships` table drive identity, but tenancy isolation is enforced
by RLS, not by app-side `requireRole` helpers). Activity log writes happen via the Phase 2
`tg_emit_activity()` trigger — application code does not write to `activities` directly. After
Phase 4, the app is a real multi-tenant backend shared across users; state survives reloads;
realtime is wired but cross-workspace leak is impossible.

In-scope:

- Replace every `ISSUES` / `PROJECTS` / `CYCLES` / `LABELS` / `INBOX` / `USERS` / `COMMENTS` /
  `SAVED_VIEWS` mock with a Drizzle RSC query (`getIssuesForActiveWorkspace`, `getProjects`, etc.)
- Wire every UI mutation (status, priority, assignee, archive, reorder, project create, cycle
  create, comment add, notification read, view save) through a server action that performs a
  Drizzle write inside a `withTransaction()` helper that sets `request.jwt.claims` to the
  caller's Better Auth `externalId`
- Add the realtime subscription layer so the optimistic UI never lies: any other user in the
  same workspace sees a change within ~1s
- Confirm `tg_emit_activity()` writes an `activities` row in the same transaction as every
  data change; expose `getRecentActivities(limit)` and `getActivitiesForObject(...)` so the
  existing pages can render the audit trail
- Delete the data files under `apps/web/lib/mock/`; keep the type re-exports so component
  import paths are stable
- Tune the pg.Pool for Vercel serverless (statement timeout, `prepare: false`, connection
  ceiling), and wire Sentry / PostHog / pino for observability
- Add pgTAP coverage that proves RLS denies cross-workspace reads/writes; the existing
  Phase 2/3 Vitest suite must continue to pass

Out of scope (deferred to later phases):

- Presence, Yjs collaborative editing, page-level error boundaries, Sentry alerting wiring,
  mobile, transactional emails, the `/activity` surface polish — Phase 5
- pgvector embeddings, `⌘K` semantic, AI triage, cost caps — Phase 6
- GitHub PR linking, Slack DM, outbound webhooks, file uploads, public REST API — Phase 7
- Lighthouse perf gate, real light mode, Stripe billing, i18n rollout, PITR drill, browser
  matrix — Phase 8

</domain>

<decisions>
## Implementation Decisions

### Architectural shape

- **Two-layer reads.** Pages render with RSC. Each page calls a thin helper in
  `apps/web/lib/db/rsc.ts` (e.g. `getIssuesForActiveWorkspace({ assigneeId })`) that
  re-resolves the active workspace id and the session user, then runs a Drizzle `select`
  with the workspace-scoped `where` clause. RLS provides defence in depth; the explicit
  `where workspaceId = ?` is for index locality. The page is a Server Component; the row
  array passes to client components as props.
- **Two-layer writes.** Mutations originate in client components (the existing keyboard
  shortcuts, the bulk action bar, the issue drawer). Each call site is refactored from
  `apply({ op, undo, retry })` running a Zustand store update to a small async function
  that calls a server action, passing a typed payload. The server action wraps the
  Drizzle write in `withTransaction(async (tx) => ...)` which (a) sets
  `request.jwt.claims` to the caller's Better Auth `externalId` so RLS evaluates
  policies against the right subject, and (b) commits atomically. The Phase 2
  `tg_emit_activity()` trigger fires inside the same transaction.
- **Optimistic UX stays unchanged.** The Phase 1 `apply()` pipeline is *retained* as the
  client-side UX layer: it pushes the context onto the undo stack, sets `pending = true`
  on affected rows in the Zustand store, fires the toast, and on failure routes through
  `lastError`. The mutation function passed to `apply` is now a `await serverAction(...)`
  promise that the client awaits, clears `pending` on success, or sets `lastError` on
  failure. We do not delete the `apply()` function — we change what it wraps.
- **No TanStack Query, no SWR, no custom cache.** The RSC fetch on every navigation is
  the cache. Realtime patches update the Zustand store. The previous plan's
  `useWorkspaceQuery.ts` SWR hook is dropped — RSC + `router.refresh()` is the model.

### Realtime shape

- **Single channel per workspace.** The `(workspace)` route layout opens one
  `supabase.channel(`workspace:${wsId}`)` on mount and re-subscribes on workspace
  switch. The channel subscribes to `postgres_changes` for `public.issues`,
  `public.notifications` (filtered to `user_id = me`), `public.comments` (the inbox
  drawer subscribes separately by `issue_id`), `public.memberships` (so the
  workspace switcher reflects new joins/leaves), and `public.cycles` /
  `public.projects` / `public.saved_views`. The handler calls a small dispatcher
  that updates the relevant Zustand slice with the changed row(s).
- **Reactive refetch for grouped lists.** A debounced (200ms) `router.refresh()`
  on the issues/projects cycles channels is the cheap path — Server Components
  re-render with the new state. For drawer comments and the inbox, a direct
  `setState` patch is faster than re-rendering.
- **RLS at the Realtime layer.** Supabase Realtime applies RLS per subscriber, so
  a user subscribed to workspace X never receives rows from workspace Y. We do
  not add a JS-side `workspaceId` filter — relying on RLS is the contract.

### Identity / tenancy boundary

- **No `requireRole(user, role, workspaceId)` helpers in app code.** The previous
  Convex-era `apps/web/lib/auth/rbac-helpers.ts` (if it exists) is deleted; any
  equivalent helper added during Phase 3 is also removed. RLS is the only
  authorization check. pgTAP tests in `apps/web/supabase/tests/rls-cross-tenant.test.sql`
  prove the boundary.
- **`withTransaction` sets the RLS context.** The transaction wrapper calls
  `set_config('request.jwt.claims', json_build_object('sub', session.user.externalId, 'workspace_id', wsId)::text, true)`
  before invoking the callback. The `true` argument scopes the setting to the
  current transaction (so connection pooling does not leak credentials).
- **Activity log writes via trigger only.** No application code inserts into
  `public.activities`. The Phase 2 `tg_emit_activity()` function emits the row
  with the correct `actor_id` (read from `request.jwt.claims`), `before` JSON
  (`to_jsonb(old)`), and `after` JSON (`to_jsonb(new)`).

### Mock cleanup

- **Delete the data, keep the types.** `apps/web/lib/mock/issues.ts`,
  `projects.ts`, `cycles.ts`, `labels.ts`, `users.ts`, `inbox.ts` lose their
  exported arrays/objects; the `export type Issue = ...` (or the
  `import type { Issue } from "@/lib/db/types"` re-export) stays. The
  `apps/web/lib/mock/index.ts` barrel is deleted. The `apps/web/lib/mock/types.ts`
  re-export is replaced with a one-line re-export from `apps/web/lib/db/types.ts`.
  All import sites under `apps/web/app`, `apps/web/components`, and
  `apps/web/hooks` move from `from "@/lib/mock"` to `from "@/lib/db/types"`.

### Performance

- **`prepare: false` in the Drizzle client.** PgBouncer in transaction mode
  cannot serve prepared statements across pooled connections. Disable
  prepared statements; accept the ~1ms per-query overhead. This is a Phase 2
  decision re-stated explicitly so it is not lost.
- **`statement_timeout = 5s` per transaction.** A runaway query is cancelled
  with a clear error rather than holding a connection indefinitely. The error
  maps to a 408 in `mapDrizzleError()`.
- **Pool size = 10 per Vercel function instance, default 30s idle timeout.**
  Supabase's transaction-mode pooler has a default pool size of 15, which
  covers roughly 1.5× peak Vercel concurrency. A load test (`apps/web/lib/db/_tests/load.test.ts`)
  fires 100 concurrent selects and asserts < 5s wall time and ≤ 15 active
  connections in `pg_stat_activity`.

### Observability

- **Sentry breadcrumb per Drizzle query (slow-query warning at > 100ms).**
  A `drizzleLogger` in `apps/web/lib/db/client.ts` logs every query with
  duration, sql, params (redacted), and the workspace id. Sentry captures
  exceptions raised inside `withTransaction` and inside RSC queries.
- **PostHog events for the 10 high-funnel mutations** (issue created, issue
  status changed, comment created, etc.). The `lib/observability/auth-events.ts`
  helper from Phase 3 is reused; new events are added next to it.
- **pino structured logger** with `requestId`, `userId`, `workspaceId` in
  every line. A middleware-attached `x-request-id` header threads the id
  from Vercel to RSC to Drizzle.

### Failure model

- **mapDrizzleError maps Postgres SQLSTATE codes** to user-safe messages.
  `42501` (insufficient_privilege / RLS denial) → toast "You don't have
  permission to do that" + no detail leak; `23505` (unique_violation) →
  "That value is already taken"; `23503` (foreign_key_violation) → "Cannot
  delete — referenced elsewhere". The raw error is captured in Sentry with
  full context; the user sees the mapped message.
- **lastError → toast → retry button.** The Phase 1 `recordError(message)`
  helper is called from the server-action promise's `.catch`. The toast
  host renders the error variant with a Retry button that calls
  `retryLast()` (which re-runs the most recent server action).

### Tests

- **pgTAP RLS suite** in `supabase/tests/04-rls-cross-tenant.test.sql` extends
  the Phase 2 suite with positive AND negative cases for every business table
  touched by Phase 4 (issues, comments, notifications, saved_views, activities,
  projects, cycles, labels). The CI gate from Phase 2 runs it on every PR.
- **Vitest action unit tests** in `apps/web/lib/db/actions/_tests/*.test.ts`
  exercise each server action with an in-memory pg mock; the action succeeds
  on a permitted user and throws on a denied one.
- **Vitest integration test** in `apps/web/lib/db/_tests/full-flow.test.ts`
  spins up a real test workspace in the local Supabase, runs the cutover
  flow (create issue → assign → change status → comment → close), and
  asserts the activity log row is present and RLS is enforced.
- **Playwright E2E** in `e2e/full-flow.spec.ts` drives the same flow through
  the UI; this is the Phase 8 perf-test baseline.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `ARCHITECTURE_13_LAYERS.md` — 13-layer reference; Phase 2/3 use L1–L8, Phase 4 uses L1–L7 with new L6 Realtime subscribers
- `PHASE_4_PLAN.md` — the existing detailed plan (4A–4J) being redesigned; not the source of truth, but a useful index of original concerns
- `AGENTS.md` — project skills, conventions, and section anchors

### Data layer (Phase 2 outputs)
- `apps/web/lib/db/client.ts` — existing pg.Pool + drizzle; needs `statement_timeout`, `prepare: false`
- `apps/web/lib/db/schema/index.ts` — barrel for the 16-table schema; the planner MUST use these exports, not re-derive
- `apps/web/lib/db/seed.ts` — `ME_ID` placeholder seed (must remain idempotent)
- `supabase/migrations/0001_rls.sql` through `0024_org_rls_rewrite.sql` — every existing migration
- `supabase/migrations/0006_activity_log_triggers.sql` — the `tg_emit_activity()` function Phase 4D relies on
- `supabase/migrations/0012_realtime_publication.sql` — the publication the realtime layer subscribes to
- `supabase/migrations/0002_rls_helpers.sql` — `auth.user_external_id()`, `workspace_ids_for(user)`, etc.
- `apps/web/lib/supabase/storage.ts` — existing Storage helper (avatars/attachments)

### Auth (Phase 3 outputs)
- `apps/web/lib/auth/require-auth.ts` — `requireAuth()` returns `{ user, session, externalId }`; this is the single place to read identity
- `apps/web/lib/auth/get-session.ts` — soft-read variant for non-redirect contexts
- `apps/web/lib/auth/workspace-helpers.ts` — workspace context helpers
- `apps/web/hooks/useWorkspace.ts` — client-side workspace id (drives the `?w=` URL)
- `apps/web/hooks/useSession.ts`, `useUser.ts` — client-side identity hooks

### State (Phase 1 outputs that survive)
- `apps/web/lib/state/mutations.ts` — `apply()`, `recordError()`, `retryLast()`, `toast()`, `lastError`; this stays as the UX layer
- `apps/web/lib/state/ui.ts` — `useUI` (density, palette, drawer); unchanged
- `apps/web/lib/state/issues.ts` — `useIssues` Zustand store; refactored to be derived (driven by RSC + Realtime patches, not by `apply` directly)
- `apps/web/lib/state/saved-views.ts` — local-storage view query cache; will be replaced with RSC + Drizzle reads
- `apps/web/lib/state/view-query.ts` — URL ↔ filter/sort/group encoding (unchanged)
- `apps/web/lib/state/keyboard.ts` — keyboard handler (unchanged)

### Mock data to delete
- `apps/web/lib/mock/issues.ts` — `ISSUES` array; delete the data, keep the type re-export
- `apps/web/lib/mock/projects.ts` — `PROJECTS` array; delete the data
- `apps/web/lib/mock/cycles.ts` — `CYCLES` array; delete the data
- `apps/web/lib/mock/labels.ts` — `LABELS` array; delete the data
- `apps/web/lib/mock/users.ts` — `USERS` array; delete the data
- `apps/web/lib/mock/inbox.ts` — `INBOX` array; delete the data
- `apps/web/lib/mock/index.ts` — barrel; delete
- `apps/web/lib/mock/types.ts` — type re-export; redirect to `apps/web/lib/db/types.ts`

### Observability
- `apps/web/lib/observability/sentry.ts` — Sentry init (server + edge + browser) from Phase 3
- `apps/web/lib/observability/posthog.ts` — PostHog init from Phase 3
- `apps/web/lib/observability/auth-events.ts` — auth funnel events from Phase 3; extend with mutation events

### Configuration
- `apps/web/.env.example` — env var contract; Phase 4 adds no new vars (Supabase URL + anon key already present from Phase 3)
- `drizzle.config.ts` — Drizzle Kit config; remains `drizzle-kit generate` produces no diff
- `apps/web/middleware.ts` — Phase 3 route protection; Phase 4 adds `x-request-id` propagation

</canonical_refs>

<specifics>
## Specific Ideas

- **Naming.** `withTransaction()` lives in `apps/web/lib/db/transaction.ts` (not
  `actions/transaction.ts`); it's the *one* transactional primitive used by every
  action file. Action files follow `apps/web/lib/db/actions/{domain}.ts` and
  each exports plain async functions that accept a `tx` argument plus a typed
  payload. The RSC reads live in `apps/web/lib/db/rsc.ts`. Error mapping lives
  in `apps/web/lib/db/errors.ts`. Re-exported types live in `apps/web/lib/db/types.ts`.
- **No `useLiveQuery`.** The previous plan mentioned `useLiveQuery(issuesQuery, ...)` —
  this was a holdover from Convex's reactive client. Drizzle does not have a
  `useLiveQuery`; the equivalent is RSC + `router.refresh()` + Zustand patches
  driven by Realtime. Plans should not propose `useLiveQuery`.
- **No `useOptimistic` for cross-row mutations.** React 19's `useOptimistic` is
  useful for *form* submissions on a Server Action route; it is not the right
  shape for the keyboard-driven `apply()` pipeline. We keep `apply()` as the
  optimistic layer (the Zustand store is the optimistic source of truth; the
  server is the durable source of truth; `pending` is the visual indicator).
- **Realtime subscriber pattern.** Wrap a single `WorkspaceRealtime` provider
  in `apps/web/app/(workspace)/layout.tsx`. The provider opens a channel on
  mount, exposes the channel ref to descendant hooks (`useRealtimeIssues`,
  `useRealtimeComments`, `useRealtimeNotifications`, `useRealtimeMemberships`),
  and unsubscribes on unmount or workspace switch. Each hook has a single
  responsibility; they do not share state.
- **Single workspace channel, not per-table channels.** One channel per
  workspace is cheaper than N channels per page; Postgres-RLS filters at
  the Realtime layer so cross-workspace leak is impossible.
- **Activity log feed is cheap.** `getRecentActivities(limit: 10)` reads
  `activities` for the active workspace, ordered by `created_at desc`,
  joined with `users` for actor display. Index already exists from
  Phase 2 (`create index activities_workspace_created_idx on activities (workspace_id, created_at desc)`).
- **RSC reads use `cache: 'no-store'` for now.** We do not enable
  `unstable_cache` in this phase — every navigation re-fetches, which is
  correct while data is volatile and Realtime is the consistency story.
  Static caching is a Phase 8 perf concern.

</specifics>

<deferred>
## Deferred Ideas

- **`useLiveQuery(issuesQuery, ...)`** — Convex-era holdover; Drizzle has no
  equivalent and the RSC + Realtime model is correct instead. Not in any
  Phase 4 plan.
- **SWR / TanStack Query client cache** — explicitly out per PROJECT.md
  "Out of Scope". RSC + Realtime replaces it.
- **`requireRole` / `requireOwner` helpers in app code** — Convex-era
  helper. Replaced by RLS; deleted in this phase.
- **Real-time collaborative editing on description (Yjs)** — Phase 5.
  Phase 4 ships the description field as a single-row read/write.
- **Page-level error boundaries, mobile responsive, transactional emails,
  the `/activity` surface polish** — Phase 5.
- **pgvector / hybrid search / `⌘K` AI** — Phase 6.
- **File uploads via Supabase Storage, public REST API, GitHub/Slack
  integrations** — Phase 7.
- **Lighthouse perf gate, real light mode, Stripe billing, browser
  matrix, PITR drill, i18n (ja, zh) review** — Phase 8.
- **PROJ-08 (Cycle auto-advances)** — belongs in pg_cron / Phase 5; not a
  Phase 4 deliverable. The cycle table from Phase 2 has the data; the
  scheduler is Phase 5.
- **ISSUE-19 (@-mention notifications)** — storage of `mentions` in the
  `comments.mentions` jsonb column is covered by Plan 02's `createComment`
  action (the `mentions?: string[]` field). The mention-to-notification
  pipeline (rendering the @-mention autocomplete, firing notifications on
  mention) is Phase 5. The Phase 4 cutover ships the storage; the UX
  polish is Phase 5.

</deferred>

---

*Phase: 04-drizzle-queries-mutations*
*Context gathered: 2026-06-08 via user redesign directive ("redesign phase 4 with the best and robust path")*
</content>
</invoke>