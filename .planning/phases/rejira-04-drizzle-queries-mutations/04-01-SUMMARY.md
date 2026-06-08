---
phase: 04-drizzle-queries-mutations
plan: 01
subsystem: data-layer
tags: [drizzle, rsc, transactions, rls, errors, observability]
dependency-graph:
  requires: []
  provides: [db-client, transaction-wrapper, rsc-helpers, error-mapper, type-barrel]
  affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08]
tech-stack:
  added:
    - drizzleLogger (in observability)
  patterns: [server-only, set_config for RLS context, withTransaction/withWorkspaceTransaction, mapDrizzleError typed mapping, prepare:false for PgBouncer]
key-files:
  created:
    - apps/web/lib/db/client.ts
    - apps/web/lib/db/transaction.ts
    - apps/web/lib/db/errors.ts
    - apps/web/lib/db/types.ts
    - apps/web/lib/db/rsc.ts
    - apps/web/lib/db/index.ts
    - apps/web/lib/db/_tests/transaction.test.ts
    - apps/web/lib/db/_tests/rsc.test.ts
    - apps/web/lib/observability/drizzle-logger.ts
  modified:
    - apps/web/lib/auth/workspace-helpers.ts
decisions:
  - "RLS context is set via set_config('request.jwt.claims', json, true) so the third arg keeps the setting local to the transaction — no leak across pooled connections"
  - "withTransaction and withWorkspaceTransaction re-call requireAuth() inside the wrapper; the caller's user id is never trusted from the payload"
  - "mapDrizzleError maps 5 SQLSTATE codes (42501/23505/23503/57014/PGRST116) to typed DbError; INTERNAL always returns 'Something went wrong' and captures the raw error in .cause for Sentry"
  - "Drizzle client runs with prepare:false (PgBouncer transaction-mode incompatibility) plus statement_timeout + query_timeout of 5s each, application_name='rejira-web'"
  - "drizzleLogger redaction strips password/token/secret/authorization values from object params before the structured log line; >100ms queries emit console.warn instead of debug"
  - "getActiveWorkspaceId(workspaceSlug?) and getActiveWorkspace(workspaceSlug?) live in workspace-helpers.ts alongside the existing Better Auth wrappers; the rsc.ts and Phase 5+ callers import from there"
  - "getNotifications uses a subquery (SELECT id FROM users WHERE externalId = ?) because notifications.userId is bigint referencing users.id — the Better Auth session only carries the externalId"
  - "RSC helpers re-validate the active workspace on every call (server-component contract: re-resolve on each render); RLS at the DB is defense in depth"
metrics:
  duration: ~37 minutes
  completed: 2026-06-08T20:55:00Z
---

# Plan 04-01 Summary: Drizzle client, RSC helpers, transaction wrapper, error mapper, type barrel

**Status:** COMPLETE (28/28 new tests pass; build green; pre-existing project-wide `drizzle-orm` typecheck resolution issue not introduced by this plan)

**Completed:**

- **Tuned Drizzle client** `apps/web/lib/db/client.ts` — `pg.Pool` now sets `statement_timeout: 5_000`, `query_timeout: 5_000`, `application_name: 'rejira-web'`. Drizzle is called with `prepare: false` (PgBouncer transaction-mode compatibility) and a `drizzleLogger` that warns on queries > 100ms. The whole module is `server-only`.
- **Drizzle logger** `apps/web/lib/observability/drizzle-logger.ts` — typed `DrizzleLogEntry` interface and a `redactParams` helper that strips `password` / `token` / `secret` / `authorization` / `accessToken` / `refreshToken` from object params before any logger call.
- **Error mapper** `apps/web/lib/db/errors.ts` — exports `DbError` (extends Error, has `code` and `status`) and `mapDrizzleError(err)` that switches on the SQLSTATE and returns one of `FORBIDDEN (403)`, `CONFLICT (409)`, `FOREIGN_KEY (409)`, `TIMEOUT (408)`, `NOT_FOUND (404)`, or `INTERNAL (500)`. The original error is captured in `DbError.cause` for Sentry; the user-facing message is always a hardcoded safe string (no SQL, no schema, no row ids).
- **Transaction wrapper** `apps/web/lib/db/transaction.ts`:
  - `withTransaction<T>(fn)` calls `requireAuth()` to re-validate the session, then opens a Drizzle transaction and runs `set_config('request.jwt.claims', json, true)` where the JSON carries `{sub: externalId}`. The `true` arg scopes the setting to this transaction only.
  - `withWorkspaceTransaction<T>(workspaceId, fn)` is the same, with the JSON carrying `{sub, workspace_id}` — this is the form Phase 2 RLS policies in `0002_rls_helpers.sql` evaluate against.
  - Both re-throw as mapped `DbError` on failure.
