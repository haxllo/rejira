# Architecture

**Analysis Date:** 2026-06-09

## High-Level Architecture

**rejira** is a multi-tenant, keyboard-first Jira replacement built as a **Next.js 16 App Router** monolith hosted on Vercel. The architecture follows a server-component-first pattern with Drizzle ORM for data access, Better Auth for authentication, Supabase Postgres for persistence, and Zustand for client state.

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                            │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Pages   │  │ Zustand   │  │ Realtime  │  │ Server Actions   │  │
│  │ (RSC)    │  │ Stores    │  │ Provider  │  │ (fetch→API)      │  │
│  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
└───────┼──────────────┼──────────────┼─────────────────┼─────────────┘
        │              │              │                  │
        ▼              │              ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Next.js 16 Server (App Router)                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  RSC     │  │ API Routes│  │ Middleware │  │ Server Actions   │  │
│  │ (DB RSC) │  │ (/api/db) │  │ (Auth)    │  │ (lib/db/actions) │  │
│  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
│       │              │              │                  │            │
│       ▼              ▼              ▼                  ▼            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM (pg.Pool, server-only)              │  │
│  │    DATABASE_URL (transaction mode, 6543) for app queries     │  │
│  │    DATABASE_URL_SESSION (session mode, 5432) for Better Auth │  │
│  └─────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Supabase Postgres (Tenant Platform)              │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Postgres │  │  Realtime │  │  Storage  │  │  pgvector        │  │
│  │ (RLS on  │  │ (WS pub)  │  │ (S3 API)  │  │ (embeddings)    │  │
│  │  all tbl)│  │           │  │           │  │                  │  │
│  └──────────┘  └───────────┘  └───────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌───────────┐                                        │
│  │ pg_cron  │  │ pgTAP     │                                        │
│  │ (jobs)   │  │ (RLS test)│                                        │
│  └──────────┘  └───────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- Server components by default; `'use client'` only for state, effects, browser APIs
- `server-only` import guard on all DB, auth, and observability modules
- Three database connection strings per environment (app, migrations, auth)
- RLS is the only tenancy boundary — no app-side `requireRole` helpers beyond membership checks
- Realtime via Supabase Realtime (WebSocket → Postgres Changes), client-only
- Mock data in `lib/mock/` serves as a fallback until Phase 4 migrates fully to real Postgres

## Data Flow

### Primary Read Path (Server Component → Drizzle → Postgres)

1. User navigates to a workspace route (e.g., `/projects/eng/issues`)
2. Next.js middleware (`apps/web/middleware.ts:37`) checks session cookie (`better-auth.session_token`); redirects to `/sign-in` if absent
3. Workspace layout (`app/(workspace)/layout.tsx:23-28`) calls `getUsers()`, `getLabels()`, `getIssuesForActiveWorkspace({ limit: 500 })`, `getProjects()` — all RSC functions from `lib/db/rsc.ts`
4. Each RSC function calls `requireAuth()` → gets the active workspace ID via Better Auth session → queries Drizzle with `workspaceId` filter
5. Data is passed to `WorkspaceDataHydrator` child component which hydrates Zustand stores client-side
6. Page component receives data as props, renders RSC output

### Mutation Path (Client → Server Action → API Route → Drizzle)

1. Client calls a server action wrapper (e.g., `setStatusAction` from `lib/server-actions.ts`)
2. Wrapper POSTs to `/api/db/issues` with an `op` discriminator (e.g., `{ op: 'setStatus', workspaceId, issueId, status }`)
3. API route handler (`app/api/db/issues/route.ts`) dispatches to the action function in `lib/db/actions/issues.ts`
4. Action wraps work in `withWorkspaceTransaction(workspaceId, async (tx) => { ... })`
5. Transaction sets `request.jwt.claims` via `set_config()` so RLS policies can identify the user
6. Drizzle executes the SQL; RLS policies enforce tenancy at the database level
7. Result returned through API response → client-side Zustand store updated optimistically
8. `apply()` from `lib/state/mutations.ts` manages undo/retry stacks, pending flags, and toast notifications

### Realtime Path (Supabase Realtime → Client)

1. `WorkspaceRealtimeProvider` (`lib/realtime/workspace-provider.tsx`) creates a Supabase channel scoped to `workspace:{id}`
2. Subscribes to `postgres_changes` on `issues`, `cycles`, `projects`, `memberships`, `saved_views` tables filtered by `workspaceId`
3. Per-page hooks (`useRealtimeIssues`, `useRealtimeComments`, `useRealtimeNotifications`) subscribe to fine-grained table changes
4. On change event, `useRealtimeIssues` calls `router.refresh()` (debounced 200ms) to re-render server components

