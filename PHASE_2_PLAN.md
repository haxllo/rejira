# Phase 2 — Data layer (Convex)

**Status:** ✅ Complete (streams 2A, 2B, 2C, 2D, 2E all green)
**Owner:** opencode

## Status of each workstream

| Stream | Title | Status |
| --- | --- | --- |
| 2A | Convex project + dev deployment | ✅ Done — `convex.json` + `.env.local` auto-generated; deployment `giddy-spider-106` under `muhammad-rahman/rejira` |
| 2B | Schema (14 entities + 39 indexes) | ✅ Done — `convex/schema.ts` with shared validators + `convex/_lib/schema_types.ts` |
| 2C | Seed + demo data | ✅ Done — `convex/seed.ts` internal mutation; verified counts (1 ws, 12 users, 4 projects, 30 issues, 3 cycles, 10 labels, 7 comments, 10 notifications, 12 activities); idempotent (second run = zero new rows) |
| 2D | Multi-tenant helpers + isolation tests | ✅ Done — `requireWorkspace` + `requireRole` in `convex/_lib/tenancy.ts`; 11/11 vitest tests passing in `convex/_tests/` |
| 2E | Local dev DX + CI + .env.example | ✅ Done — `.env.example` (root + `apps/web/`), README "First-time setup" section, `.github/workflows/ci.yml`, expanded root `.gitignore` |

## Phase 2 DoD — final check

- [x] Schema in `convex/schema.ts`; deploys to a real Convex deployment (`giddy-spider-106`)
- [x] `npm run convex:seed` runs the seed and is idempotent
- [x] Multi-tenant isolation tests cover happy + 4 error paths (forbidden / not-found / archived / role-rejected)
- [x] `npm run typecheck` exits 0
- [x] `npm run build` exits 0
- [x] `npm run convex:test` exits 0 (11/11 tests pass)
- [x] `.env.example` committed at root + `apps/web/`
- [x] `.github/workflows/ci.yml` runs typecheck + convex-test + build on every PR
- [x] `.gitignore` keeps `_generated/api.d.ts` and `_generated/dataModel.d.ts`, ignores `server.js`, `server.d.ts`, `api.js`
- [x] No UI changes (app still reads `lib/mock/`) — verified by `npm run build` succeeding with no Convex-backed components imported
**Goal:** Stand up a real, multi-tenant, multi-workspace data backend that the app can talk to. The UI does not change. The data still flows from `lib/mock/` in this phase. Phase 2 lays the typed foundation that Phase 3 (auth) and Phase 4 (queries/mutations) build on.

Convex replaces the plan-time Drizzle + Postgres + migrations + seed-script + indexes stack with one TypeScript file: `convex/schema.ts`. There is no migration system — Convex tracks schema versions and applies them atomically. There is no seed script runbook — `convex/seed.ts` is an internal mutation, called once, idempotent.

---

## Scope summary (from `PLAN.md`)

> Phase 2 — Data layer (Convex)
> - `convex/schema.ts` with all 14 entities, indexes, and `workspaceId` everywhere
> - `convex/seed.ts` populates the demo workspace
> - Multi-tenant queries isolated; cross-workspace access impossible
> - Local dev with `npx convex dev`; CI schema validation per PR
> - No UI changes; the app still reads from `lib/mock/`

**Plus what is implied but not yet planned:**
- Convex at the **repo root** (not `apps/web/convex/`) — shared by future mobile and any other consumer
- **Stable external IDs** (`externalId: v.string()`) alongside Convex's `_id`, so the seed can preserve the existing mock `i_1001` / `u_aria` keys for debugging, URL stability, and one-way parity tests
- A **demo identity** constant (`ME_ID = "u_aria"`) for this phase — replaced by Better Auth in Phase 3
- A **dev-only public seeding mutation** — never callable from the client; only from `npx convex run seed:seed`
- A **schema-validation CI step** — `npx convex dev --once` runs the schema compile on every PR

---

## What is already in place