- **Type barrel** `apps/web/lib/db/types.ts` — re-exports `schema` (as both `schema` and `s`), 12 Drizzle-inferred types (`Issue`, `NewIssue`, `Project`, `NewProject`, `Cycle`, `NewCycle`, `Label`, `NewLabel`, `Comment`, `NewComment`, `Notification`, `NewNotification`, `SavedView`, `NewSavedView`, `Membership`, `NewMembership`, `Activity`, `NewActivity`, `Workspace`, `NewWorkspace`, `User`, `NewUser`, `Invitation`, `NewInvitation`, `Attachment`, `NewAttachment`), and 3 enum value types (`StatusKey`, `PriorityKey`, `CycleStatus`).
- **Server-only barrel** `apps/web/lib/db/index.ts` — re-exports `db`, `DB`, `withTransaction`, `withWorkspaceTransaction`, `mapDrizzleError`, `DbError`, `DbErrorCode`, and `*` from `./types`. `import 'server-only'` at the top.
- **11 RSC read helpers** in `apps/web/lib/db/rsc.ts`:
  - `getIssuesForActiveWorkspace({ assigneeId?, projectId?, cycleId?, status?, includeArchived?, limit? })` — composite where clause, array-contains for assignees, default 500-row cap
  - `getProjects()` / `getProjectByKey(key)`
  - `getCycles({ projectId? })`
  - `getLabels()` / `getIssue(issueId)` / `getComments(issueId)`
  - `getNotifications({ unreadOnly?, limit? })` — uses a subquery to map the Better Auth `externalId` to the internal `users.id` because `notifications.userId` is a `bigint`
  - `getSavedViews()` / `getMemberships()`
  - `getRecentActivities({ workspaceId?, limit? })` — joins `users` for actor display name + color
  - `getActivitiesForObject({ workspaceId?, objectType, objectId, limit? })` — for issue / project / cycle / comment audit trails
  - All helpers re-validate the session and resolve the active workspace on every call (server-component contract)
- **Active-workspace helpers** added to `apps/web/lib/auth/workspace-helpers.ts`: `getActiveWorkspaceId(workspaceSlug?)` and `getActiveWorkspace(workspaceSlug?)` plus the `ActiveWorkspace` type. They read the user's first membership and (optionally) match against a slug from a `?w=` URL param.
- **28 new vitest cases** in two files:
  - `apps/web/lib/db/_tests/transaction.test.ts` — 12 tests covering: callback returns, `set_config` shape (contains externalId, contains `request.jwt.claims`, third arg is `true`), the 5 SQLSTATE mappings (42501→FORBIDDEN, 23505→CONFLICT, 23503→FOREIGN_KEY, 57014→TIMEOUT, PGRST116→NOT_FOUND), the INTERNAL fallback, withWorkspaceTransaction JSON shape, and `redactParams` redaction
  - `apps/web/lib/db/_tests/rsc.test.ts` — 16 tests asserting query plan shape (table, predicate count, joins, ordering, limit) and that helpers re-throw the `requireAuth()` redirect

**Verification (all green):**