**State Management:**
- Server state: Drizzle ORM + RSC (read), Drizzle + API routes (write)
- Client cache: Zustand stores hydrated by `WorkspaceDataHydrator` on layout load
- UI state: `useUI` Zustand store (persisted to localStorage for density, sort/group prefs)
- URL state: Filter parameters parsed from URL via `lib/state/view-query.ts`

## Component Architecture

### Layout Hierarchy

```
RootLayout (app/layout.tsx)
 ├── `<html>` with locale, density, Geist fonts
 └── <body>
      ├── Public routes: (auth)/layout.tsx → AuthShell
      │    ├── /sign-in, /sign-up, /forgot-password, /reset-password
      │    ├── /verify-email, /two-factor, /check-email
      │    └── /invite/[token]
      │
      └── Authenticated routes: (workspace)/layout.tsx
           ├── RequireAuth wrapper
           ├── WorkspaceDataHydrator (hydrates Zustand stores)
           ├── WorkspaceRealtimeProvider (Supabase channel)
           ├── TopBar (suspense boundary)
           ├── PrimaryNav (left sidebar)
           ├── <main> (page outlet)
           ├── StatusBar (suspense boundary)
           ├── CommandPalette (global ⌘K)
           ├── IssueDrawer (slide-out issue detail)
           ├── CreateIssueDialog (C shortcut)
           ├── Cheatsheet (? shortcut)
           ├── ToastHost (mutation toasts)
           ├── BulkActionBar (multi-select actions)
           ├── GlobalShortcuts (⌘K, /, C, ?, Z, Esc, go-to)
           └── RouteChangeSelectionReset
```

### Component Directory Structure

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `components/shell/` | App shell layout components | `top-bar.tsx`, `primary-nav.tsx`, `command-palette.tsx`, `global-shortcuts.tsx` |
| `components/issue/` | Issue-specific UI | `issue-row.tsx`, `issue-drawer.tsx`, `create-issue-dialog.tsx`, `drag-overlay.tsx` |
| `components/views/` | List/board/roadmap renderers | `view-renderer.tsx`, `grouped-list.tsx`, `cycle-board.tsx`, `filter-popover.tsx`, `filter-chips.tsx` |
| `components/auth/` | Authentication UI | `sign-in-form.tsx`, `sign-up-form.tsx`, `two-factor-form.tsx`, `oauth-buttons.tsx`, `require-auth.tsx` |
| `components/workspace/` | Workspace initialization | `data-hydrator.tsx` |
| `components/primitives/` | Atomic UI primitives | `avatar.tsx`, `button.tsx`, `kbd.tsx`, `status.tsx`, `priority.tsx`, `label.tsx` |
| `components/team/` | Workspace member management | `workspace-switcher.tsx`, `workspace-members-table.tsx`, `workspace-invite-form.tsx` |
| `components/onboarding/` | New workspace setup wizard | `workspace-setup-wizard.tsx`, `step-create-workspace.tsx`, `step-invite-team.tsx` |
| `components/settings/` | User account settings | `profile-form.tsx`, `password-form.tsx`, `email-form.tsx`, `two-factor-settings.tsx` |
| `components/inbox/` | Notification inbox | `inbox-item.tsx` |
| `components/home/` | Home dashboard widgets | `recent-activity-widget.tsx` |
| `components/activity/` | Activity feeds | `activity-feed.tsx` |
| `components/icons/` | Icon exports and custom icons | `index.ts`, `index-bridge.ts`, `custom.tsx` |
| `components/animate-ui/` | Animate UI library integration | `components/`, `icons/`, `primitives/` |
| `components/auth/` | Authentication components | 14 component files covering sign-in, sign-up, 2FA, OAuth, magic link, passkeys |

## Routing Structure

### App Router Route Segments

