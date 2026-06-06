# Phase 4 — Convex queries & mutations

**Status:** not started
**Goal:** Replace mock data (`lib/mock/`) with real Convex queries and mutations. Every page reads from Convex, every state change routes through a Convex mutation. RBAC enforced. The app becomes a real multi-tenant backend.

## Current state vs target

| Layer | Current (Phase 3) | Target (Phase 4) |
|-------|-------------------|------------------|
| Issues | `ISSUES` constant from `lib/mock/issues.ts` | `useQuery(api.issues.list, { workspaceId, filters })` |
| Projects | `PROJECTS` constant | `useQuery(api.projects.list, { workspaceId })` |
| Cycles | `CYCLES` constant | `useQuery(api.cycles.list, { workspaceId, projectId })` |
| Mutations | `apply()` writes to Zustand store | `useMutation(api.issues.update)` → Convex |
| Assignees | Static mock array | `useQuery(api.memberships.list, { workspaceId })` |
| Comments | Mock data | `useQuery(api.comments.list, { issueId })` |
| Notifications | `INBOX` constant | `useQuery(api.notifications.list)` |
| Saved views | `lib/state/saved-views.ts` (localStorage) | `useQuery(api.savedViews.list)` |
| Auth guards | `requireWorkspace` (exists) | Add `requireRole` to every mutation |

## Architecture

```
Browser                    Convex functions
  │                              │
  │ useQuery(api.issues.list)    │ query
  │ ├─ filters (status, assignee)│ ├─ requireWorkspace(ctx, workspaceId)
  │ ├─ sort (priority, due)     │ ├─ db.query("issues").withIndex(...)
  │ └─ group (status, project)  │ └─ returns Issue[]
  │                              │
  │ useMutation(api.issues.setStatus)  │ mutation
  │ └─ { issueId, status }      │ ├─ requireRole(ctx, wsId, "member")
  │                              │ ├─ db.patch(issueId, { status })
  │                              │ ├─ insert activity row
  │                              │ └─ returns updated Issue
```

## Sub-phases

### 4A — Core Convex queries (issues, projects, cycles)

**Files to create:**
- `convex/issues.ts` — `list`, `get`, `create`, `update`, `setStatus`, `setPriority`, `setAssignee`, `bulkArchive`, `reorder`
- `convex/projects.ts` — `list`, `get`
- `convex/cycles.ts` — `list`, `get`

**Files to edit:**
- `apps/web/lib/state/issues.ts` — replace `useIssues` with `useQuery(api.issues.list)`
- `apps/web/app/(workspace)/*/page.tsx` — wire real data

### 4B — Mutations (replace `apply()`)

**Files to create:**
- `convex/rbac.ts` — `can(user, action, resource)` + `requireRole` wrappers

**Files to edit:**
- `apps/web/lib/state/mutations.ts` — `apply()` calls Convex mutations instead of Zustand

### 4C — Comments, notifications, saved views

**Files to create:**
- `convex/comments.ts`
- `convex/notifications.ts`
- `convex/savedViews.ts`

### 4D — Activity/audit log

**Files to edit:**
- Every mutation writes to `activities` table

### 4E — Cleanup

**Files to delete:**
- `apps/web/lib/mock/issues.ts` `ISSUES` array (keep type definitions)
- `apps/web/lib/mock/inbox.ts` `INBOX` array
- `apps/web/lib/state/saved-views.ts` localStorage logic

## Tests (4 per sub-phase)

```
convex/_tests/issues.test.ts  — list, filter, sort, group, create, update, delete
convex/_tests/projects.test.ts — list, get
convex/_tests/cycles.test.ts  — list, get
convex/_tests/rbac.test.ts    — role checks, cross-workspace isolation
```

## Acceptance criteria
- [ ] `ISSUES` constant removed; data flows from Convex
- [ ] Every `apply()` call routes through a Convex mutation
- [ ] All queries scoped by `workspaceId` + `requireWorkspace`
- [ ] Mutations write `activities` rows
- [ ] Tests pass (20 existing + ~20 new)
- [ ] Build passes, deploy succeeds