- `cd apps/web && npx tsc --noEmit` — no new errors on the 8 new files and the 1 modified `workspace-helpers.ts`. The pre-existing ~190 project-wide `drizzle-orm` named-export resolution errors (the `package.json` `types` field points to a non-existent `index.d.ts`) affect every file that imports from `drizzle-orm`; out of scope per deviation Rule SCOPE BOUNDARY.
- `cd apps/web && npm run lint` — no lint errors on the 8 new files / 1 modified file.
- `cd apps/web && npm run build` — succeeds, all routes compile.
- `npx vitest run --config apps/web/vitest.config.ts apps/web/lib/db/_tests/transaction.test.ts apps/web/lib/db/_tests/rsc.test.ts` — **28/28 pass**.
- `grep "statement_timeout" apps/web/lib/db/client.ts` — **1 match**.
- `grep "prepare: false" apps/web/lib/db/client.ts` — **1 match**.
- `grep "import 'server-only'" apps/web/lib/db/index.ts` — **1 match**.
- `grep "request.jwt.claims" apps/web/lib/db/transaction.ts` — **2 matches** (withTransaction + withWorkspaceTransaction).

**Deviations from Plan:**

1. **`getActiveWorkspaceId` / `ActiveWorkspace` did not exist in `workspace-helpers.ts`.** The plan's interfaces section said "Read `apps/web/lib/auth/workspace-helpers.ts` for the exact signature" but the file pre-dated the plan and exported `getDefaultWorkspace` / `setDefaultWorkspace` instead. Per Rule 2 (auto-add missing critical functionality), I added the two helpers and the `ActiveWorkspace` type at the bottom of that file.
2. **Better Auth user id is the externalId, not a separate `externalId` field.** The plan's action step says `user.externalId`, but `AuthUser` is `typeof auth.$Infer.Session.user` which has no `externalId` field — `user.id` IS the externalId (verified against `account-deletion.ts`, `useUserId`, and `data-export.ts` which all pass Better Auth ids directly to `eq(users.externalId, userId)`). The `userExternalId` helper accepts either name and prefers the explicit field if present, so it stays correct if a future Better Auth change exposes one.
3. **Pre-existing project-wide `drizzle-orm` typecheck resolution failures (~190 errors).** All files that import from `drizzle-orm` (auth files, schema files, 04-01's transaction.test.ts, etc.) have the same "no exported member" errors because `drizzle-orm/package.json` points to a non-existent `index.d.ts`. Out of scope per deviation Rule SCOPE BOUNDARY; my new files match the rest of the codebase's pattern. At runtime, `import { sql, eq, and, isNull, asc, desc } from 'drizzle-orm'` resolves correctly (verified by both vitest runs and `npx tsx`); the failure is purely in `tsc --noEmit`.
4. **`db:test` script and the plan's `npm run db:test -- --filter=...` flag don't compose.** The root `db:test` uses `vitest -t 'auth|db'`; vitest doesn't have a `--filter=` flag (the correct flag is `-t <name>` for a substring/RegExp match against test names). Per scope-boundary, I did not modify the root script — but the intent (run my tests) is satisfied by `npx vitest run --config apps/web/vitest.config.ts -t <name>`, which is what the verification uses.

**Auth-gates:** None. No external services, no API keys, no network calls in the test suite.

**Known Stubs:** None. Every helper that the plan listed is implemented and exercised by at least one test. The `getActiveContext` internal helper is the only thing not exported, and that's intentional (server-component convention: callers always go through a public helper, never raw access to session/workspace).

**Threat Flags:** None new. All surfaces introduced are server-only (the `import 'server-only'` guard). RLS context setting uses the verified session user id (no caller-supplied id ever reaches the `set_config` payload). The error mapper never returns raw SQL or row data in user-facing messages; raw errors flow to Sentry via `.cause` for diagnosis, not to the UI.

**Next plan:** 04-02 (action modules) imports `withWorkspaceTransaction`, `mapDrizzleError`, and the `db` client from this plan. 04-03 (mutation cutover) and 04-05 (RSC read cutover) consume the 11 `getXxx()` helpers. 04-07 (observability wiring) replaces the `console.debug`/`console.warn` in `drizzleLogger` with Sentry breadcrumbs.


## Self-Check: PASSED

- 04-01-SUMMARY.md: present at .planning/phases/rejira-04-drizzle-queries-mutations/04-01-SUMMARY.md
- 2 commits present: 8d3528e (transaction + errors + types + client + logger + index + 12 tests), 9a87e2c (RSC helpers + getActiveWorkspaceId + 16 tests)
- 9 files created, 1 file modified (workspace-helpers.ts)
- 28/28 new tests pass; build green; no new lint errors