```
app/
├── layout.tsx                    # Root: <html>, <head>, fonts
├── page.tsx                      # Redirect / → /inbox
├── globals.css                   # Tailwind v4 + design tokens
│
├── (auth)/                       # Route group (unauthenticated)
│   ├── layout.tsx                # AuthShell wrapper
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   ├── two-factor/page.tsx
│   └── check-email/page.tsx
│
├── invite/[token]/page.tsx       # Workspace invitation acceptance
│
├── (workspace)/                  # Route group (authenticated)
│   ├── layout.tsx                # App shell: TopBar, PrimaryNav, CommandPalette, etc.
│   ├── home/page.tsx             # Dashboard: open issues, upcoming, recent activity
│   ├── inbox/page.tsx            # Notifications inbox (all/unread/mentions filters)
│   ├── my-issues/page.tsx        # Issues assigned to current user
│   ├── search/page.tsx           # Client-side search (issues, projects, people)
│   ├── onboarding/page.tsx       # First-run workspace setup wizard
│   ├── projects/[key]/
│   │   ├── page.tsx              # Project landing: stats, cycles, members
│   │   ├── issues/page.tsx       # Project issue list (grouped by status)
│   │   ├── cycles/[id]/page.tsx  # Cycle board view
│   │   ├── roadmap/page.tsx      # Timeline/roadmap view
│   │   └── activity/page.tsx     # Project activity feed
│   ├── views/[id]/page.tsx       # Custom saved view
│   └── settings/
│       ├── page.tsx              # Workspace settings overview
│       ├── members/page.tsx      # Member management
│       ├── account/page.tsx      # Account settings (profile, password)
│       └── security/page.tsx     # Security (2FA, sessions)
│
└── api/
    ├── auth/[...all]/route.ts    # Better Auth handler (all auth endpoints)
    ├── db/                       # Data API routes (op-based dispatch)
    │   ├── issues/route.ts
    │   ├── comments/route.ts
    │   ├── cycles/route.ts
    │   ├── projects/route.ts
    │   ├── memberships/route.ts
    │   ├── notifications/route.ts
    │   └── saved-views/route.ts
    ├── db-check/route.ts         # Database health check
    └── email/webhook/route.ts    # Resend email webhook handler
```

**Middleware matcher configuration:**
- Matches all routes except `_next/static`, `_next/image`, `favicon.ico`
- Public routes listed in `PUBLIC` array (auth pages, invite, API routes, `/`) bypass session check
- Static assets and `/_next/*` pass through without session check
- All other routes require a valid `better-auth.session_token` cookie

## Data Access Patterns

### Server-Side (RSC + Drizzle)

**File:** `lib/db/rsc.ts` — `server-only` guarded

All server data reads flow through this module. Each function:
1. Calls `requireAuth()` to get the current user
2. Resolves the active workspace via `getActiveWorkspaceId(workspaceSlug?)`
3. Queries Drizzle with `workspaceId` filter
4. Returns typed results

Key RSC functions:
- `getIssuesForActiveWorkspace(filters?)` — Issues with optional assignee, project, cycle, status, archive filters
- `getProjects()` — All projects in workspace
- `getCycles(filters?)` — Cycles with optional project filter
- `getLabels()` — All labels in workspace
- `getUsers()` — Workspace members (joined via memberships)
- `getIssue(issueId)` — Single issue by externalId
- `getNotifications(filters?)` — User notifications with unread filter
- `getSavedViews()` — Workspace saved views
- `getMemberships()` / `getMembershipsWithUsers()` — Membership records
- `getRecentActivities(options?)` / `getActivitiesForObject(options)` — Activity log

### Mutation Path (Client → API → Drizzle Actions)

**Entry point:** `lib/server-actions.ts` — Client-callable wrappers that POST to `/api/db/*`

Each action (e.g., `setStatusAction`, `createIssueAction`) sends a JSON payload with an `op` discriminator. The API route handler dispatches to the corresponding function in `lib/db/actions/`.

**Transaction wrapper:** `lib/db/transaction.ts`
- `withTransaction(fn)` — Resolves user, wraps in Sentry span, starts Drizzle transaction, sets `request.jwt.claims` with user ID
- `withWorkspaceTransaction(workspaceId, fn)` — Same but also sets `workspace_id` in claims for RLS

**Action modules:** `lib/db/actions/`
- `issues.ts` — Create, update, setStatus, setPriority, setAssignees, setLabels, setDueDate, setEstimate, setTitle, setDescription, setProject, archive, unarchive, bulk operations, moveToCycle
- `comments.ts` — Create, update, delete
- `cycles.ts` — Create, update, complete
- `projects.ts` — Create, update, archive, add/remove members
- `memberships.ts` — Change role, remove member
- `notifications.ts` — Mark read, mark all read, snooze
- `saved-views.ts` — Create, update, delete, toggle starred
- `activities.ts` — Activity log writes

