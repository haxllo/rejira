# Phase 4: Drizzle queries & mutations - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Every mutation in the UI hits a real Postgres function behind Drizzle. RBAC enforced at the RLS layer. The app is a real multi-tenant backend: state survives reloads, is shared across users, respects permissions, and the realtime channel keeps everyone in sync. This is the GA-ready backend — closed-beta can promote to open-beta after this lands.

Success criteria from ROADMAP.md (re-stated for context, not for renegotiation):
1. Every `apply()` call site routes through `withTransaction()`
2. `useIssues` → `useLiveQuery(issuesQuery, ...)`; `useUI` stays local (Zustand)
3. No TanStack Query; no manual cache invalidation; Supabase Realtime owns live updates
4. RLS enforces workspace isolation on every query (pgTAP proves it for 16 tables)
5. `ISSUES` constant from `lib/mock/` is gone; data flows from Postgres
6. Mutation → optimistic UI → server confirm → pending cleared (or error surfaced)
7. Vercel + Supabase Branching preview per PR; Sentry catching errors
8. E2E test: signup → create workspace → create project → create issue → assign → close passes
9. Activity log writes via Postgres trigger (same transaction as data change)
10. Comments, notifications, saved views all backed by Drizzle queries

</domain>

<decisions>
## Implementation Decisions

### Org plugin ↔ Drizzle schema alignment
- **D-04-01:** Conform Drizzle to Better Auth org plugin defaults: text ids, camelCase columns, text role. Drizzle schemas for `workspaces`/`memberships`/`invitations`/`teams` are renamed and retyped to match plugin output. The plugin is the source of truth for org data.
- **D-04-02:** Id generation: Postgres generates nanoid server-side via the `pg_idkit` extension. text PKs everywhere the plugin owns the table. The 0000-series migration enables the extension and backfills existing bigserial ids with a deterministic `ORDER BY created_at` assignment.
- **D-04-03:** RLS uses the **membership-first** predicate (already shipped in Phase 2): every workspace-scoped table has an `EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.jwt() ->> 'sub' AND workspace_id = this.workspace_id)` predicate.
- **D-04-04 (revised during discussion):** The per-workspace Postgres role model (`SET LOCAL ROLE workspace_<id>`) was rejected because pgBouncer transaction-mode pooling cannot hold role state across transactions. Reverted to membership-first RLS. The three connection strings per env stay as in AGENTS.md (transaction 6543 / direct 5432 / session 5432).

### Optimistic UI ↔ Realtime confirm contract
- **D-04-05:** Hybrid optimistic model: React 19 `useOptimistic` for writes, Supabase Realtime echo for read state. Server Actions invoke `useOptimistic` inside RSC; the optimistic patch expires as soon as the Realtime echo matches.
- **D-04-06:** Pending state clears on **Realtime echo with correlation-id dedupe**. Every server action attaches a client-generated correlation id; the Realtime payload includes the same id, and the client ignores its own echo (treats it as confirm, not as a new event).
- **D-04-07:** **5-second HTTP-200 short-circuit**: if Realtime echo does not arrive within 5s of the server action returning 200, pending state clears anyway and the affected row shows a subtle "unconfirmed" badge. A workspace-level banner appears if Realtime health degrades.
- **D-04-08:** Toast undo is a **soft compensating mutation**: undo is allowed only within a 5s window after the echo, and it issues a new Drizzle mutation. Risky actions (delete issue, archive project) can opt into a 30s retention via a per-action `undoWindowMs` field. Matches Linear's UX.

### Realtime query ownership & derived data
- **D-04-09:** **Composite realtime model**: subscribe to base tables (issues, projects, comments, notifications) for primary read state via Postgres Changes; maintain denormalized server-aggregated tables (e.g., `inbox_count`, `cycle_progress`) updated by triggers for badge/counter values. The client subscribes to the base table for the list and to the aggregated table for the count.
- **D-04-10:** **One channel per workspace** (`workspace_<id>`). All workspace-scoped tables are published into it. The client subscribes once and filters in-process. RLS is the only authorization boundary — Supabase Realtime honors RLS via the security-definer `realtime.messages` function.
- **D-04-11:** Cross-workspace aggregates (e.g., top-bar unread bell): the client subscribes to every workspace the user has access to, sums the per-workspace unread counts client-side. No per-user channel, no polling.

### OpenCode's Discretion
- Exact coalescing/throttling strategy when Realtime message rate exceeds the channel limit
- Reconnect reconciliation for offline clients (whether to use `lastSeenVersion` or full refetch on reconnect)
- Group key for joined queries (e.g., whether `cycle_id` is denormalized on `issues` or resolved client-side via a small cache)
- Saved view URL encoding (URL-synced filters from Phase 1, but stored server-side now)
- Inbox notification source-of-event: same-transaction trigger vs. async queue (durable via pg NOTIFY or outbox pattern)

</decisions>

<specifics>
## Specific Ideas