| Surface | State |
|---|---|
| `lib/mock/types.ts` with `User`, `Project`, `Cycle`, `Label`, `Issue`, `Comment`, `Activity`, `InboxItem` | ✅ |
| `lib/mock/issues.ts`, `projects.ts`, `users.ts`, `inbox.ts` exporting the demo dataset | ✅ |
| `lib/state/view-query.ts` with `FilterState`, `GroupBy`, `SortKey`, `SortDir`, `EMPTY_FILTER` | ✅ |
| `lib/state/saved-views.ts` with the `SavedView` shape (used by Phase 4) | ✅ |
| Workspace context in the UI (workspace switcher, `?w=...` URL param) | ❌ — Phase 3 |
| Real user identity (replaces `ME_ID`) | ❌ — Phase 3 |
| Any Convex project, deployment, or function | ❌ — Phase 2 |

**Known gap to plan around:** Convex's auto-generated `_id` is opaque and changes per environment. The mock data uses string keys like `i_1001`, `u_aria`, `c_23`, etc. To preserve linkability (deep links, screenshot stability, cross-environment data portability) every entity gets a separate `externalId: v.string()` field that we use everywhere in the UI; Convex's `_id` is for joins only.

---

## Workstreams

```
                    ┌──────────────────────────┐
                    │  2A  Convex project +    │
                    │      dev deployment      │
                    └────────────┬─────────────┘
                                  │ unblocks schema/seed work
                                  ▼
                    ┌──────────────────────────┐
                    │  2B  Schema (14 entities │
                    │      + indexes)          │
                    └────────────┬─────────────┘
                                  │ unblocks seed/queries/tests
                                  ▼
                    ┌──────────────────────────┐
                    │  2C  Seed + demo data    │
                    │      (internal mut)      │
                    └────────────┬─────────────┘
                                  │ unblocks tests
                                  ▼
                    ┌──────────────────────────┐
                    │  2D  Multi-tenant        │
                    │      helpers + isolation │
                    │      tests               │
                    └────────────┬─────────────┘
                                  │ can run in parallel
                                  ▼
                    ┌──────────────────────────┐
                    │  2E  Local dev DX + CI + │
                    │      .env.example        │
                    └──────────────────────────┘
```

Streams 2B and 2C have a hard dependency (schema must compile before seed can reference tables). Streams 2D and 2E can be parallelised once 2B lands.

---

### 2A — Convex project + dev deployment  *(foundation, blocks everything else)*

**Why first:** We need a live Convex project to push schema and functions to. The deployment is per-developer (each contributor gets a free dev deployment); the production deployment is provisioned later.

**Tasks:**

1. **Install the CLI** — Convex ships as a Node package; we use it through `npx` to avoid committing to a global install.
   - `npx convex@1.40 --version` (already verified working)
   - No `package.json` entry — the CLI is invoked per command in `npm` scripts and CI

2. **Create a Convex project** — `npx convex dev --once` from the repo root
   - Prompts the user to log in (GitHub OAuth)
   - Prompts for a project name (`rejira`)
   - Writes `convex.json` to the repo root with `{ "functions": "convex/" }` and the deployment URL
   - Provisions a free dev deployment

3. **Choose directory layout** — put the `convex/` directory at the **repo root**, not inside `apps/web/`:
   - Reason 1: the next consumer (a future `apps/mobile/`) will need the same functions
   - Reason 2: Convex's auto-generated `_generated/` API types are workspace-shared; easier to consume from `apps/web/`
   - Reason 3: keeps `apps/web/` focused on the Next.js app
   - The `apps/web/` package will import from `convex/_generated/api` via a workspace-relative path

4. **Update root `package.json`** to add a Convex dev script that runs alongside `next dev`:
   ```json
   {
     "scripts": {
       "convex:dev": "npx convex dev",
       "convex:deploy": "npx convex deploy",
       "convex:run": "npx convex run",
       "dev": "concurrently -k -n convex,next \"npm:convex:dev\" \"npm --prefix apps/web run dev\"",
       "dev:web": "npm --prefix apps/web run dev"
     }
   }
   ```
   - Add `concurrently` (devDep)
   - The user runs `npm run dev` to get Convex hot-reload + Next dev on the same terminal

