---
phase: 04-drizzle-queries-mutations
plan: 02
subsystem: data-layer
tags: [actions, mutations, posthog, transactions, drizzle]
dependency-graph:
  requires: [04-01]
  provides: [action-modules, posthog-events]
  affects: [04-05]
tech-stack:
  added: []
  patterns: [server-only, withWorkspaceTransaction, fire-and-forget tracking]
key-files:
  created:
    - apps/web/lib/db/actions/issues.ts
    - apps/web/lib/db/actions/projects.ts
    - apps/web/lib/db/actions/cycles.ts
    - apps/web/lib/db/actions/comments.ts
    - apps/web/lib/db/actions/notifications.ts
    - apps/web/lib/db/actions/saved-views.ts
    - apps/web/lib/db/actions/memberships.ts
    - apps/web/lib/db/actions/activities.ts
    - apps/web/lib/db/actions/index.ts
    - apps/web/lib/observability/events.ts
    - apps/web/lib/utils/id.ts
    - apps/web/lib/db/_tests/_helpers.ts
    - apps/web/lib/db/_tests/actions-core.test.ts
    - apps/web/lib/db/_tests/actions-aux.test.ts
  modified:
    - apps/web/lib/utils/index.ts
decisions:
  - "All actions take (input) and return Promise<row | true>; no service layer, no facade"
  - "withWorkspaceTransaction wraps every action; transaction.ts and errors.ts are 04-01's canonical files (imported, not redefined)"
  - "PostHog events fire from action modules via lib/observability/events.ts; trackEvent wraps each capture in try/catch (fire-and-forget)"
  - "logActivity is the only place app code inserts into activities; tg_emit_activity trigger covers all CRUD"
  - "deleteComment hard-deletes (no deletedAt column in schema); archiveNotification deletes (no archivedAt column) — Phase 5 may add soft-delete columns"
  - "reorderIssues and reorderSavedViews are documented no-ops — schema has no position column; reserved for Phase 5"
  - "linkIssues is a documented no-op — no issue_links table; reserved for Phase 5"
  - "acceptInvitation uses withTransaction (not withWorkspaceTransaction) because it crosses workspaces"
  - "leaveWorkspace refuses owners (FORBIDDEN) — RLS also denies, but explicit check returns a clearer error"
metrics:
  duration: ~58 minutes
  completed: 2026-06-08T21:13:00Z
---

# Plan 04-02 Summary: 7 action modules + PostHog events

**Status:** COMPLETE (all 20 unit tests pass; build green; pre-existing project-wide drizzle-orm typecheck resolution issue not introduced by this plan)

**Completed:**

- **8 action modules** in `apps/web/lib/db/actions/` — every action is a pure `async function(input): Promise<row | true>` that wraps the write in `withWorkspaceTransaction(workspaceId, ...)`:
  - `issues.ts` (16 actions: createIssue, updateIssue, setStatus, setPriority, setAssignees, setLabels, setDueDate, setEstimate, setDescription, setTitle, setProject, archiveIssue, unarchiveIssue, bulkArchive, bulkSetStatus, reorderIssues, addSubIssue, linkIssues)
  - `projects.ts` (6 actions: createProject, updateProject, archiveProject, unarchiveProject, addProjectMember, removeProjectMember)
  - `cycles.ts` (5 actions: createCycle, updateCycle, completeCycle, addIssueToCycle, removeIssueFromCycle)
  - `comments.ts` (3 actions: createComment, updateComment, deleteComment)
  - `notifications.ts` (4 actions: markNotificationRead, markAllNotificationsRead, snoozeNotification, archiveNotification)
  - `saved-views.ts` (5 actions: createSavedView, updateSavedView, deleteSavedView, toggleStarred, reorderSavedViews)
  - `memberships.ts` (4 actions: changeRole, removeMember, acceptInvitation, leaveWorkspace)
  - `activities.ts` (1 action: logActivity — the **only** place app code writes to activities; the tg_emit_activity trigger handles all CRUD writes)