- The `pg_idkit` extension needs to be enabled as part of the first 0000-series migration that renames the existing bigserial ids. Backfill is `ORDER BY created_at` so the assignment is deterministic and re-runnable.
- The membership-first RLS predicate already exists in Phase 2 migrations. Phase 4 needs the researcher to **verify** the predicate is correctly applied to every workspace-scoped table (the 16 Phase 2 tables) and that no app-side `requireRole` helper has crept back in.
- The 5s HTTP-200 short-circuit + per-row "unconfirmed" badge is borrowed from Linear's "syncing" affordance. Treat it as a degraded-state signal, not a normal one.
- The `undoWindowMs` field on server actions lets the planner add it as a single line per action. The toast pipeline in `apps/web/lib/state/mutations.ts` already exposes the right hooks (5s default, custom retention per action).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 plan
- `.planning/ROADMAP.md` §Phase 4 — success criteria, requirements, status
- `.planning/REQUIREMENTS.md` — PROJ-01..09, ISSUE-01..20, INBOX-01..05, VIEW-01..05, ACT-01..05

### Architecture and conventions
- `AGENTS.md` — project-wide conventions: stack, design system, code style, migrations, environment
- `ARCHITECTURE_13_LAYERS.md` — 13 layers (L1–L13); server-side Drizzle vs. client-side Supabase split; RLS as only tenancy boundary
- `apps/web/lib/db/_tests/rls.test.ts` — existing pgTAP RLS harness to extend

### Existing code to consume
- `apps/web/lib/state/mutations.ts` — current `apply()` pipeline (toast undo, pending state, lastError) — Phase 4 keeps the API and swaps the internals
- `apps/web/lib/state/issues.ts` — current `useIssues` — replaced by `useLiveQuery`
- `apps/web/lib/db/client.ts` — Drizzle client (transaction pooler 6543)
- `apps/web/lib/db/schema/workspaces.ts` — schema to be aligned with org plugin
- `apps/web/lib/db/schema/memberships.ts` — schema to be aligned
- `apps/web/lib/db/schema/invitations.ts` — schema to be aligned
- `apps/web/lib/db/schema/teams.ts` — schema to be aligned
- `apps/web/lib/supabase/` — browser Supabase client (Realtime)
- `apps/web/lib/db/seed.ts` — seed script that the new `lib/mock/` deletion must not break

### Better Auth org plugin docs (research deliverable)
- `node_modules/better-auth/dist/plugins/organization/` — read the org plugin's expected schema for `organization`/`member`/`invitation`/`team` modelNames and the field overrides it supports
- Phase 3 SUMMARY files (`.planning/phases/03-auth-identity/03-03-SUMMARY.md` and 03-05) describe the existing org-plugin configuration

### Debug context (prerequisite)
- `.planning/debug/ratelimit-table-missing-on-signup.md` — debug session that flagged the org-plugin casing mismatch as a Phase 4 prerequisite. Read this before planning the schema-alignment plan.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/lib/state/mutations.ts` — `apply()` pipeline shape (toast, undo, lastError) carries over to Phase 4 server actions. The `MutationContext` type and `hostBridge` pattern survive; only the body changes.
- `apps/web/lib/db/client.ts` — Drizzle client with transaction-mode pooler config. Phase 4 keeps this and adds the `withTransaction()` helper.
- `apps/web/lib/db/_tests/setup.ts` and `rls.test.ts` — pgTAP harness. Extend with mutation tests (insert/update/delete with RLS), not just select.
- `apps/web/lib/supabase/client.ts` (or equivalent) — browser Supabase client. Already used for auth (Phase 3). Extend with Realtime channel subscription for `workspace_<id>`.

### Established Patterns
- **Three connection strings** (transaction 6543 / direct 5432 / session 5432) — locked per AGENTS.md
- **RLS predicate as `EXISTS` subquery on `memberships`** — already in Phase 2 migrations
- **Server Actions invoke Drizzle directly** — no service layer in between; `withTransaction()` is the only abstraction
- **Activity log via Postgres trigger** — same transaction as the data change; same pattern applies to all state changes
- **No app-side `requireRole` helpers** — RLS denies unauthorized rows at the database; any reintroduction is a planning defect

### Integration Points
- `apps/web/app/api/auth/[...all]/route.ts` — Better Auth route handler (already in place from Phase 3)
- `apps/web/middleware.ts` — middleware already reads Better Auth session cookies (Phase 3-06 cutover)
- `apps/web/components/issue-row.tsx` and similar — to be refactored to consume `useLiveQuery(issuesQuery, ...)` instead of `useIssues`
- `apps/web/lib/db/seed.ts` — seed script remains; `lib/mock/` data goes away in Phase 4 last step
- `apps/web/lib/state/mutations.ts` — call sites throughout the app route through this; Phase 4 swaps internals, keeps API

</code_context>

<deferred>
## Deferred Ideas

- **Realtime message coalescing/throttling** — implement in plan; the channel limit is a real constraint but the strategy (debounce by table+key, drop low-priority updates) is execution detail
- **Realtime reconnect reconciliation** — implement in plan; full refetch on reconnect vs. `lastSeenVersion` walk is execution detail
- **User presence** (Phase 5) — out of scope for Phase 4, but the per-workspace channel can host presence without a separate channel
- **Saved view URL encoding** — URL-synced filters already exist from Phase 1; saving them server-side is implementation detail
- **Inbox notification source** — same-transaction trigger vs. async queue is a planner call; durable via pg `NOTIFY`/outbox if async is chosen
- **Phase 5 Yjs description CRDT** — confirmed out of Phase 4 scope per AGENTS.md
- **Custom fields per workspace** — explicitly post-GA in PROJECT.md

</deferred>

---

*Phase: 04-drizzle-queries-mutations*
*Context gathered: 2026-06-08*