5. **Commit `convex.json`** to the repo (it has the deployment URL but no secrets)
6. **Gitignore** `convex/_generated/*` from the working tree but commit `convex/_generated/api.d.ts` and `convex/_generated/dataModel.d.ts` so the Next.js app can type-check against the schema without running Convex first
   - Add to `.gitignore`: `convex/_generated/server/*` (private to the local CLI)
   - Keep: `convex/_generated/api.d.ts`, `convex/_generated/dataModel.d.ts`
   - This is a deviation from the Convex docs but matches the "no secrets in git" rule and keeps the repo small

7. **Add `convex/_generated/README.md`** explaining the generated directory contract to future contributors

**Files to create / edit:**
- `convex.json` (auto-generated; committed)
- `convex/_generated/README.md` (new; explains the layout)
- `convex/.gitignore` (new; excludes `server/*`)
- `package.json` (root) — add `convex:*` scripts + `concurrently`
- `.gitignore` — add `apps/web/.env.local`, `apps/web/.env*`, `!.env.example`
- `README.md` — first-time setup section

**Acceptance criteria:**
- `npx convex dev --once` succeeds; the convex dashboard at https://dashboard.convex.dev shows an empty deployment
- The repo's `convex/` directory exists with `_generated/` populated and `schema.ts` (empty stub for now)
- `npm run dev` runs Convex and Next dev concurrently with prefixed output
- `npx convex dashboard` opens the correct deployment

---

### 2B — Schema (14 entities + indexes)  *(depends on 2A; blocks 2C, 2D)*

**Why now:** Every other stream consumes the schema. The schema is the contract.

**Tasks:**

1. **Write `convex/schema.ts`** with `defineSchema({...})` for the 14 entities below. Every entity except `workspaces` and `users` carries a `workspaceId: v.id("workspaces")` foreign key. Every entity carries an `externalId: v.string()` (the stable, environment-portable identifier from the mock data: `"i_1001"`, `"u_aria"`, `"c_23"`, etc.).

2. **Entity list** (mapped from `lib/mock/types.ts` and `PLAN.md` §2.2):

   | Table | Purpose | Key fields | Indexes |
   |---|---|---|---|
   | `users` | Global user identity (one account, many workspaces) | `email`, `name`, `avatarColor`, `status` | `by_email` (unique) |
   | `workspaces` | Top-level tenant | `name`, `slug`, `ownerId`, `archivedAt?` | `by_slug` (unique) |
   | `memberships` | Join: user ↔ workspace, with role | `userId`, `workspaceId`, `role` | `by_user`, `by_workspace`, `by_user_workspace` (unique) |
   | `projects` | Project (a.k.a. "team" in Linear) within a workspace | `workspaceId`, `key`, `name`, `lead`, `archivedAt?` | `by_workspace`, `by_workspace_key` (unique), `by_workspace_archived` |
   | `projectMembers` | Many-to-many: project ↔ users (per-project visibility) | `projectId`, `userId` | `by_project`, `by_user`, `by_project_user` (unique) |
   | `labels` | Issue labels (per-project) | `workspaceId`, `projectId`, `name`, `color` | `by_workspace`, `by_project` |
   | `issues` | The primary entity | `workspaceId`, `projectId`, `key`, `number`, `title`, `status`, `priority`, `assigneeIds[]`, `labelIds[]`, `cycleId?`, `dueDate?`, `estimatePoints?`, `parentId?`, `archivedAt?` | `by_workspace`, `by_workspace_status`, `by_workspace_project`, `by_workspace_assignee`, `by_workspace_label`, `by_workspace_due`, `by_project_number` (unique) |
   | `issueAssignees` | Many-to-many join for `issues.assigneeIds[]` (allows Phase 5 queries like "issues assigned to me") | `issueId`, `userId` | `by_issue`, `by_user_workspace` |
   | `cycles` | Sprints per project | `workspaceId`, `projectId`, `number`, `name`, `status` | `by_workspace`, `by_project` |
   | `cycleIssues` | Many-to-many: cycle ↔ issues | `cycleId`, `issueId` | `by_cycle`, `by_issue` |
   | `savedViews` | User-saved filter combos | `workspaceId`, `ownerId`, `name`, `filter`, `group`, `sortKey`, `sortDir`, `starred` | `by_workspace_owner`, `by_workspace_owner_starred` |
   | `comments` | Issue comments | `workspaceId`, `issueId`, `authorId`, `body`, `createdAt` | `by_workspace_issue`, `by_workspace_issue_created` |
   | `notifications` | Inbox items | `workspaceId`, `userId`, `type`, `issueId?`, `read`, `snoozedUntil?`, `createdAt` | `by_user_read`, `by_user_workspace_created` |
   | `activities` | Audit trail of every mutation (powers Inbox + project activity log) | `workspaceId`, `actorId`, `verb`, `objectType`, `objectId`, `before`, `after`, `createdAt` | `by_workspace_created`, `by_workspace_object` |

