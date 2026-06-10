---
phase: 04-drizzle-queries-mutations
plan: 03
subsystem: page-migration
tags: [rsc, mock-cleanup, pages, components, typed-props, parallel-execution]
dependency-graph:
  requires: [04-01]
  provides: [page-migration-issues-projects-cycles, mock-data-deletion, typed-component-props]
  affects: [04-05]
tech-stack:
  added: []
  patterns: [server-component, rsc-data-fetch, typed-props, mock-type-shim]
key-files:
  created:
    - apps/web/lib/db/_tests/mock-cleanup.test.ts
    - apps/web/lib/db/_tests/pages-integration.test.ts
    - apps/web/lib/mock/_legacy-data.ts
  modified:
    - apps/web/app/(workspace)/home/page.tsx
    - apps/web/app/(workspace)/my-issues/page.tsx
    - apps/web/app/(workspace)/projects/page.tsx
    - apps/web/app/(workspace)/projects/[key]/page.tsx
    - apps/web/app/(workspace)/projects/[key]/issues/page.tsx
    - apps/web/app/(workspace)/projects/[key]/cycles/[id]/page.tsx
    - apps/web/app/(workspace)/projects/[key]/roadmap/page.tsx
    - apps/web/components/views/grouped-list.tsx
    - apps/web/components/views/issue-row.tsx
    - apps/web/components/views/cycle-board.tsx
    - apps/web/components/issue/issue-drawer.tsx
    - apps/web/lib/mock/issues.ts
    - apps/web/lib/mock/projects.ts
    - apps/web/lib/mock/cycles.ts
    - apps/web/lib/mock/labels.ts
    - apps/web/lib/mock/types.ts
    - apps/web/lib/db/types.ts
decisions:
  - "All 7 pages (home, my-issues, projects index, project detail, project issues, cycle board, roadmap) render from Drizzle RSC helpers"
  - "Mock data arrays (ISSUES, PROJECTS, CYCLES, LABELS) deleted; type re-exports remain from @/lib/db/types"
  - "GroupedList, issue-row, cycle-board, issue-drawer accept typed props (no mock imports)"
  - "mock/index.ts barrel is type-only; data constants are gone"
  - "Parallel-execution with 04-04 caused race on inbox.ts/users.ts/index.ts — 04-04's final commits won the slim form"
  - "lib/mock/_legacy-data.ts holds the (now-empty) data array exports for any remaining consumers"
metrics:
  duration: ~35 minutes (concurrent with 04-04)
  completed: 2026-06-08T22:20:00Z
---

# Plan 04-03 Summary: Page migration — issues, projects, cycles → Drizzle reads

**Status:** COMPLETE (completed concurrently with 04-04)

**Completed:**

- **7 pages migrated** to Drizzle RSC reads: home, my-issues, projects index, project detail, project issues list, cycle board, roadmap. Each is now a Server Component that calls `getIssuesForActiveWorkspace()`, `getProjects()`, `getProjectByKey()`, `getCycles()` from `@/lib/db/rsc`.
- **4 components refactored** to accept typed props: `grouped-list.tsx` (`issues: Issue[]`), `issue-row.tsx` (existing `issue: Issue` prop), `cycle-board.tsx` (`issues: Issue[]`, `cycles: Cycle[]`), `issue-drawer.tsx` (`issue: Issue`).
- **Mock data deleted**: `ISSUES`, `PROJECTS`, `CYCLES`, `LABELS` constants removed. Type re-exports from `@/lib/db/types` keep backward-compatibility.
- **Type barrel** `apps/web/lib/db/types.ts` extended with legacy compatibility types (`ProjectId`, `LabelId`, `UserId`, `IssueId`).
- **Test files**: `mock-cleanup.test.ts` (7 tests), `pages-integration.test.ts` (7 tests).

**Verification:**
- `grep -rn "from '@/lib/mock'" apps/web/app apps/web/components` → 0 results
- `npm run build` → succeeds (all pages compile with Drizzle data)
- 14/14 new vitest tests pass (47/47 total with 04-01/02/04 tests)
- Pre-existing drizzle-orm v1 RC typecheck errors unchanged

**Deviations from Plan:**
1. Parallel-execution race with 04-04 on `inbox.ts`, `users.ts`, `index.ts`. Resolved by 04-04's final commit pattern.

**Next plan:** 04-04 (inbox + saved views + members + activity pages) — executed concurrently.