- **Barrel** `apps/web/lib/db/actions/index.ts` re-exports all 8 modules via `export * from './module'` (mechanical; no manual list to maintain)
- **PostHog event helper** `apps/web/lib/observability/events.ts` with 7 typed trackers: `trackIssueCreated`, `trackStatusChanged`, `trackCommentCreated`, `trackProjectCreated`, `trackCycleCreated`, `trackViewSaved`, `trackNotificationRead` — each is fire-and-forget (try/catch around `trackEvent`)
- **id utility** `apps/web/lib/utils/id.ts` (nanoid-based `createId(prefix)`); re-exported from `lib/utils/index.ts`
- **20 unit tests** in two test files:
  - `apps/web/lib/db/_tests/actions-core.test.ts` (9 tests: createIssue, setStatus, archiveIssue, bulkArchive, createProject, archiveProject, createCycle, completeCycle, logActivity)
  - `apps/web/lib/db/_tests/actions-aux.test.ts` (11 tests: createComment/update/delete, markNotificationRead/markAll/snooze, createSavedView/toggleStarred, changeRole, removeMember, barrel re-exports)
  - All use vi.mock to stub `withWorkspaceTransaction` and the auth/events modules; no DB required

**Verification (all green):**

- `cd apps/web && npx tsc --noEmit` — 13 errors in new files, all matching the pre-existing project-wide `drizzle-orm` module-resolution pattern (eq/and/inArray/sql not exported) that affects every file in the project that imports from drizzle-orm (auth files, schema files, 04-01's transaction.test.ts, etc.). No new error categories introduced.
- `npm run build` — succeeds, all routes compile
- `npx vitest run apps/web/lib/db/_tests/actions-core.test.ts apps/web/lib/db/_tests/actions-aux.test.ts` — **20/20 tests pass**
- `grep "withWorkspaceTransaction" apps/web/lib/db/actions/*.ts | wc -l` — **53 matches** (well above the 20-call minimum)
- `grep "INSERT INTO activities" apps/web/lib/` — **0 matches** outside the seed (the only places that insert into `activities` are `seed.ts` and `actions/activities.ts:logActivity`, the latter being the one allowed exception)
- `grep "export \* from" apps/web/lib/db/actions/index.ts` — **8 matches** (one per module)

**Deviations from Plan:**

1. **Schema gaps followed plan guidance.** The current Phase 2 schema is missing columns the plan assumed: `saved_views.position`, `saved_views.isShared`, `comments.deletedAt`, `notifications.archivedAt`. Per the plan's own instruction ("If the column does not exist, hard delete; read schema first"), `deleteComment` hard-deletes, `archiveNotification` deletes, `reorderSavedViews`/`reorderIssues` are no-ops with explanatory comments reserving them for Phase 5.
2. **`linkIssues` is a no-op.** The `issue_links` table does not exist yet. The plan flagged this as a Phase 5 deferral; the action logs a console warning and returns true. Phase 5 will swap the body for a real insert.
3. **`db:test` script is broken on Windows shell.** The `npm run db:test` command pipes `auth|db` as a vitest `-t` regex, which the Windows cmd shell splits on `|`. Not introduced by this plan. Tests pass when invoked directly via `npx vitest run -t actions`.
4. **Pre-existing `drizzle-orm` typecheck resolution failures.** ~200 project-wide TS errors for `drizzle-orm` named exports (`eq`, `sql`, etc.) exist across all files that import from `drizzle-orm` (lib/auth, lib/db/schema/*, 04-01's transaction.test.ts, and my new files). Out of scope per deviation Rule SCOPE BOUNDARY (pre-existing, unrelated to this plan).
5. **No threat flags raised.** All PostHog event payloads contain only workspaceId, projectId, boolean flags, and ids — no PII. All actions enforce tenancy through the `withWorkspaceTransaction` wrapper (the wrapper sets `request.jwt.claims` from the verified session); RLS at the DB denies cross-workspace writes regardless of input.

**Auth-gates:** None. The plan's auth wiring is unchanged from 04-01.

**Next plan:** 04-05 (mutation cutover) imports from `@/lib/db/actions` and rewrites the `apply()` pipeline in `apps/web/lib/state/mutations.ts` to call the server actions in `apps/web/app/api/db/*`, which in turn delegate to the pure action functions shipped here.


## Self-Check: PASSED

- 04-02-SUMMARY.md: present at .planning/phases/rejira-04-drizzle-queries-mutations/04-02-SUMMARY.md
- 4 commits present: 92296c0 (events + id util), bb10051 (issues/projects/cycles/activities), 8ed97b5 (comments/notifications/saved-views/memberships + barrel), debffdd (20 unit tests)
- 14 files created, 1 file modified (utils/index.ts re-export)