### DB Client

**File:** `lib/db/client.ts` — `server-only`

- Uses `drizzle-orm/node-postgres` with `pg.Pool`
- Connection: `DATABASE_URL` (transaction mode, port 6543)
- Pool config: max 10 connections, 30s idle timeout, 5s connection timeout, 5s query timeout
- Custom logger for development (`drizzle-logger.ts`)
- SSl enforced in production
- `prepare: false` (no prepared statements in serverless)

### Error Handling

**File:** `lib/db/errors.ts`

- `DbError` class with typed error codes: `FORBIDDEN`, `CONFLICT`, `FOREIGN_KEY`, `TIMEOUT`, `NOT_FOUND`, `INTERNAL`
- `mapDrizzleError(err)` maps PostgreSQL SQLSTATE codes to `DbError` instances
- Transaction wrapper catches errors, sends to Sentry, then rethrows mapped error

## State Management

### Zustand Stores (`lib/state/`)

All stores are client-only (`'use client'` directive or imported from client components).

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useIssues` | `issues.ts` | No | Issue list with modify operations: hydrate, setOne, removeOne, reorderInGroup, moveToStatus |
| `useUI` | `ui.ts` | Partial (density, groupBy, sortKey, sortDir, showCompletedCycles) | UI state: density, command palette, drawer, selection, drag, group/sort, create dialog, cheatsheet |
| `useProjectsStore` | `projects.ts` | No | Projects lookup by ID/key, hydrated from RSC data |
| `useUsersStore` | `users.ts` | No | Users lookup by ID/externalId, hydrated from RSC data |
| `useLabelsStore` | `labels.ts` | No | Labels lookup by ID, hydrated from RSC data |
| `useNotifications` | `notifications.ts` | No | Notifications array + unread count, markReadLocally |
| `useComments` | `comments.ts` | No | Comments by issue ID: set, append, replace, remove |
| `useSavedViews` | `saved-views.ts` | No | Client-created saved views: save, remove, toggleStar, rename |

### Mutation System (`lib/state/mutations.ts`)

Custom undo/retry system independent of React state:

- `apply(ctx)` — Pushes mutation context onto stack, marks affected IDs as pending, runs the async operation, manages toast bridge
- `undoLast()` — Pops and runs undo callback on last mutation
- `retryLast()` — Re-runs last mutation
- `bindToastHost(fn)` — Bridges mutations to the ToastHost component
- `subscribeLastError(fn)` — Error listener for status bar
- Stack limited to 50 entries (FIFO eviction)

### Store Hydration Pattern

`WorkspaceDataHydrator` component (`components/workspace/data-hydrator.tsx`) receives server-fetched data as props and calls `hydrate()` on each Zustand store via `useEffect`. This bridges the server-rendered initial data into client-side stores without duplicating fetches.

## Row Level Security (RLS)

### Architecture

RLS is the **sole tenancy boundary**. The app never has an app-side `requireRole(user, 'admin', workspaceId)` helper. RLS policies reject unauthorized rows at the database level before any application code runs.

### Implementation (`supabase/migrations/`)

**0001_rls.sql:** Enables RLS on all 16 business tables: `workspaces`, `users`, `memberships`, `projects`, `project_members`, `labels`, `issues`, `issue_assignees`, `cycles`, `cycle_issues`, `saved_views`, `comments`, `notifications`, `activities`, `attachments`, `audit_log`.

**0002_rls_helpers.sql:** Four SECURITY DEFINER functions (all set `search_path = public`):
- `current_user_id()` — Maps `auth.jwt() ->> 'sub'` (external_id) to internal BIGINT user ID
- `current_workspace_ids()` — Returns all workspace IDs the user is a member of
- `current_role(workspace_id)` — Returns user's role in a workspace
- `is_admin(workspace_id)` — Returns TRUE if role is `owner` or `admin`
- `set_user(external_id)` — Test impersonation helper (service_role only)

**0003_rls_policies.sql:** Per-table CRUD policies:
- **workspaces:** SELECT for members, INSERT for anyone (creating), UPDATE/DELETE for admins only
- **users:** SELECT public, UPDATE self only
- **memberships:** SELECT for workspace members, INSERT/UPDATE/DELETE for admins only
- **issues:** SELECT for workspace members, INSERT for workspace members, UPDATE for workspace members, DELETE for workspace members
- **comments:** SELECT for workspace members, INSERT self-authored (with workspace check), UPDATE self, DELETE self or admin
- **notifications:** SELECT/UPDATE for the owning user only
- **saved_views:** SELECT workspace-wide, INSERT workspace-wide, UPDATE/DELETE owner only
- **audit_log:** SELECT for actor self or workspace admin

### App-to-RLS Bridge

In `lib/db/transaction.ts`:
```typescript
await tx.execute(
  sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: externalId })}, true)`
);
```
This sets the JWT claims in the transaction session so RLS helpers can resolve the current user via `auth.jwt() ->> 'sub'`.

