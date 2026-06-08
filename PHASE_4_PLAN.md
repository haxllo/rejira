# Phase 4 — Drizzle queries & mutations

**Status:** 📌 Ready to execute (rewritten from the Convex-era version; references Phase 2's Supabase data layer and Phase 3's Better Auth)
**Owner:** opencode
**Depends on:** Phase 0 ✅, Phase 1 ✅, **Phase 2 (Supabase data layer) 📌**, **Phase 3 (Better Auth + Supabase) 📌**
**Blocks:** Phase 5 (realtime wiring), Phase 6 (pgvector search + AI), Phase 7 (integrations), Phase 8 (launch)

## Goal

Replace mock data (`lib/mock/`) with real **Drizzle** queries and transactions against the **Supabase Postgres** data layer stood up in Phase 2. Every page reads from Drizzle, every state change routes through a transactional Drizzle write. RBAC is enforced at the **Postgres RLS** layer (Phase 2's policies), not in app code. Activity log writes happen via the **Postgres triggers** from Phase 2 (the trigger emits the row, the mutation just changes the data). The app becomes a real multi-tenant backend.

**The Convex references in the previous version of this plan are removed.** There is no `convex/issues.ts`, no `useQuery(api.issues.list)`, no `useMutation(api.issues.update)`, no `convex/rbac.ts`, and no `convex/_tests/`. Queries use Drizzle. Mutations use Drizzle transactions. RBAC is enforced by RLS. Tests live in `apps/web/lib/db/_tests/`.

---

## Why this pivot

The previous version of this plan treated the data layer as a TypeScript function server. The new architecture pushes the boundary down: Drizzle is a thin client; the database is the contract. This phase is mostly about **replacing the data source** — the component tree and the `apply()` mutation pipeline from Phase 1 do not change shape.

---

## Current state vs target

| Layer | Current (Phase 3) | Target (Phase 4) |
|-------|-------------------|------------------|
| Issues | `ISSUES` constant from `lib/mock/issues.ts` | Drizzle query `db.select().from(issues).where(eq(issues.workspaceId, wsId))` via RSC |
| Projects | `PROJECTS` constant | Drizzle query (RLS-scoped) |
| Cycles | `CYCLES` constant | Drizzle query (RLS-scoped) |
| Mutations | `apply()` writes to Zustand store | Drizzle transaction (`db.transaction(async (tx) => {...})`) — `apply()` signature unchanged |
| Assignees | Static mock array | Drizzle join via `issueAssignees` + `memberships` |
| Comments | Mock data | Drizzle query, ordered by `created_at` |
| Notifications | `INBOX` constant | Drizzle query (current user only, RLS-scoped) |
| Saved views | `lib/state/saved-views.ts` (localStorage) | Drizzle query (RLS-scoped; `saved_views` table from 2C) |
| Live updates | None | Supabase Realtime subscription (2G publication) — replaces the optimistic UI's blind spots |
| RBAC | `requireWorkspace` helper | Postgres RLS policies from 2D — enforced at the DB |
| Activity log | (none) | Postgres trigger from 2E emits the `activities` row in the same transaction as the data change |

---

## Architecture

```
Browser                    Next.js (RSC + server actions)                    Supabase Postgres
  │                                  │                                                │
  │ navigate                         │                                                │
  ├──────────────────────────────────►                                                │
  │                                  │ db.select().from(issues).where(workspaceId=?)  │
  │                                  ├───────────────────────────────────────────────►│
  │                                  │   pg.Pool (transaction-mode 6543)              │
  │                                  │   ↓ RLS check (auth.jwt() ->> 'sub')          │
  │                                  │   ↓ Postgres filter on workspace_id            │
  │                                  │◄──────────────────────────────────────────────┤
  │                                  │ rows[]                                          │
  │◄─────────────────────────────────┤                                                │
  │ page renders                                                                │
  │                                                                             │
  │ user clicks "Set status"                                                   │
  ├──────────────────────────────────►                                                │
  │                                  │ useTransition / useOptimistic                    │
  │                                  │ apply({ op, undo, retry })                      │
  │                                  │   ├─ optimistic UI update (Zustand still local) │
  │                                  │   ├─ db.transaction(async (tx) => {             │
  │                                  │       tx.update(issues).set({ status })...      │
  │                                  │   })                                            │
  │                                  ├───────────────────────────────────────────────►│
  │                                  │   RLS check passes                              │
  │                                  │   BEFORE UPDATE trigger: emit activities row   │
  │                                  │   RETURNING *                                    │
  │                                  │◄──────────────────────────────────────────────┤
  │                                  │ updated row                                     │
  │                                  │   ↓ Supabase Realtime broadcasts                │
  │                                  │   ↓ to all subscribed clients in the workspace  │
  │◄─────────────────────────────────┤                                                │
  │ drawer/list live-updates                                                       │
```

**Key insight:** the `apply()` pipeline from Phase 1 does not change. We add a server action that wraps a Drizzle transaction; the optimistic UI update is unchanged. The `undo` closure is unchanged (revert the optimistic update). The `retry` closure is unchanged (re-run the server action). Phase 4 is the first time `apply()` talks to a real backend.

---

## Sub-phases

```
4A ─── Drizzle client + RSC query helpers
        │   (server-only db, useWorkspaceQuery hook, error mapping)
        ▼
4B ─── Read-side: replace lib/mock/ with Drizzle
        │   (issues, projects, cycles, labels, memberships, comments, notifications, saved views)
        ▼
4C ─── Write-side: server actions wrapping Drizzle transactions
        │   (replace Zustand writes; preserve apply() signature)
        ▼
4D ─── Activity log: confirm trigger emissions + RLS reads
        │   (no app code writes activities; the trigger does)
        ▼
4E ─── Supabase Realtime: subscribe to hot tables
        │   (replace local-only optimistic UI; cross-tab live updates)
        ▼
4F ─── RBAC: confirm RLS enforces per-workspace + per-role
        │   (delete requireRole helpers; RLS is the only guard)
        ▼
4G ─── Cleanup: delete lib/mock/ data; keep types
        │   (the seed from 2J is the only source of fixture data)
        ▼
4H ─── Performance: connection pool tuning + prepared statements
        │   (Vercel function concurrency; pgbouncer transaction mode)
        ▼
4I ─── Test suite: Vitest + Playwright E2E
        │   (RLS tests from 2D run against the live local Supabase)
        ▼
4J ─── Observability: Sentry, PostHog, structured logging
```

Each sub-phase ends with **explicit verification commands**:

```bash
npm run typecheck && npm run lint && npm run build
npm run db:test            # 148 Phase 2/3 tests + new 4X tests
npm run test:e2e           # Phase 3's 50+ tests + new 4X tests
```

---

### 4A — Drizzle client + RSC query helpers

**Why first:** Every read in the app uses a Drizzle query. We need a small, consistent set of helpers that wrap Drizzle with the auth context (the user's session) and the workspace context (the active workspace from `?w=...`).

**Files to create:**
- `apps/web/lib/db/index.ts` — re-exports the Drizzle client, the schema, and the new helpers
- `apps/web/lib/db/rsc.ts` — `getIssuesForActiveWorkspace()`, `getProjects()`, `getCycles()`, `getLabels()`, `getComments(issueId)`, `getNotifications()`, `getSavedViews()`. Each is a Server Component helper that reads `?w=` and the session, then runs a Drizzle query.
- `apps/web/lib/db/errors.ts` — `mapDrizzleError(err): { code, message, status }` — maps Postgres error codes (`42501` → 403 forbidden, `23505` → 409 conflict, etc.) to HTTP responses.
- `apps/web/lib/db/types.ts` — Drizzle inferred types re-exported as `Issue`, `Project`, `Cycle`, etc. (replaces the mock-data types).
- `apps/web/hooks/useWorkspaceQuery.ts` — client-side hook that wraps a Drizzle RSC fetch with SWR-style revalidation.

**Files to edit:**
- `apps/web/lib/db/client.ts` (from Phase 2) — confirm `DATABASE_URL` (pooled) is used; add `sslmode=require` and a `statement_timeout` for runaway queries
- `apps/web/next.config.ts` — mark `apps/web/lib/db/**` as server-only via `import "server-only"` at the top of `index.ts`

**`rsc.ts` example (issues):**

```ts
// apps/web/lib/db/rsc.ts
import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./client";
import * as s from "./schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { getActiveWorkspaceId } from "@/lib/auth/workspace-context";

export async function getIssuesForActiveWorkspace() {
  const session = await requireAuth();
  const workspaceId = await getActiveWorkspaceId();
  return db
    .select()
    .from(s.issues)
    .where(
      and(
        eq(s.issues.workspaceId, workspaceId),
        isNull(s.issues.archivedAt),     // RLS also enforces; this is a faster pre-filter
      ),
    )
    .orderBy(asc(s.issues.status), desc(s.issues.updatedAt));
  // RLS does the cross-tenant filter automatically — the explicit workspaceId is
  // for the index lookup. If the user's RLS context is wrong, the query returns 0 rows.
}
```

**Acceptance criteria:**
- `npm run typecheck` clean (the new helpers are fully typed)
- `npm run build` clean
- A smoke test in `apps/web/lib/db/_tests/rsc.test.ts` proves the helper throws `redirect('/sign-in')` for unauthenticated calls and returns rows for authenticated calls (against the seeded local Supabase from Phase 2)

---

### 4B — Read-side: replace `lib/mock/` with Drizzle

**Why now:** The user-facing app still reads from `lib/mock/issues.ts` etc. Phase 4B swaps each mock array for a Drizzle RSC query, one page at a time.

**Files to edit (one per page that reads mock data):**
- `apps/web/app/(workspace)/inbox/page.tsx` — `INBOX` constant → `getNotifications()`
- `apps/web/app/(workspace)/my-issues/page.tsx` — `ISSUES` filtered by `assigneeId === me` → `getIssuesForActiveWorkspace({ assigneeId: me })`
- `apps/web/app/(workspace)/projects/[key]/issues/page.tsx` — `ISSUES` filtered by project → `getIssuesForActiveWorkspace({ projectId })`
- `apps/web/app/(workspace)/projects/[key]/cycles/[id]/page.tsx` — `ISSUES` + `CYCLES` → `getCycles()` + `getIssuesForActiveWorkspace({ cycleId })`
- `apps/web/app/(workspace)/projects/[key]/roadmap/page.tsx` — `ISSUES` + `PROJECTS` → `getProjects()` + `getIssuesForActiveWorkspace()`
- `apps/web/app/(workspace)/views/[id]/page.tsx` — saved-view filter → Drizzle filter expression built from the saved view's `filter` JSON
- `apps/web/app/(workspace)/home/page.tsx` — user-greeting + recent activity → `getCurrentUser()` + `getRecentActivities(limit: 10)`

**Components to update (read from props, not from `lib/mock/`):**
- `apps/web/components/views/grouped-list.tsx` — accepts `issues: Issue[]` from props (no internal mock)
- `apps/web/components/views/cycle-board.tsx` — accepts `issues` + `cycles` from props
- `apps/web/components/issue/issue-drawer.tsx` — accepts `issue` from props (or fetches via `getIssue(id)`)
- `apps/web/components/inbox/inbox-item.tsx` — accepts `notification` from props
- `apps/web/components/views/issue-row.tsx` — already takes props; verify no imports from `lib/mock/`

**Files to delete (data only, keep types):**
- `apps/web/lib/mock/issues.ts` — delete the `ISSUES` array; keep the `Issue` type as a re-export from `apps/web/lib/db/types.ts`
- `apps/web/lib/mock/projects.ts` — delete the `PROJECTS` array; keep the `Project` type
- `apps/web/lib/mock/users.ts` — delete the `USERS` array; keep types
- `apps/web/lib/mock/inbox.ts` — delete the `INBOX` array; keep types
- `apps/web/lib/mock/cycles.ts` — delete the `CYCLES` array; keep types
- `apps/web/lib/mock/labels.ts` — delete the `LABELS` array; keep types

**Acceptance criteria:**
- `grep -r "from.*lib/mock" apps/web/components apps/web/app apps/web/hooks` returns zero results (all data comes from Drizzle)
- `npm run typecheck` clean
- `npm run build` clean
- Every page renders the same data as before, but now it flows from Postgres (verified by stopping the local Supabase and seeing the pages fail with a "database unreachable" error)

---

### 4C — Write-side: server actions wrapping Drizzle transactions

**Why now:** This is the cutover for writes. The `apply()` pipeline from Phase 1 stays; we add a server action per mutation that runs the Drizzle transaction.

**Files to create:**
- `apps/web/lib/db/actions/issues.ts` — server actions: `createIssue`, `updateIssue`, `setStatus`, `setPriority`, `setAssignee`, `bulkArchive`, `reorder`
- `apps/web/lib/db/actions/comments.ts` — `createComment`, `updateComment`, `deleteComment`
- `apps/web/lib/db/actions/notifications.ts` — `markRead`, `markAllRead`, `snooze`
- `apps/web/lib/db/actions/saved-views.ts` — `createSavedView`, `updateSavedView`, `deleteSavedView`, `toggleStarred`
- `apps/web/lib/db/actions/memberships.ts` — `changeRole`, `removeMember`
- `apps/web/lib/db/actions/projects.ts` — `createProject`, `archiveProject`, `renameProject`
- `apps/web/lib/db/actions/cycles.ts` — `createCycle`, `updateCycle`, `completeCycle`
- `apps/web/lib/db/actions/index.ts` — barrel export
- `apps/web/lib/db/transaction.ts` — `withTransaction<T>(fn): Promise<T>` — wraps a function in a Drizzle transaction with the user's session set as the RLS context (via `SET LOCAL request.jwt.claims`)

**`transaction.ts` (the key abstraction):**

```ts
// apps/web/lib/db/transaction.ts
import "server-only";
import { db } from "./client";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export async function withTransaction<T>(
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  const session = await requireAuth();
  return db.transaction(async (tx) => {
    // Set the RLS context for this transaction. RLS functions read
    // `request.jwt.claims` (set via `set_config`); we set it to the
    // session's user external_id, which matches `auth.user.external_id`
    // (set by the 2E-7 trigger).
    await tx.execute(sql`
      SELECT set_config(
        'request.jwt.claims',
        ${JSON.stringify({ sub: session.user.externalId })},
        true
      )
    `);
    return fn(tx);
  });
}
```

**The `apply()` pipeline integration:**

```ts
// apps/web/lib/state/mutations.ts (updated)
import { withTransaction } from "@/lib/db/transaction";
import * as actions from "@/lib/db/actions";

function apply(ctx: MutationContext): void {
  pushToStack(ctx);
  set(produce(...));                  // optimistic UI update (unchanged)
  setPending(ctx.issue.id, true);
  dispatchToast({ ... });

  // New in Phase 4: actually write to Postgres
  withTransaction(async (tx) => {
    try {
      await actions[ctx.op](tx, ctx.input);
      setPending(ctx.issue.id, false);
    } catch (err) {
      setPending(ctx.issue.id, false);
      setLastError({ id: ctx.issue.id, op: ctx.op, message: err.message });
      throw err;
    }
  });
}
```

**The `actions/issues.ts` example (`setStatus`):**

```ts
// apps/web/lib/db/actions/issues.ts
import "server-only";
import { eq } from "drizzle-orm";
import * as s from "@/lib/db/schema";

export async function setStatus(tx: typeof db, input: { issueId: number; status: string }) {
  const [row] = await tx
    .update(s.issues)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(s.issues.id, input.issueId))
    .returning();
  // The 2E trigger emitted an `activities` row in the same transaction.
  // The 2E `updated_at` trigger also fired.
  // RLS ensured the user can write to this issue.
  if (!row) throw new Error("Issue not found or access denied");
  return row;
}
```

**Acceptance criteria:**
- The `apply()` signature in `lib/state/mutations.ts` does not change (the call sites in components do not change)
- Every existing `setStatus` / `setPriority` / `toggleAssignee` / `addIssue` call now writes to Postgres via a server action
- RLS is the only authorization check (the `requireRole` helpers from the previous Convex version are deleted)
- The activity log row is created by the 2E trigger, not by app code
- `lastError` is set on Postgres errors (`mapDrizzleError(err)`); the toast shows a "Retry" button

---

### 4D — Activity log: confirm trigger emissions + RLS reads

**Why now:** Phase 2's `tg_emit_activity()` trigger emits the `activities` row whenever an `issues` / `comments` / `memberships` / `projects` / `cycles` / `labels` / `saved_views` row is inserted/updated/deleted. Phase 4D confirms this works in practice and that the app's `getRecentActivities()` query returns the right rows.

**Files to create:**
- `apps/web/lib/db/actions/activities.ts` — `getRecentActivities({ workspaceId, limit })`, `getActivitiesForObject({ workspaceId, objectType, objectId })`
- `apps/web/app/(workspace)/projects/[key]/activity/page.tsx` — uses `getActivitiesForObject` to render the audit trail

**Files to edit:**
- `apps/web/app/(workspace)/inbox/page.tsx` — uses `getNotifications()` (which is joined with `activities` for context)
- `apps/web/app/(workspace)/home/page.tsx` — uses `getRecentActivities(10)` for the "recent activity" widget

**Acceptance criteria:**
- Updating an issue creates a row in `activities` (visible in Supabase Studio)
- The activity row has the correct `actor_id` (the current user, from `request.jwt.claims`)
- The activity row has the correct `before` and `after` JSON (via `to_jsonb(old)` and `to_jsonb(new)` in the trigger)
- The RLS policy from 2D enforces that user A in workspace X cannot read workspace Y's activities
- The activity feed renders within 300ms (the query is index-backed)

---

### 4E — Supabase Realtime: subscribe to hot tables

**Why now:** Once data flows from Postgres, the next step is **live** data. The Supabase Realtime publication from 2G broadcasts row changes; Phase 4E subscribes the client to those broadcasts.

**Files to create:**
- `apps/web/lib/realtime/client.ts` — singleton `SupabaseClient` for Realtime (uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `apps/web/lib/realtime/subscriptions.ts` — `subscribeToIssues(workspaceId, onChange)`, `subscribeToComments(issueId, onChange)`, `subscribeToNotifications(userId, onChange)`, `subscribeToMemberships(workspaceId, onChange)`, `subscribeToSavedViews(workspaceId, ownerId, onChange)`
- `apps/web/hooks/useRealtimeIssues.ts` — client hook that subscribes on mount, unsubscribes on unmount
- `apps/web/hooks/useRealtimeComments.ts` — same, for the drawer's comment stream
- `apps/web/hooks/useRealtimeNotifications.ts` — same, for the inbox badge

**Files to edit:**
- `apps/web/app/(workspace)/layout.tsx` — on mount, call `subscribeToMemberships(workspaceId, ...)`; on workspace change, re-subscribe
- `apps/web/components/views/grouped-list.tsx` — when issues change in the workspace channel, re-fetch (or apply the patch optimistically)
- `apps/web/components/issue/issue-drawer.tsx` — when comments change in the issue channel, append
- `apps/web/components/shell/top-bar.tsx` — when notifications change, update the inbox badge
- `apps/web/components/team/workspace-switcher.tsx` — when memberships change, re-render the switcher

**Subscription pattern (debounced to avoid re-render storms):**

```ts
// apps/web/hooks/useRealtimeIssues.ts
import { useEffect } from "react";
import { subscribeToIssues } from "@/lib/realtime/subscriptions";
import { useDebouncedCallback } from "use-debounce";

export function useRealtimeIssues(workspaceId: number) {
  const revalidate = useDebouncedCallback(() => {
    router.refresh();  // RSC re-fetch
  }, 200);

  useEffect(() => {
    const sub = subscribeToIssues(workspaceId, () => revalidate());
    return () => sub.unsubscribe();
  }, [workspaceId]);
}
```

**Acceptance criteria:**
- Open the app in two browser tabs as the same user; change an issue in tab 1; tab 2 updates within 1s
- Open the app as two users in the same workspace; user A creates an issue; user B sees it in their list within 1s
- Open the app in two workspaces (different users); user A's change in workspace 1 is NEVER visible to user B (RLS is enforced at the Realtime level — Supabase Realtime runs RLS for each subscriber)
- The subscription cleans up on unmount (no leaked WebSocket connections)
- A new issue creation triggers a `notifications` row for the assignee; the assignee's inbox badge updates within 1s

---

### 4F — RBAC: confirm RLS enforces per-workspace + per-role

**Why now:** Phase 2 wrote the RLS policies; Phase 4F proves they work in the app. The previous plan's `requireRole` helper is **deleted** — RLS is the only guard.

**Files to create:**
- `apps/web/lib/db/_tests/rbac.test.ts` — Vitest tests that prove RLS denies forbidden writes

**Files to delete:**
- `apps/web/lib/auth/rbac-helpers.ts` (from the previous Convex version) — replaced by RLS
- Any other `requireRole` or `requireOwner` helpers that exist in `lib/auth/`

**Tests (in `apps/web/lib/db/_tests/rbac.test.ts`):**
1. A member can update an issue's status in their workspace
2. A member CANNOT delete a workspace they don't own (RLS denies the DELETE)
3. A member CANNOT change another member's role to "owner" (RLS denies the UPDATE)
4. A guest CANNOT see private projects (RLS filters them out)
5. A user with no membership in workspace X sees 0 rows when querying workspace X's tables
6. The `audit_log` RLS policy: a non-admin user can see only their own audit events

**Acceptance criteria:**
- All 6 tests pass
- The grep `grep -r "requireRole\|requireOwner" apps/web/lib apps/web/components apps/web/app` returns zero results (no app-level guards; RLS is the only one)
- A manual pen-test: open a database client, set `request.jwt.claims` to user A in workspace X, try to write to workspace Y's data — RLS denies it

---

### 4G — Cleanup: delete `lib/mock/` data; keep types

**Why now:** All data flows from Postgres. The mock arrays are dead code. We delete them but keep the type definitions (re-exported from `lib/db/types.ts`) for components that import them.

**Files to delete:**
- `apps/web/lib/mock/issues.ts` (data only; keep `Issue` type re-export)
- `apps/web/lib/mock/projects.ts` (data only)
- `apps/web/lib/mock/users.ts` (data only; the `ME_ID` re-export was already deleted in 3L)
- `apps/web/lib/mock/inbox.ts` (data only)
- `apps/web/lib/mock/cycles.ts` (data only)
- `apps/web/lib/mock/labels.ts` (data only)
- `apps/web/lib/mock/index.ts` (the barrel)

**Files to create (or rename):**
- `apps/web/lib/mock/types.ts` (keep) — re-exports the types from `lib/db/types.ts`

**Files to edit (replace import paths):**
- `grep -rl "from.*lib/mock" apps/web/` and update every match to `from "@/lib/db/types"`

**Acceptance criteria:**
- `ls apps/web/lib/mock/` shows only `types.ts`
- `grep -r "from.*lib/mock" apps/web/components apps/web/app apps/web/hooks` returns zero results
- `npm run typecheck` clean
- `npm run build` clean

---

### 4H — Performance: connection pool tuning + prepared statements

**Why now:** Vercel serverless functions can spin up dozens of instances per second. The pg.Pool from Phase 2 was sized for a single instance; we need to tune it for Vercel's concurrency model.

**Files to edit:**
- `apps/web/lib/db/client.ts` — confirm `max: 10` per function instance; document the assumption (each Vercel function instance gets its own pool; PgBouncer in transaction mode multiplexes)
- `supabase/config.toml` — confirm `[db].pooler.default_pool_size` is 15 (Supabase default)
- `apps/web/lib/db/client.ts` — add `statement_timeout: '5s'` to prevent runaway queries
- `apps/web/lib/db/client.ts` — enable Drizzle's `prepare: false` for serverless (Drizzle's prepared statements don't survive PgBouncer's transaction mode)

**Files to create:**
- `docs/runbooks/db-connection-pool.md` — the runbook for pool sizing, PgBouncer modes, and what to do when connections exhaust

**Acceptance criteria:**
- A load test (`apps/web/lib/db/_tests/load.test.ts` with 100 concurrent requests) passes in < 5s
- No connection-exhaustion errors in the Sentry log
- `pg_stat_activity` shows ≤ 15 active connections per pooler (Supabase's default pool size)
- `statement_timeout` is set; a query that takes > 5s is cancelled with a clear error

---

### 4I — Test suite: Vitest + Playwright E2E

**Why now:** Every previous phase added tests. Phase 4I is the integration: the full E2E flow (sign up → create workspace → create project → create issue → assign → close) runs against the live local Supabase, with RLS proving isolation.

**Files to create:**
- `apps/web/lib/db/_tests/integration.test.ts` — full E2E against the seeded local Supabase:
  1. Sign up a new user via Better Auth
  2. Create a workspace
  3. Create a project
  4. Create an issue (transaction emits an `activities` row)
  5. Assign the issue to the user
  6. Change the issue's status
  7. Add a comment
  8. Verify the issue is visible in the user's view
  9. Sign in as a different user; verify cross-workspace isolation
- `e2e/full-flow.spec.ts` — Playwright spec for the same flow through the UI

**Files to edit:**
- `playwright.config.ts` — add a `test:e2e:full` script that runs the full flow
- `package.json` (root) — add `db:test:integration` script

**Acceptance criteria:**
- `npm run db:test:integration` passes
- `npm run test:e2e -- --grep "full-flow"` passes
- The integration test takes < 5s
- Every previous Phase 2/3 test still passes (no regressions in RLS or auth)

---

### 4J — Observability: Sentry, PostHog, structured logging

**Why now:** The app is now talking to a real database. When something breaks in production, we need logs.

**Files to create:**
- `apps/web/lib/observability/sentry.ts` — Sentry init (server + edge + browser)
- `apps/web/lib/observability/posthog.ts` — PostHog init (events only, not pageviews)
- `apps/web/lib/observability/logger.ts` — `pino` logger with request ID, user ID, workspace ID in every log line
- `apps/web/lib/observability/drizzle-logger.ts` — wraps Drizzle's logger to emit a Sentry breadcrumb per query (with duration; warning if > 100ms)

**Files to edit:**
- `apps/web/next.config.ts` — Sentry plugin
- `apps/web/lib/db/client.ts` — pass the Drizzle logger
- `apps/web/lib/db/transaction.ts` — wrap the `withTransaction` body in a Sentry transaction
- `apps/web/middleware.ts` — attach a request ID to every request
- `package.json` — add `@sentry/nextjs`, `posthog-js`, `posthog-node`, `pino`, `pino-pretty`

**Events tracked (PostHog):**
- `user_signed_up` (with `source: 'invite' | 'organic' | 'oauth'`)
- `workspace_created`
- `project_created`
- `issue_created` (with `has_assignee`, `has_label`, `has_due_date` booleans for funnel analysis)
- `issue_status_changed`
- `comment_created`
- `invite_sent`, `invite_accepted`
- `2fa_enabled`
- `passkey_enrolled`

**Acceptance criteria:**
- Open Sentry → no errors in the local dev environment
- Open PostHog → events appear as the user navigates
- A slow query (> 100ms) is logged as a Sentry breadcrumb with the SQL
- A failed Drizzle transaction is captured as a Sentry exception with the user, workspace, and request context

---

## Cross-cutting concerns

- **Animations:** unchanged from Phase 1. The optimistic UI is unchanged; Realtime updates use the same `motion.div layout` for spring follow-through.
- **Accessibility:** unchanged. The `apply()` pipeline is keyboard-only compatible.
- **Performance:** the Drizzle client uses `prepare: false` for serverless + PgBouncer; this is a known limitation of prepared statements across pooled connections. We accept the ~1ms per-query overhead.
- **Type safety:** Drizzle types are the source of truth. `lib/db/types.ts` re-exports `Issue = typeof s.issues.$inferSelect`, etc.
- **Persistence boundary:** Postgres is the source of truth. The Zustand `useIssues` store is now **derived** from the Drizzle query result (RSC). Local state is only for `useUI` (density, command palette, etc.) and the optimistic UI.
- **Multi-tenancy boundary:** RLS at the Postgres level. `withTransaction()` sets `request.jwt.claims` to the user's external_id; the policies from 2D enforce isolation. **No app-level guards.** The `requireRole` helpers from the Convex version are deleted.
- **Activity log:** the 2E trigger emits the `activities` row in the same transaction as the data change. App code never writes to `activities` directly.
- **Realtime:** Supabase Realtime broadcasts row changes; RLS is enforced per subscriber (so user A doesn't receive workspace Y's updates).

---

## File-level change summary

| File / surface | Sub-phase | Type |
| --- | --- | --- |
| `apps/web/lib/db/index.ts` | 4A | new |
| `apps/web/lib/db/rsc.ts` | 4A | new |
| `apps/web/lib/db/errors.ts` | 4A | new |
| `apps/web/lib/db/types.ts` | 4A | new (replaces `lib/mock/types.ts` re-exports) |
| `apps/web/lib/db/transaction.ts` | 4C | new (the `withTransaction` helper) |
| `apps/web/lib/db/actions/issues.ts` | 4C | new |
| `apps/web/lib/db/actions/comments.ts` | 4C | new |
| `apps/web/lib/db/actions/notifications.ts` | 4C | new |
| `apps/web/lib/db/actions/saved-views.ts` | 4C | new |
| `apps/web/lib/db/actions/memberships.ts` | 4C | new |
| `apps/web/lib/db/actions/projects.ts` | 4C | new |
| `apps/web/lib/db/actions/cycles.ts` | 4C | new |
| `apps/web/lib/db/actions/activities.ts` | 4D | new |
| `apps/web/lib/db/actions/index.ts` | 4C | new (barrel) |
| `apps/web/lib/db/_tests/rsc.test.ts` | 4A | new |
| `apps/web/lib/db/_tests/rbac.test.ts` | 4F | new |
| `apps/web/lib/db/_tests/load.test.ts` | 4H | new |
| `apps/web/lib/db/_tests/integration.test.ts` | 4I | new |
| `apps/web/lib/realtime/client.ts` | 4E | new |
| `apps/web/lib/realtime/subscriptions.ts` | 4E | new |
| `apps/web/hooks/useRealtimeIssues.ts` | 4E | new |
| `apps/web/hooks/useRealtimeComments.ts` | 4E | new |
| `apps/web/hooks/useRealtimeNotifications.ts` | 4E | new |
| `apps/web/hooks/useWorkspaceQuery.ts` | 4A | new |
| `apps/web/lib/state/mutations.ts` | 4C | edit (add `withTransaction` to `apply()`) |
| `apps/web/lib/mock/issues.ts` | 4G | delete data, keep type re-export |
| `apps/web/lib/mock/projects.ts` | 4G | delete data |
| `apps/web/lib/mock/users.ts` | 4G | delete data |
| `apps/web/lib/mock/inbox.ts` | 4G | delete data |
| `apps/web/lib/mock/cycles.ts` | 4G | delete data |
| `apps/web/lib/mock/labels.ts` | 4G | delete data |
| `apps/web/lib/mock/index.ts` | 4G | delete |
| `apps/web/lib/auth/rbac-helpers.ts` | 4F | delete (RLS is the only guard) |
| `apps/web/app/(workspace)/inbox/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/my-issues/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/projects/[key]/issues/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/projects/[key]/cycles/[id]/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/projects/[key]/roadmap/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/projects/[key]/activity/page.tsx` | 4D | new |
| `apps/web/app/(workspace)/views/[id]/page.tsx` | 4B | edit (Drizzle query) |
| `apps/web/app/(workspace)/home/page.tsx` | 4B, 4D | edit (Drizzle query) |
| `apps/web/app/(workspace)/layout.tsx` | 4E | edit (Realtime subscription on mount) |
| `apps/web/components/views/grouped-list.tsx` | 4B, 4E | edit (accepts props, optional Realtime hook) |
| `apps/web/components/views/cycle-board.tsx` | 4B, 4E | edit |
| `apps/web/components/issue/issue-drawer.tsx` | 4B, 4E | edit |
| `apps/web/components/inbox/inbox-item.tsx` | 4B | edit |
| `apps/web/components/views/issue-row.tsx` | 4B | edit (verify no `lib/mock` import) |
| `apps/web/components/shell/top-bar.tsx` | 4E | edit (Realtime subscription) |
| `apps/web/components/team/workspace-switcher.tsx` | 4E | edit (Realtime subscription) |
| `apps/web/lib/db/client.ts` | 4H | edit (statement_timeout, prepare: false) |
| `apps/web/lib/observability/sentry.ts` | 4J | new |
| `apps/web/lib/observability/posthog.ts` | 4J | new |
| `apps/web/lib/observability/logger.ts` | 4J | new |
| `apps/web/lib/observability/drizzle-logger.ts` | 4J | new |
| `apps/web/next.config.ts` | 4J | edit (Sentry plugin) |
| `apps/web/middleware.ts` | 4J | edit (request ID) |
| `e2e/full-flow.spec.ts` | 4I | new |
| `playwright.config.ts` | 4I | edit |
| `package.json` (root) | 4I, 4J | edit (test:integration, observability deps) |
| `docs/runbooks/db-connection-pool.md` | 4H | new |

**Net new files: ~30. Net edited files: ~25. Net deleted files: 7. Net new dependencies: `@sentry/nextjs`, `posthog-js`, `posthog-node`, `pino`, `pino-pretty`, `use-debounce`.**

---

## Test coverage summary at end of Phase 4

| Layer | Test count | Tooling |
|---|---|---|
| Phase 2/3 unit + integration | 148 | Vitest + pg |
| Phase 4 unit + RLS + load | ~30 | Vitest + pg + supertest |
| Phase 4 integration (full E2E backend) | 1 (covers 9 assertions) | Vitest + pg |
| E2E (Playwright) | ~52 | Playwright + MSW for OAuth mocks |
| A11y (axe + keyboard) | ~12 | Playwright + axe-core |
| pgTAP (RLS) | 8 | pgTAP against local Supabase |
| **Total** | **~250 tests** | |

---

## Forward-compat with Phases 5–8

- **Phase 5 (live & resilience):** the Realtime subscriptions from 4E are the foundation. Phase 5 adds presence, conflict resolution, search (pgvector), and the page-level error boundaries.
- **Phase 6 (search & AI):** the `embedding` column on `issues` (from 2C) is populated by Phase 6. The `getIssuesForActiveWorkspace` helper from 4A is extended to accept an `embedding` filter.
- **Phase 7 (integrations):** outbound webhooks listen to the same Realtime publication; the file uploads use the same Drizzle RLS-gated pattern.
- **Phase 8 (launch):** the full E2E suite from 4I is the foundation. Lighthouse perf is verified on the now-fast RSC pages (the optimistic UI from Phase 1 + the live updates from 4E give a perceived < 100ms response).

---

## Definition of done (Phase 4 exit criteria)

- [ ] All 10 sub-phases (4A–4J) have their DoD checklists met
- [ ] `lib/mock/` contains only `types.ts`; every data import is from `lib/db/`
- [ ] Every page reads from Drizzle; every mutation writes via `withTransaction`
- [ ] RLS is the only authorization check (no `requireRole` helpers remain)
- [ ] The 2E `tg_emit_activity()` trigger emits rows for every mutation; the activity feed renders them
- [ ] Supabase Realtime broadcasts are received within 1s in the same workspace; never cross-workspace
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all exit 0
- [ ] `npm run db:test` passes 178+ tests
- [ ] `npm run test:e2e` passes 52+ Playwright specs
- [ ] `npm run test:a11y` passes 12+ tests
- [ ] Sentry captures all unhandled errors
- [ ] PostHog tracks the 10 key events
- [ ] The full E2E flow (sign up → workspace → project → issue → assign → close) passes in < 5s

---

## Phase 5 — what's next

Phase 5 lands the live-and-resilience layer: presence, conflict resolution on concurrent edits (Yjs + Supabase Realtime Broadcast), hybrid search (pgvector + tsvector), page-level error boundaries, telemetry, security headers, mobile responsive, transactional email infrastructure, and the activity log / audit trail surface. The app is now feature-complete for closed-beta.