3. **Type discipline:**
   - Use `v.union(v.literal("backlog"), ..., v.literal("cancelled"))` for the 6 `StatusKey` values
   - Same for `PriorityKey` (5 values)
   - `assigneeIds: v.array(v.id("users"))` — joins through `issueAssignees` for cross-table queries
   - `labelIds: v.array(v.id("labels"))` — same pattern
   - `filter` (on `savedViews`) stored as `v.any()` for now; Phase 4 re-types it to a discriminated union validator
   - All timestamps are `v.number()` (Unix ms); ISO strings converted at the boundary
   - `archivedAt: v.optional(v.number())` on `workspaces`, `projects`, `issues` for soft delete

4. **Indexes that must be declared** (Convex's `ctx.db.query(idx)` requires an index for the leading field — no exceptions):
   - Composite indexes for every "list view" the app shows: inbox, my-issues, project issues, cycle board
   - Every "by_workspace_*" index has `workspaceId` as the first field — this is the multi-tenant boundary
   - The `by_user_workspace` index on `issueAssignees` powers "all issues assigned to me in this workspace" — a critical inbox query

5. **`convex/_generated/dataModel.d.ts`** is auto-generated from this schema. The `Doc<"issues">` type is what the rest of the app imports for type-safe reads.

6. **Write a `convex/_lib/schema-types.ts`** that re-exports the `StatusKey`, `PriorityKey`, etc. as TS types derived from the validators (`v.Infer<typeof statusKey>`). This lets the rest of the app import these without re-declaring them.

**Files to create / edit:**
- `convex/schema.ts` (new) — the 14 entities + indexes
- `convex/_lib/schema-types.ts` (new) — derived TS types
- `convex/tsconfig.json` (new) — Convex's compiler is separate from Next.js; strict mode, no emit
- `apps/web/lib/convex/index.ts` (new) — re-exports the schema types for the Next.js app: `import type { Doc, Id } from "../../../convex/_generated/dataModel"`

**Acceptance criteria:**
- `npx convex dev --once` deploys the schema with no errors
- The Convex dashboard "Schema" tab shows all 14 tables with the expected fields and indexes
- `tsc --noEmit` from the repo root passes (Convex types are first-class TS types)
- Every business table has `workspaceId` as the first indexed field
- The `_generated/` directory is checked in (api.d.ts, dataModel.d.ts only)

---

### 2C — Seed + demo data  *(depends on 2B; blocks 2D)*

**Why now:** We need data in the database before we can test multi-tenant isolation. The seed is also the source of truth for "what does the demo workspace look like" — every new contributor runs the same seed and gets the same starting state.

**Tasks:**

1. **Create `convex/seed.ts`** as an **internal mutation** (not query, not external mutation):
   - Internal mutations can only be called by other Convex functions or `npx convex run`, not by the client
   - The CLI command: `npx convex run seed:seed`
   - The function reads `lib/mock/issues.ts` (and friends) and writes to Convex

2. **Idempotency strategy:**
   - On first run: create workspace, projects, users, cycles, labels, issues, etc.
   - On subsequent runs: if a row with `externalId === "i_1001"` already exists, skip it
   - This means re-running the seed never duplicates or breaks anything — safe to run on every fresh dev environment

3. **Reference integrity (in order):**
   1. Create the demo workspace (`externalId: "w_acme"`, `slug: "acme"`)
   2. Create the demo user identity (`externalId: "u_aria"`, `email: "aria@acme.dev"`) — Phase 3 will promote this to a real auth user
   3. Create the membership `("u_aria", "w_acme", "owner")`
   4. Create the other 11 users (mock data) and memberships
   5. Create the 4 projects with `lead` and `projectMembers`
   6. Create the 10 labels
   7. Create the 3 cycles
   8. Create the 30 issues, with the 4 cycleIssues links
   9. Create the 8 comments
   10. Create the 10 inbox items
   11. Create the 5 seed activities (so the activity log is non-empty in the UI)

4. **Map mock fields → Convex fields:**
   - `i_1001` → `externalId: "i_1001"`, `_id: <auto>`
   - `assigneeIds: ["u_aria", "u_kenji"]` → write 2 `issueAssignees` rows; the issue's own `assigneeIds: v.array(v.id("users"))` mirrors the join for fast reads
   - `createdAt: "2026-05-22T09:14:00Z"` → `new Date(iso).getTime()`
   - `ME_ID` constant stays as `"u_aria"` for Phase 2; Phase 3 replaces it with `useSession().userId`

5. **`ME_ID` replacement strategy:**
   - Keep the constant in `apps/web/lib/mock/users.ts` for now
   - Add a one-line re-export from `apps/web/lib/auth/demo-session.ts` that says "this is a placeholder for Better Auth; will be removed in Phase 3"
   - When Phase 3 lands, we delete the constant and use `useSession().userId`

6. **Refactor `lib/mock/index.ts`** to **NOT** export the demo constants as the source of truth anymore. Keep them as fixtures for tests. The Convex seed reads them, the UI reads from Convex (Phase 4), and the fixtures become unit-test inputs.

7. **Seed command in root `package.json`:**
   ```json
   "convex:seed": "npx convex run seed:seed"
   ```

8. **Verify with the Convex dashboard:** the seed run is visible in the "Functions" tab; data is inspectable in the "Data" tab; row counts match the mock (30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items).

**Files to create / edit:**
- `convex/seed.ts` (new) — internal mutation, idempotent, reads from `lib/mock/`
- `apps/web/lib/auth/demo-session.ts` (new) — placeholder for `ME_ID`
- `apps/web/lib/mock/users.ts` (edit) — re-export `ME_ID` from `demo-session.ts` to keep all current call sites working
- `apps/web/lib/mock/index.ts` (edit) — add a `// TODO Phase 4: remove this re-export` comment; keep it as a fixture
- `package.json` (root) — add `convex:seed` script

**Acceptance criteria:**
- `npm run convex:seed` against a fresh deployment creates the demo workspace with 30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items
- Running the same command again produces zero new rows (idempotent)
- The Convex dashboard "Data" tab shows the seeded rows
- No code in `apps/web/` reads from `lib/mock/` for runtime data anymore (tests only) — **deferred to Phase 4**; in Phase 2 the UI is unchanged

---

### 2D — Multi-tenant helpers + isolation tests  *(depends on 2B, 2C)*

**Why now:** Multi-tenancy is the property we cannot lose. Tests that prove "user A in workspace X cannot see workspace Y's data" are the safety net. Convex's `ctx.auth.getUserIdentity()` will be wired in Phase 3 — in this phase we use a `ME_ID`-based stub.

**Tasks:**

1. **`convex/_lib/tenancy.ts`** — workspace-scoped helpers:
   ```ts
   export async function requireWorkspace(
     ctx: QueryCtx | MutationCtx,
     workspaceId: Id<"workspaces">,
   ): Promise<{ role: "owner" | "admin" | "member" | "guest" }> {
     // In Phase 2: look up membership by ME_ID
     // In Phase 3: look up membership by ctx.auth.getUserIdentity().subject
     const meId = getDemoUserId(); // temporary
     const membership = await ctx.db
       .query("memberships")
       .withIndex("by_user_workspace", (q) =>
         q.eq("userId", meId).eq("workspaceId", workspaceId),
       )
       .unique();
     if (!membership) throw new ConvexError("Not a member of this workspace");
     return { role: membership.role };
   }

   export function workspaceQuery(workspaceId: Id<"workspaces">) {
     // Helper that returns a query builder pre-scoped to a workspace
     // Used by every read: ctx.db.query("issues").withIndex("by_workspace", q => q.eq("workspaceId", workspaceId))
   }
   ```

2. **Test framework** — Convex's official `convex-test` library (or `convex-helpers/testing`):
   - `pnpm add -D convex-test` (workspace: root)
   - Each test file under `convex/_tests/`
   - Tests run in a pure-JS Convex runtime; no real deployment needed
   - CI: `npx vitest run convex/_tests/` (add vitest as devDep)

3. **Test files:**
   - `convex/_tests/seed.test.ts` — the seed creates exactly the expected counts; running twice is idempotent
   - `convex/_tests/tenancy.test.ts` — given two seeded workspaces, a user from workspace A can read workspace A's data and gets a `ConvexError` when trying to read workspace B's data
   - `convex/_tests/indexes.test.ts` — every "by_workspace_*" index query used by the app has a corresponding index declared in the schema
     - This is a static analysis test: parse `convex/schema.ts` and `convex/*.ts` (other than schema), check that no `ctx.db.query` call has a filter on `workspaceId` without a `withIndex("by_workspace_*")` follow-up

4. **`requireWorkspace` test cases:**
   - ✅ Returns the role when the user is a member
   - ❌ Throws `ConvexError("Not a member of this workspace")` when the user is not a member
   - ❌ Throws `ConvexError("Workspace not found")` when the workspace is archived or doesn't exist
   - ❌ Throws `ConvexError("Workspace archived")` when `archivedAt` is set

5. **Owner / admin / member / guest permission tests** — `requireRole(ctx, workspaceId, "owner" | "admin")` for the few mutations that need it. Full RBAC is Phase 4; here we establish the pattern.

**Files to create / edit:**
- `convex/_lib/tenancy.ts` (new)
- `convex/_lib/errors.ts` (new) — `ConvexError` helpers (`notFound`, `forbidden`, `archived`)
- `convex/_tests/seed.test.ts` (new)
- `convex/_tests/tenancy.test.ts` (new)
- `convex/_tests/indexes.test.ts` (new)
- `convex/_tests/setup.ts` (new) — seed helper used by every test
- `package.json` (root) — add `convex:test` script + `vitest`, `convex-test` devDeps

**Acceptance criteria:**
- `npm run convex:test` runs the four test files and they all pass
- The tenancy test fails when a query helper forgets to scope by `workspaceId` (regression-proof)
- The indexes test fails when a new query is added without a corresponding index
- No `ctx.db.query` in the `convex/` directory is unindexed

---

### 2E — Local dev DX + CI + .env.example  *(parallel after 2A)*

**Why now:** The first contributor onboarding story matters more than people think. "How do I get a working dev environment?" should be one command: `npm i && npm run dev`.

**Tasks:**

1. **`.env.example`** at the repo root (and a copy in `apps/web/`) with every variable the app needs, with a comment explaining each:
   ```bash
   # Convex
   CONVEX_DEPLOY_KEY=                 # auto-populated by `npx convex dev`
   NEXT_PUBLIC_CONVEX_URL=            # auto-populated by `npx convex dev`

   # Better Auth (Phase 3 — placeholder for now)
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=http://localhost:3000

   # Resend (Phase 3 — magic-link email)
   RESEND_API_KEY=

   # Google OAuth (Phase 3)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Sentry (Phase 5)
   SENTRY_DSN=
   SENTRY_AUTH_TOKEN=
   ```
   - `.env.local` is gitignored
   - `.env.example` is checked in
   - `npx convex dev` auto-populates `CONVEX_DEPLOY_KEY` and `NEXT_PUBLIC_CONVEX_URL` on first run

2. **`README.md`** — "First-time setup" section:
   ```bash
   # 1. Clone + install
   git clone <repo>
   cd rejira
   npm install

   # 2. Log in to Convex (one-time per machine)
   npx convex login

   # 3. Start everything
   npm run dev
   # → starts Convex dev (hot-reload) and Next dev (port 3000) in the same terminal

   # 4. Seed the demo workspace (one-time, idempotent)
   npm run convex:seed
   ```

3. **CI workflow** — `.github/workflows/ci.yml`:
   - Job 1: `npm ci` then `npm run typecheck` then `npm run lint`
   - Job 2: `npx convex dev --once` (validates the schema; doesn't push)
   - Job 3: `npm run convex:test` (runs the isolation tests against a per-PR Convex preview deployment)
   - Job 4: `npm run build` (Next.js production build)

4. **Convex preview deployments per PR:**
   - Convex's GitHub app auto-creates a preview deployment on every PR
   - The preview deployment is wiped when the PR closes
   - The seed runs against the preview deployment in CI job 3
   - This gives every PR a fully-functional backend to point a preview Next.js deploy at

5. **Convex dashboard aliasing:**
   - `npm run convex:dashboard` → `npx convex dashboard`
   - In the team Slack: pin the production deployment URL

**Files to create / edit:**
- `.env.example` (new, at repo root)
- `apps/web/.env.example` (new, copy with no `CONVEX_DEPLOY_KEY` since that lives at root)
- `README.md` (edit — "First-time setup" section)
- `.github/workflows/ci.yml` (new)
- `package.json` (root) — add `convex:dashboard`, `convex:test` scripts

**Acceptance criteria:**
- A new contributor can clone, run `npm install`, `npx convex login`, `npm run dev`, and have a working dev environment with seeded data
- `npx convex dev --once` exits 0 in CI (schema compiles)
- `npm run convex:test` exits 0 in CI (isolation tests pass against a per-PR deployment)
- `.env.example` is up to date with every variable the app needs in Phases 2-8

---

## Cross-cutting concerns

- **Animations:** none. This phase has no UI.
- **Accessibility:** none. This phase has no UI.
- **Performance:** Convex's index-driven queries are sub-10ms for our scale (30 issues, 4 projects). We don't need a cache layer in Phase 2; Convex's query cache is implicit.
- **Type safety:** every schema field has a Convex validator. The `Doc<"issues">` type is the source of truth. No `any` except for the `filter` field on `savedViews` (Phase 4 re-types it).
- **Persistence boundary:** `lib/mock/` becomes a fixture file (read by the seed). The runtime data lives in Convex. In Phase 2 the UI still reads from `lib/mock/`; in Phase 4 it switches to `useQuery(api.issues.list, ...)`.
- **Multi-tenancy boundary:** every business table has `workspaceId`. Every query helper has a `requireWorkspace` guard. Tests prove the boundary is enforced.
- **Generated code:** `convex/_generated/api.d.ts` and `convex/_generated/dataModel.d.ts` are committed. `convex/_generated/server/*` is gitignored.
- **Phase 3 forward-compat:** the `users` table has `email` and `name` ready for Better Auth's user record. `memberships.role` matches Better Auth's organization plugin's role enum. The `requireWorkspace` helper reads from `ctx.db` directly — Phase 3 swaps the `getDemoUserId()` call for `getAuthUserId(ctx)` from `convex/auth.ts`.

---

## File-level change summary

| File | Status | Stream |
|---|---|---|
| `convex.json` | new (auto-generated by `npx convex dev`) | 2A |
| `convex/_generated/README.md` | new | 2A |
| `convex/.gitignore` | new | 2A |
| `convex/schema.ts` | new | 2B |
| `convex/_lib/schema-types.ts` | new | 2B |
| `convex/_lib/tenancy.ts` | new | 2D |
| `convex/_lib/errors.ts` | new | 2D |
| `convex/seed.ts` | new | 2C |
| `convex/tsconfig.json` | new | 2B |
| `convex/_tests/setup.ts` | new | 2D |
| `convex/_tests/seed.test.ts` | new | 2D |
| `convex/_tests/tenancy.test.ts` | new | 2D |
| `convex/_tests/indexes.test.ts` | new | 2D |
| `apps/web/lib/convex/index.ts` | new (re-exports) | 2B |
| `apps/web/lib/auth/demo-session.ts` | new (Phase 2 placeholder) | 2C |
| `apps/web/lib/mock/users.ts` | edit (re-export `ME_ID` from demo-session) | 2C |
| `apps/web/lib/mock/index.ts` | edit (mark as fixtures-only) | 2C |
| `package.json` (root) | extend (+4 scripts, +3 devDeps) | 2A, 2C, 2D, 2E |
| `.env.example` | new (root + apps/web) | 2E |
| `.gitignore` | edit (add `.env.local`, `convex/_generated/server`) | 2A, 2E |
| `README.md` | edit (first-time setup) | 2E |
| `.github/workflows/ci.yml` | new | 2E |

**Net new files: 14. Net edited files: 5. Net new dependencies: `concurrently`, `vitest`, `convex-test` (all devDeps).**

---

## Execution order (recommended)

1. **2A Convex project setup** — log in, create project, get the dashboard URL, commit `convex.json`. (15-30 minutes, gated on user auth.)
2. **2B Schema** — write the 14 entities + indexes; verify `npx convex dev --once` compiles; commit `_generated/api.d.ts` and `dataModel.d.ts`. (Half-day to one day.)
3. **2C Seed** — write the internal mutation, run it, verify counts in the dashboard, run it again, verify idempotency. (Half-day.)
4. **2D Multi-tenant helpers + isolation tests** — write `requireWorkspace`, write the four test files, run them, make sure they fail when the boundary is violated. (Half-day to one day.)
5. **2E Local dev DX + CI + .env.example** — can start in parallel with 2B/2C/2D; final CI wiring lands last. (Half-day.)

Rough total: 2-3 working days.

---

## Definition of done (Phase 2 exit criteria)

- [ ] `npx convex dev` runs locally; dashboard shows a non-empty deployment with the seeded data
- [ ] `convex/schema.ts` defines all 14 entities with `workspaceId` everywhere it belongs
- [ ] Every business-table query in `convex/` uses an index (test: `indexes.test.ts` passes)
- [ ] `npm run convex:seed` populates the demo workspace with the expected counts (30 issues, 12 users, 4 projects, 3 cycles, 10 labels, 8 comments, 10 inbox items)
- [ ] Re-running `npm run convex:seed` is idempotent (zero new rows on second run)
- [ ] Data isolation tests pass (`tenancy.test.ts` proves cross-workspace access is denied)
- [ ] `npm run typecheck` clean, `npm run build` clean, `npm run convex:test` clean
- [ ] `.env.example` is committed with every variable the app needs
- [ ] `README.md` has a "First-time setup" section that works for a new contributor
- [ ] CI: `convex dev --once`, `convex:test`, `typecheck`, `build` all pass on a sample PR
- [ ] No UI changes; the app still reads from `lib/mock/` for runtime data (Phase 4 swaps this)
- [ ] `ME_ID` constant is still `"u_aria"`, now sourced from `apps/web/lib/auth/demo-session.ts` (Phase 3 removes the file)

---

## Phase 3 — what's next

Phase 3 lands Better Auth + the Convex adapter. The `users` table is ready; the `memberships` table is ready; the `requireWorkspace` helper's `getDemoUserId()` call gets swapped for `getAuthUserId(ctx)`. The `ME_ID` placeholder is removed; the UI starts reading from `useSession()`. `demo-session.ts` is deleted.

No schema changes are required to land Phase 3. That's the test of a good data foundation: it anticipates the next phase without coupling to it.