### Testing

**pgTAP tests:** `supabase/tests/04-rls-cross-tenant.test.sql`, `04-rls-mutations.test.sql`
**Vitest integration tests:** `lib/db/_tests/rls.test.ts`, `rls.org.test.ts`, `rls-proof.test.ts`

## Realtime Architecture

### Client-Only Supabase Realtime

Realtime uses the Supabase browser client (`@supabase/ssr`) — it is entirely client-side. The server knows nothing about WebSocket connections.

**File:** `lib/realtime/client.ts`
- Singleton `SupabaseClient` created via `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`

### Workspace-Level Channel

**File:** `lib/realtime/workspace-provider.tsx`

The `WorkspaceRealtimeProvider` wraps the workspace layout and:
1. Creates a Supabase channel named `workspace:{workspaceId}`
2. Subscribes to `postgres_changes` (event: `*`) on `issues`, `cycles`, `projects`, `memberships`, `saved_views` — all filtered by `workspaceId`
3. Subscribes to `notifications` filtered by `user_id` (if user is known)
4. Cleans up previous channel on workspace change
5. Exposes channel via React context

### Per-Page/Component Subscriptions

**File:** `lib/realtime/subscriptions.ts`

Granular subscription helpers for individual components/pages:
- `subscribeToIssues(workspaceId, onChange)` — Issues changes
- `subscribeToComments(issueId, onChange)` — Comments on a specific issue
- `subscribeToNotifications(userId, onChange)` — User notifications
- `subscribeToMemberships(workspaceId, onChange)` — Membership changes
- `subscribeToCycles(workspaceId, onChange)` — Cycle changes
- `subscribeToProjects(workspaceId, onChange)` — Project changes
- `subscribeToSavedViews(workspaceId, onChange)` — Saved view changes

### Realtime Hooks

- `useRealtimeIssues(workspaceId)` — Debounces `router.refresh()` on issue changes (200ms)
- `useRealtimeComments(issueId)` — Updates comment store on comment changes
- `useRealtimeNotifications(userId)` — Refreshes notification data on changes
- `useRealtimeMemberships(workspaceId)` — Refreshes on membership changes

## Authentication Flow

### Better Auth Integration

**Provider:** Better Auth 1.x with plugins: organization, admin, jwt, magicLink, genericOAuth, twoFactor, nextCookies

**Server instance:** `lib/auth/server.ts` — `server-only`
- Separate `pg.Pool` using `DATABASE_URL_SESSION` (session mode, port 5432)
- Password policy: min 12 chars, breach check (via haveibeenpwned API)
- Session: 7-day expiry, 24h update age, 1h fresh age, cookie cache enabled
- Email verification: required in production, skippable via `DEV_SKIP_EMAIL_VERIFICATION`
- Rate limiting: 30 req/min default, per-endpoint custom limits
- Database hooks: audit events on signup, signin, signout, password change, email change
- New device detection: hashes IP + User-Agent, sends email on first sign-in from new device
- Account linking: enabled with trusted providers (Google, GitHub)

**API route:** `app/api/auth/[...all]/route.ts` — Proxies all auth requests through Better Auth's `toNextJsHandler(auth)`

**Client:** `lib/auth/client.ts` — `createAuthClient` from `better-auth/react` with plugins

### Organization Plugin → Multi-Tenancy

Better Auth's organization plugin is mapped to the workspace system:
- `organization` → `workspaces` table
- `member` → `memberships` table
- `invitation` → `invitations` table
- `team` → `teams` table

Workspace helpers (`lib/auth/workspace-helpers.ts`) use Better Auth API methods (`createOrganization`, `setActiveOrganization`) alongside direct Drizzle queries for listing and lookup.

### Session Verification

- **Middleware:** Checks `better-auth.session_token` cookie; redirects to `/sign-in` if absent (with `next` param for post-login redirect)
- **Server Components:** `requireAuth()` (`lib/auth/require-auth.ts`) calls `getSession()`, redirects if null or email unverified
- **API Routes:** `requireAuth()` guards data API endpoints
- **Client Components:** `RequireAuth` wrapper component (`components/auth/require-auth.tsx`) for client-side auth gating

### Supported Auth Methods

- Email/password (with verification)
- Magic link
- OAuth: Google, GitHub
- Two-factor authentication (TOTP + backup codes)
- Passkeys (WebAuthn)
- Session management (list, revoke)
- Account deletion
- Data export

## Multi-Tenancy Model

### Workspaces

Each workspace is a tenant. Data isolation is enforced at the database level via RLS. Every business table includes a `workspaceId` column referencing `workspaces.id`.

**Schema (`workspaces`):** `id` (PK text), `externalId` (unique), `name`, `slug` (unique), `ownerId`, `archivedAt`

### Memberships

Users belong to workspaces via `memberships` records. Roles: `owner`, `admin`, `member`, `guest`.

**Schema (`memberships`):** `id` (PK text), `externalId` (unique), `userId`, `workspaceId`, `role` (default `member`), `createdAt`, `updatedAt`

### Active Workspace Resolution

- Server-side: `getActiveWorkspaceId(slug?)` in `lib/auth/workspace-helpers.ts` — returns first membership's workspace or slug-matched workspace
- Client-side: `useWorkspace()` hook (`hooks/useWorkspace.ts`) — checks URL param `?w=`, then active organization, then first workspace

### Invitations

Workspace invitations use Better Auth's organization invitation system:
- `sendInvitationEmail` callback sends via Resend
- Invite acceptance at `/invite/[token]`
- Expires in 7 days (604800 seconds)

### Project Members

Per-project fine-grained membership via `project_members` table with roles: `lead`, `contributor`, `viewer`.

## Error Handling

### Server-Side Errors

- `DbError` class (`lib/db/errors.ts`) — Typed error codes mapped from PostgreSQL SQLSTATE
- `ServerActionError` class (`lib/server-actions.ts`) — Wraps API errors for client consumption
- Transaction wrapper catches all errors, sends to Sentry via `captureDrizzleError()`, rethrows mapped error
- `mapDrizzleError()` handles: 42501→FORBIDDEN, 23505→CONFLICT, 23503→FOREIGN_KEY, 57014→TIMEOUT, PGRST116→NOT_FOUND, default→INTERNAL

### Client-Side Errors

- Mutation system (`lib/state/mutations.ts`) catches errors from async `run()` calls
- Sets `lastError` state, notifies listeners via `subscribeLastError()`
- `setPending()` marks affected issue IDs with `pending: true` during mutation, clears after success/failure

### API Error Pattern

```typescript
// In server-actions.ts:
if (!res.ok) {
  throw new ServerActionError(
    data.error ?? 'Something went wrong',
    { code: data.code ?? 'INTERNAL', status: res.status, details: data.details },
  );
}
```

## Observability & Logging

### Sentry

**File:** `lib/observability/sentry.ts` — `server-only`

- Initialized from `SENTRY_DSN` env var
- `captureError(error, context)` — Captures exceptions with extra context
- `withSentryTransaction(name, fn)` — Wraps DB transactions in Sentry spans
- `captureDrizzleError(err, context)` — Captures DB errors with workspaceId and SQL context
- Next.js config wraps app with `@sentry/nextjs` automatic instrumentation
- Ignores `NEXT_REDIRECT` and `NEXT_NOT_FOUND` errors

### Structured Logging

**File:** `lib/observability/logger.ts` — Structured logger with request context

**File:** `lib/observability/drizzle-logger.ts` — Drizzle query logging (development only)

### PostHog (Product Analytics)

**File:** `lib/observability/posthog.ts`

### Auth Events

**File:** `lib/observability/auth-events.ts` — Typed auth event tracking

### Event Tracking

**File:** `lib/observability/events.ts` — Business event tracking (e.g., `trackIssueCreated`, `trackStatusChanged`)

### PII Redaction

**File:** `lib/observability/redact.ts` — `redactParams()` for sanitizing logged data

### Middleware Headers

All responses include security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `x-request-id` (UUID per request)
- `x-locale` (detected locale)
- CSP via `next.config.ts` headers array

---

*Architecture analysis: 2026-06-09*
