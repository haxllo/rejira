<!-- refreshed: 2026-06-07 -->
# Architecture

**Analysis Date:** 2026-06-07

## System Overview

rejira is a Next.js 16 App Router monolith published to Vercel, with a single workspace app (`apps/web`) and no separate API or realtime service today. The full target shape — laid out in `ARCHITECTURE_13_LAYERS.md` — splits concerns across 13 layers; the **current code reflects the 13-layer intent only partially**. L1 (Presentation), L2 (Client State), L5 (Data, mocked), and L6 (Auth, Better Auth placeholder) are real. L4 (Domain Services), L7 (Realtime), and L12 (Background Jobs) are not yet implemented; data still flows from `apps/web/lib/mock/`. Phase 2 will replace the mock layer with Drizzle + Supabase Postgres, Phase 3 will fully wire Better Auth.

```text
┌──────────────────────────────────────────────────────────────────┐
│                   L1  Presentation  (apps/web/app, components)    │
│     app/(auth)/*          app/(workspace)/*          app/api/*   │
│     components/{shell,issue,views,auth,team,primitives,icons}     │
├──────────────────────────────────────────────────────────────────┤
│              L2  Client State  (apps/web/lib/state)               │
│     zustand stores: ui, issues, mutations, keyboard, saved-views  │
│     URL binding: hooks/useViewQuery (nuqs installed, used lite)   │
├──────────────────────────────────────────────────────────────────┤
│       L5a  Mock Data  (apps/web/lib/mock)        ← phase 2 cuts   │
│       L5b  Drizzle (planned — not present yet)   ← phase 2 ships  │
├──────────────────────────────────────────────────────────────────┤
│            L6  Auth  (apps/web/lib/auth + utils/supabase)         │
│     Better Auth: lib/auth/{server,client,...} (placeholder init)  │
│     Supabase: utils/supabase/{server,client,middleware}           │
│     Route:    app/api/auth/[...all]/route.ts                      │
│     Proxy:    apps/web/proxy.ts  (Supabase → Better Auth cookie)  │
├──────────────────────────────────────────────────────────────────┤
│       L11 Email  (lib/email)    L13 Observability  (lib/observ.)  │
│       L8  i18n   (lib/i18n)     L8  motion variants (lib/motion)  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component                       | Responsibility                                                                 | File                                                      |
| ------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `app/layout.tsx`                | Root HTML, font preconnect, metadata, density data-attr on `<html>`            | `apps/web/app/layout.tsx`                                 |
| `app/page.tsx`                  | Redirects `/` → `/inbox`                                                       | `apps/web/app/page.tsx`                                   |
| `app/(auth)/layout.tsx`         | Centered card shell for sign-in/up, two-factor, etc.                           | `apps/web/app/(auth)/layout.tsx`                          |
| `app/(workspace)/layout.tsx`    | Mounts TopBar, PrimaryNav, CommandPalette, IssueDrawer, Cheatsheet, toasts    | `apps/web/app/(workspace)/layout.tsx`                     |
| `app/api/auth/[...all]/route.ts`| Catches all Better Auth HTTP requests (GET, POST)                              | `apps/web/app/api/auth/[...all]/route.ts`                 |
| `apps/web/proxy.ts`             | Auth gate: Supabase session, then Better Auth cookie; public path allowlist  | `apps/web/proxy.ts`                                       |
| `lib/auth/server.ts`            | Better Auth factory. **Phase 2/3 placeholder** — throws until pg.Pool lands.  | `apps/web/lib/auth/server.ts`                             |
| `lib/auth/client.ts`            | Browser `authClient` (magicLink + twoFactor + organizationClient plugins)     | `apps/web/lib/auth/client.ts`                             |
| `lib/state/issues.ts`           | Zustand store. In-memory issue list, optimistic mutators, undo history         | `apps/web/lib/state/issues.ts`                            |
| `lib/state/ui.ts`               | Zustand store. Density, command-palette open, drawer, selection, drag, group/sort | `apps/web/lib/state/ui.ts`                              |
| `lib/state/mutations.ts`        | Pipeline `apply(ctx)`: STACK push, toast dispatch, last-error tracking        | `apps/web/lib/state/mutations.ts`                         |
| `lib/state/view-query.ts`       | Filter/group/sort types, parser, serializer, `useFilteredIssues` hook         | `apps/web/lib/state/view-query.ts`                        |
| `lib/state/keyboard.ts`         | Global keyboard handler (⌘K, /, C, ?, G-then-X, ⌘A, Z) mounted in workspace    | `apps/web/lib/state/keyboard.ts`                          |
| `lib/state/saved-views.ts`      | Persisted (localStorage) saved views                                           | `apps/web/lib/state/saved-views.ts`                       |
| `lib/mock/index.ts`             | Re-exports ISSUES, INBOX, CYCLES, PROJECTS, LABELS, USERS + `ALL` aggregate   | `apps/web/lib/mock/index.ts`                              |
| `lib/utils/cn.ts`               | `cn()` — clsx + tailwind-merge                                                 | `apps/web/lib/utils/cn.ts`                                |
| `lib/utils/date.ts`             | `relativeTime`, `shortDate`, `dueLabel`, `dueIsOverdue`                       | `apps/web/lib/utils/date.ts`                              |
| `lib/motion/variants.ts`        | Spring physics variants (no linear easings)                                    | `apps/web/lib/motion/variants.ts`                         |
| `lib/i18n/dict.ts`              | Tiny key→string dict (English only today)                                      | `apps/web/lib/i18n/dict.ts`                               |
| `lib/email/transport.ts`        | `ConsoleTransport` (dev) + `ResendTransport` (prod) pluggable interface        | `apps/web/lib/email/transport.ts`                         |
| `lib/observability/index.ts`    | `initSentry`, `initPostHog`, `trackEvent`, `captureError` stubs                | `apps/web/lib/observability/index.ts`                     |
| `utils/supabase/{server,client,middleware}.ts` | Per-runtime Supabase client factories (cookies, browser, middleware) | `apps/web/utils/supabase/*`                               |
| `hooks/useCurrentUser.ts`       | `useSession()` → Better Auth user, fallback to first mock user                | `apps/web/hooks/useCurrentUser.ts`                        |
| `hooks/useWorkspace.ts`         | Reads `?w=` URL param against static WORKSPACES list                          | `apps/web/hooks/useWorkspace.ts`                          |
| `hooks/useViewQuery.ts`         | URL ⇄ filter/group/sort state, debounced writes via `router.replace`          | `apps/web/hooks/useViewQuery.ts`                          |
| `components/shell/command-palette.tsx` | ⌘K cmdk surface: search issues, navigate, create                        | `apps/web/components/shell/command-palette.tsx`           |
| `components/issue/issue-drawer.tsx` | Right-side drawer for issue detail (Phase 1 staple)                         | `apps/web/components/issue/issue-drawer.tsx`              |
| `components/issue/issue-row.tsx`     | Row in GroupedList, sortable, selection-aware                               | `apps/web/components/issue/issue-row.tsx`                 |
| `components/views/grouped-list.tsx` | DndContext host: column drag-reorder, status move                           | `apps/web/components/views/grouped-list.tsx`              |
| `components/views/cycle-board.tsx`   | Kanban-style cycle view                                                     | `apps/web/components/views/cycle-board.tsx`               |
| `components/views/filter-chips.tsx`  | Active-filter chips above list                                              | `apps/web/components/views/filter-chips.tsx`              |
| `components/views/filter-popover.tsx`| Filter builder popover (status, assignee, label, priority, due, search)     | `apps/web/components/views/filter-popover.tsx`            |
| `components/primitives/*`            | Button, Kbd, Avatar, StatusDot, PriorityIcon, LabelChip — local design system | `apps/web/components/primitives/*.tsx`                    |
| `components/icons/custom.tsx`        | Custom motion-driven icons (home, kanban, gantt, etc.)                       | `apps/web/components/icons/custom.tsx`                    |
| `components/animate-ui/*`            | Vendored from Animate UI registry (icons, primitives)                        | `apps/web/components/animate-ui/*`                        |

## Pattern Overview

**Overall:** Next.js App Router monolith with route groups + a tightly scoped client state layer (Zustand) reading from in-memory mock data. Server-only logic lives in `lib/auth/`, `utils/supabase/`, and the Better Auth route handler. There is **no tRPC, no REST API surface, and no server actions yet** — every page is a client component that pulls from Zustand, because the data is mock and lives in browser memory.

**Key Characteristics:**

- **Two route groups, one shared shell.** `(auth)` renders the centered sign-in card; `(workspace)` renders the persistent 4-quadrant shell (TopBar / PrimaryNav / main / StatusBar). The workspace layout also mounts every cross-cutting surface — CommandPalette, IssueDrawer, CreateIssueDialog, Cheatsheet, ToastHost, BulkActionBar — once at the layout level so they overlay every page.
- **Client-first rendering.** Every page in `(workspace)` is a client component that reads from `useIssues` / `useUI` / `useViewQuery`. The two layouts are server components. Server-side data fetching is reserved for the Better Auth route handler and Supabase clients; the app itself does not fetch.
- **One mutation pipeline.** All state changes funnel through `apply(ctx)` in `lib/state/mutations.ts`. The pipeline pushes onto a `STACK` (for undo), dispatches a `jira:toast` CustomEvent, and updates the store. It is shaped to accept a real fetch later without changing call sites.
- **URL is the source of truth for view state.** `hooks/useViewQuery.ts` parses/parses `?status=…&assignee=…&label=…&priority=…&due=…&search=…&group=…&sort=…` and writes back via `router.replace`. nuqs is installed but the URL binding is hand-rolled.
- **Design system is CSS-first.** Tokens live in `apps/web/app/globals.css` as `@theme` variables (OKLCH colors, 8pt spacing, 5 surface levels, 3 densities). Components use raw Tailwind classes plus `var(--color-*)` references — no Tailwind config file, no CSS-in-JS.
- **Icons are vendored motion components.** `components/animate-ui/icons/*` is a local copy of the `@animate-ui` registry; the `IconWrapper` base in `components/animate-ui/icons/icon.tsx` exposes a uniform `<Icon size=… />` API. `components/icons/custom.tsx` adds the navigation-only icons the registry doesn't ship.
- **Path alias.** `tsconfig.json` maps `"@/*"` to `apps/web/*`. `components.json` (shadcn-style) further aliases `@/components`, `@/lib`, `@/lib/utils`, `@/components/ui`, `@/hooks` — these match the existing folder layout 1:1 even though there is no `components/ui/` folder.

## Layers

**L1 — Presentation (`apps/web/app/` and `apps/web/components/`)**
- Purpose: routes, layouts, all rendered React.
- Location: `apps/web/app/`, `apps/web/components/`
- Contains: `page.tsx`, `layout.tsx`, every TSX in `components/`.
- Depends on: L2 (zustand stores, hooks), L5a (mock), L6 (auth client in auth pages).
- Used by: nothing above (top of the stack).

**L2 — Client State (`apps/web/lib/state/`, `apps/web/hooks/`)**
- Purpose: client-side data, optimistic mutations, UI state, URL binding.
- Location: `apps/web/lib/state/`, `apps/web/hooks/`
- Contains: zustand stores, the `apply()` mutation pipeline, the keyboard handler, view-query parser, three hooks (`useCurrentUser`, `useWorkspace`, `useViewQuery`).
- Depends on: L5a (initial state from `lib/mock`), L6 (auth client).
- Used by: L1.

**L5a — Mock Data (`apps/web/lib/mock/`)**
- Purpose: in-memory substitute for the database until Phase 2.
- Location: `apps/web/lib/mock/`
- Contains: typed constants (`ISSUES`, `PROJECTS`, `USERS`, `CYCLES`, `LABELS`, `INBOX`), lookup helpers (`issueById`, `userById`, `projectById`, `cycleById`, `labelById`, `commentsFor`, `activityFor`, `subIssues`, `issuesAssignedTo`, `inboxFor`).
- Depends on: nothing.
- Used by: L2, L1 (imported directly by pages and components).
- **Planned deletion:** Phase 4 deletes this folder; `lib/db/` (Drizzle) replaces it.

**L6 — Auth & Identity (`apps/web/lib/auth/`, `apps/web/utils/supabase/`, `apps/web/proxy.ts`, `apps/web/app/api/auth/[...all]/route.ts`)**
- Purpose: authentication for both Supabase and Better Auth.
- Location: `apps/web/lib/auth/`, `apps/web/utils/supabase/`, `apps/web/proxy.ts`, `apps/web/app/api/auth/[...all]/route.ts`
- Contains: `getAuthInstance()` (placeholder), `authClient` (browser), audit/rate-limit/password-policy/twoFactor/backup-codes/account-deletion/account-linking/email helpers, three Supabase client factories, the proxy that gates routes, the catch-all auth route handler.
- Depends on: Supabase env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), Better Auth env (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).
- Used by: L1 (auth pages, workspace layout), the Vercel edge (`proxy.ts`).

**L11 — Email (`apps/web/lib/email/`)**
- Purpose: transport + template rendering for transactional email.
- Location: `apps/web/lib/email/`
- Contains: `EmailTransport` interface, `ConsoleTransport` (dev), `ResendTransport` (prod, currently a stub), `registerTemplate`/`render`, four inline HTML templates (`welcome`, `verifyEmail`, `magicLink`, `resetPassword`).
- Depends on: `RESEND_API_KEY`, `RESEND_FROM` env.
- Used by: nothing yet (not wired into Better Auth callbacks in Phase 2/3).

**L8 — i18n (`apps/web/lib/i18n/dict.ts`)**
- Purpose: typed key→string lookup. English-only today.
- Location: `apps/web/lib/i18n/dict.ts`
- Contains: a single `t(key, locale)` function and one English dictionary.
- Used by: nothing in `apps/` yet — file is staged for Phase 3 stream 3J.

**L8 — Motion (`apps/web/lib/motion/variants.ts`)**
- Purpose: shared motion variants so every animation uses the same spring physics.
- Location: `apps/web/lib/motion/variants.ts`
- Contains: three spring transitions, fade/slide variants.
- Used by: every page and shell component that uses `<motion.*>`.

**L13 — Observability (`apps/web/lib/observability/index.ts`)**
- Purpose: Sentry + PostHog stubs; structured `trackEvent` / `captureError` API.
- Location: `apps/web/lib/observability/index.ts`
- Contains: `initSentry`, `initPostHog`, `trackEvent`, `captureError` (all no-op without env keys).
- Used by: nothing yet — staged for Phase 4J.

**L8 — `components/animate-ui/` (vendored library)**
- Purpose: third-party UI primitives checked into the repo to avoid network deps.
- Location: `apps/web/components/animate-ui/`
- Contains: ~80 icon files, four animate primitives (avatar-group, tabs, tooltip, slot, highlight), the `IconWrapper` base.
- Treated as **read-only**; do not edit.

## Data Flow

### Primary request path (page render in workspace)

1. **Edge / Vercel** receives the request; runs `apps/web/proxy.ts` (`proxy()`) before any route handler.
   - `apps/web/proxy.ts:13` checks the path against `PUBLIC` (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/two-factor`, `/api/auth`, `/api/check`, `/invite`, `/`).
   - If public, `NextResponse.next()`; otherwise call `updateSession(request)` from `utils/supabase/middleware.ts`, which creates a Supabase server client and reads the user.
   - If the user is signed in via Supabase, return; else check for `better-auth.session_token` / `__Secure-better-auth.session_token` cookie; else redirect to `/sign-in?next=<path>`.
2. **Root layout** (`app/layout.tsx`) sets `<html lang="en" data-density="default">`, loads Geist fonts, renders `<body>{children}</body>`.
3. **Workspace layout** (`app/(workspace)/layout.tsx`) mounts the shell:
   - `RouteChangeSelectionReset` — clears zustand multi-select on path change.
   - `GlobalShortcuts` — calls `useGlobalKeyboard()` which registers window-level key handlers.
   - `TopBar` — workspace switcher, search, current user avatar.
   - `PrimaryNav` — sidebar with Inbox/My Issues/Views/Projects.
   - `<main>{children}</main>` — the page.
   - `StatusBar` — density toggle, environment badge.
   - `CommandPalette`, `IssueDrawer`, `CreateIssueDialog`, `Cheatsheet`, `ToastHost`, `BulkActionBar` — overlay surfaces mounted once.
4. **Page component** (e.g. `app/(workspace)/my-issues/page.tsx`) runs as a client component:
   - `useIssues((s) => s.issues)` reads the zustand store seeded from `ISSUES` in `lib/mock/issues.ts`.
   - `useCurrentUserId()` reads Better Auth's `useSession()` (or falls back to first mock user).
   - `useViewQuery("my-issues")` parses URL filters, group, sort.
   - Renders `<ViewHeader>`, `<FilterChipsFromState>`, `<FilterPopover>`, then `<GroupedList>` (or flat `<IssueRow>` map).
5. **Store mutations** are dispatched from list/row/drawer components:
   - `apply({ message, affectedIds, undo, retry, viewAction })` from `lib/state/mutations.ts` runs the mutator function, then dispatches a CustomEvent.
   - `ToastHost` (`components/shell/toast.tsx`) listens for `jira:toast` and shows the 5-second toast with undo.
6. **Drawer/Command Palette/Cheatsheet** are opened/closed by mutating the `useUI` store: `openDrawer(id, fromEl)`, `setCommandOpen(true)`, `toggleCheatsheet()`.

### Auth flow (sign-in)

1. User visits `/sign-in` → matches the `PUBLIC` allowlist in `proxy.ts` → renders `(auth)/sign-in/page.tsx`.
2. `SignInForm` calls `signIn.email({ email, password, callbackURL: "/inbox" })` from `lib/auth/client.ts` → `authClient` posts to `POST /api/auth/sign-in/email`.
3. `app/api/auth/[...all]/route.ts` resolves the handler lazily via `getHandler()` → `toNextJsHandler(getAuthInstance())` from `better-auth/next-js`.
4. `getAuthInstance()` (`lib/auth/server.ts`) currently **throws** because Phase 2 (Supabase data layer) has not yet wired the `pg.Pool`. The route handler catches the error and returns a 500. When Phase 3 ships, the same code path will be live.

### View-state flow (filters, group, sort)

1. User clicks a filter in `<FilterPopover>` → `setFilter((prev) => …)`.
2. `setFilter` updates local state immediately and schedules a 200ms-debounced `writeUrl({ filter, view })` that calls `router.replace(pathname?qs, { scroll: false })`.
3. Back/forward navigation triggers `useEffect` in `useViewQuery` to re-parse `searchParams` → state re-syncs.
4. `useFilteredIssues(filter, group, sortKey, sortDir, baseIssues)` in `lib/state/view-query.ts` does the actual filter/group/sort work in a `useMemo`.

## Key Abstractions

**`apply(ctx)` — optimistic mutation pipeline**
- Purpose: single chokepoint for every state change so undo, toast, and (future) server round-trip can be wired once.
- Examples: called from `components/issue/issue-row.tsx` (status change), `components/views/bulk-action-bar.tsx` (bulk ops), `components/issue/issue-drawer.tsx` (drawer edits), `components/views/grouped-list.tsx` (drag-drop reorder).
- Pattern: pure function that takes `MutationContext` (`message`, `affectedIds`, `undo`, `retry`, `viewAction?`, `variant?`) and pushes onto a module-level `STACK` (capped at 50) so `Z` can undo the most recent action. The store mutator sets `pending: true` on affected issues; `requestAnimationFrame` clears it in the mock.

**`useUI` / `useIssues` — zustand stores**
- Purpose: single source of truth for UI state and the (mocked) issue collection.
- Examples: every workspace page, every shell component, every drawer.
- Pattern: `create<T>()(persist(...))` for `useUI` and `useSavedViews` (localStorage-backed), plain `create<T>()` for `useIssues` and the per-issue `HISTORY` map kept in module scope (not persisted).

**`useViewQuery(viewId?)` — URL ⇄ view state**
- Purpose: URL is the source of truth for filter/group/sort; this hook parses, debounces writes, and exposes typed setters.
- Examples: `app/(workspace)/my-issues/page.tsx`, `app/(workspace)/views/[id]/page.tsx`, `app/(workspace)/projects/eng/issues/page.tsx`.
- Pattern: `useState` mirror + `useRef` shadow for stale-free reads inside callbacks; `router.replace` for writes; re-sync on `search` change for back/forward.

**`ViewHeader`, `IssueRow`, `GroupedList`, `CycleBoard` — view primitives**
- Purpose: every list/board view composes from these so the interaction model (sortable rows, status columns, density-aware spacing) is consistent.
- Examples: `ViewHeader` is in every workspace page; `GroupedList` is in `my-issues`, `views/[id]`, `projects/eng/issues`; `CycleBoard` is in `projects/eng/cycles/23` and the project's issues page when `viewAs === "board"`.

**`IssueDrawer` — right-side detail panel**
- Purpose: detail view that preserves list context. Replaces Jira's full-page issue view.
- Examples: opened from `<IssueRow onOpen>`, `<GroupedList>` rows, `inbox/page.tsx` items, `command-palette.tsx` selections.
- Pattern: `useUI((s) => s.drawerIssueId === issue.id)` determines open state; the drawer is mounted in the workspace layout, not per page.

## Entry Points

**Browser entry — `apps/web/app/layout.tsx`**
- Location: `apps/web/app/layout.tsx`
- Triggers: every request.
- Responsibilities: sets `<html>` attributes, font preconnect, viewport metadata. Delegates to route group's `layout.tsx`.

**Edge proxy — `apps/web/proxy.ts`**
- Location: `apps/web/proxy.ts` (Next.js middleware convention; exports `proxy()`).
- Triggers: every request before any route handler.
- Responsibilities: auth gate. Public allowlist, Supabase session check, Better Auth cookie fallback, redirect to `/sign-in?next=…`.

**Better Auth catch-all — `apps/web/app/api/auth/[...all]/route.ts`**
- Location: `apps/web/app/api/auth/[...all]/route.ts`
- Triggers: `GET` and `POST` to `/api/auth/*`.
- Responsibilities: defers handler construction to first request (avoids throwing at import time when the auth instance is not yet initialized), wraps `toNextJsHandler` from `better-auth/next-js`.

**Root redirect — `apps/web/app/page.tsx`**
- Location: `apps/web/app/page.tsx`
- Triggers: `GET /`.
- Responsibilities: `redirect("/inbox")`.

**Dev server — `apps/web/package.json` `dev` script**
- Location: `apps/web/package.json`
- Triggers: `npm --prefix apps/web run dev` (or `npm run dev` from root).
- Responsibilities: `next dev -p 3000`.

**Vercel build — `vercel.json`**
- Location: `vercel.json`
- Triggers: Vercel deployment.
- Responsibilities: `npm --prefix apps/web run build`, output `apps/web/.next`, framework `nextjs`.

## Architectural Constraints

- **Threading / runtime:** The Next.js server runtime is Node (`runtime = "nodejs"` declared in the auth route handler). Edge runtime is *not* declared anywhere; `proxy.ts` and Supabase middleware use standard Next server APIs (no edge-only features). Vercel deploys the app as a single Next.js app.
- **Global / module-level state:** Three module-level singletons in `lib/state/mutations.ts`: `STACK` (undo history, max 50), `hostBridge` (toast handler), `lastError` (last error). `HISTORY` (per-issue undo map) lives in `lib/state/issues.ts`. `WORKSPACES` and `counter` live in `hooks/useWorkspace.ts` and `lib/state/saved-views.ts` respectively. All are intentionally client-only and run after hydration.
- **Circular imports:** None observed in `apps/web`. The state files cross-import (`useUI` ← `useIssues` ← `useMutations` etc.) but the cycle is resolved by hoisting or by importing types only.
- **Cookies / sessions:** Two cookie names are read by `proxy.ts` — Supabase SSR cookies (managed by `@supabase/ssr`) and `better-auth.session_token` (plus its `__Secure-` variant for HTTPS). Browser auth state is read via Better Auth's `useSession()` from `lib/auth/client.ts`.
- **Path alias:** Single root alias `@/*` → `apps/web/*`. `components.json` re-aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` — these match the actual folders; `@/components/ui` is reserved for shadcn-generated components (none yet).
- **Mock vs. real:** All state mutations currently call zustand setters directly (no `fetch`). The `apply()` pipeline is shaped to accept a real network call later without changing call sites. No code path reads from Supabase or Postgres today; `lib/db/` does not exist yet.
- **Drizzle / migrations:** `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`, `db:reset` scripts exist in root `package.json`, but no `drizzle.config.*`, no `migrations/`, no `lib/db/` — all land in Phase 2.

## Anti-Patterns

### Reading from `lib/mock/` directly inside a server component

**What happens:** Pages and components import `ISSUES`, `PROJECTS`, etc. from `@/lib/mock` directly (`apps/web/app/(workspace)/inbox/page.tsx:8`, `apps/web/app/(workspace)/home/page.tsx:6`, `apps/web/app/(workspace)/projects/[key]/page.tsx:10`).
**Why it's wrong:** This couples rendering to in-memory data and prevents SSR data fetching. The whole `(workspace)` tree is forced to be client-only because the imports are static. It also makes the eventual Drizzle migration a wide-blast-radius change.
**Do this instead:** Wait for Phase 2 to land. Pages will read from server actions / Drizzle in `lib/db/` (L5b), and client components will read from TanStack Query or `useIssues` hydrated from the server. Until then, treat direct `lib/mock` imports in pages as a known placeholder, not a pattern to copy.

### `"use client"` on every page

**What happens:** Every file in `app/(workspace)/*/page.tsx` starts with `"use client"` (15 files found). Layouts remain server components.
**Why it's wrong:** Prevents RSC streaming, server-side data fetching, and reduces cacheability. The reason it exists today is the mock data dependency, not an architectural decision.
**Do this instead:** After Phase 2 ships, server components will fetch via Drizzle (or call server actions) and pass serialized data as props to client components. Pages should not be `"use client"`; child components like `IssueRow`, `GroupedList`, `FilterPopover` will keep the directive because they need zustand.

### Forgetting to declare `runtime = "nodejs"` on a Node-only route

**What happens:** `app/api/auth/[...all]/route.ts:2` explicitly exports `runtime = "nodejs"`. This is necessary because Better Auth's `pg.Pool` adapter is Node-only.
**Why it's wrong (if forgotten):** Defaulting to edge breaks the `pg` import at request time and the route fails at runtime.
**Do this instead:** Every new route handler that uses `pg`, `pg.Pool`, `node:crypto`, or any Node-only API must set `export const runtime = "nodejs"`.

### `new Response(JSON.stringify(...))` instead of typed Next helpers

**What happens:** `app/api/auth/[...all]/route.ts:28,38` uses `new Response(JSON.stringify({ error: ... }), { status: 500 })` for error returns.
**Why it's wrong:** Loses the typed `NextResponse.json()` convenience; the cast is repeated.
**Do this instead:** Use `NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })` from `next/server` for consistency with the rest of the codebase once auth is wired.

### Importing from `@/lib/auth/client` in server code

**What happens:** The browser client in `lib/auth/client.ts` does `if (typeof window !== "undefined") return window.location.origin`. Server code that imports it (`apps/web/hooks/useCurrentUser.ts:8`) gets the same module because Next bundles the "use client" module correctly, but importing helpers like `(authClient as any).forgetPassword` from server code (`apps/web/components/auth/forgot-password-form.tsx:8`) leaks browser globals into the server bundle.
**Why it's wrong:** Mixed client/server modules cause confusing SSR errors and break tree-shaking.
**Do this instead:** Server-side Better Auth use must go through `lib/auth/server.ts`'s `getAuthInstance()` (placeholder today). Client-side use goes through `lib/auth/client.ts`. Re-exports from `lib/auth/index.ts` are safe for both because they re-export only types and the client methods.

## Error Handling

**Strategy:** Defensive at the boundary, optimistic in the store.

**Patterns:**
- **Route handlers** — `app/api/auth/[...all]/route.ts` wraps `toNextJsHandler` in a `try/catch` that logs `[auth] GET/POST error: <msg>` and returns a 500 with a JSON body. Init errors are also logged with the first three stack frames.
- **Auth forms** — `apps/web/components/auth/sign-in-form.tsx`, `sign-up-form.tsx`, `magic-link-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx` all follow the same shape: `setError("")` → `setLoading(true)` → `try { res = await signIn.X(...) }` → if `res?.error` set the message, if no `res?.data` log and set a generic "unexpected response", else `setDone(true)`. `finally { setLoading(false) }`.
- **Mutations** — `lib/state/mutations.ts` exposes `hostBridge` and a `lastError` singleton + `errorListeners` set. A failed mutation pushes a `LastError { message, at, affectedIds }` and notifies subscribers. The `Error` toast variant (`variant: "error"`) reuses the same toast component with a different icon.
- **Proxy / auth gate** — `apps/web/proxy.ts:30` falls through to a redirect; it does not throw on missing session.
- **Supabase / cookie writes** — `utils/supabase/server.ts:13` wraps `cookiesToSet` in a `try { … } catch {}` because `cookies()` may be read-only in Server Components; this is intentional.

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only. `[auth] …` and `[observability] …` are the only structured prefixes in use today. No logger module exists; `lib/observability/index.ts` will replace this with Sentry + PostHog in Phase 4J.

**Validation:** `zod` is installed (`apps/web/package.json:52`) and used by Better Auth under the hood, but the app code does not import it. Form validation is hand-rolled (HTML5 + state-based). `lib/auth/password-policy.ts` provides `validatePassword()` (length, charset, common-password check) and a stub `checkBreach()` for HIBP k-anonymity (Phase 3K).

**Authentication:** Two systems in play. (1) **Supabase Auth** — checked in the proxy via `utils/supabase/middleware.ts`; cookie-based session. (2) **Better Auth** — checked in the proxy via cookie name match; full client at `lib/auth/client.ts` with `magicLinkClient`, `twoFactorClient`, `organizationClient` plugins. The browser app uses Better Auth; the proxy falls back to Supabase if the Better Auth cookie is absent. Both env vars are required at runtime.

**Authorization / RLS:** **Not yet enforced.** There is no database, no `lib/db/`, no RLS policies. The 13-layer spec calls for RLS to be the *only* tenancy boundary (the app has no `requireRole(user, 'admin', workspaceId)` helper). This lands in Phase 2.

**State / cache invalidation:** Browser-side only. `useUI` and `useSavedViews` are persisted to `localStorage` via `zustand/middleware`. `useIssues` is in-memory only. There is no server cache yet (no TanStack Query in use; `useViewQuery` is a hand-rolled URL binder, not a nuqs hook despite nuqs being installed).

**Theming / density:** Density (`compact` | `default` | `roomy`) is a single value in `useUI`, persisted to localStorage, and surfaced to CSS via `<html data-density="…">` in `app/layout.tsx:22`. The `StatusBar` exposes the toggle; Tailwind reads the `data-density` attribute to swap row heights.

---

*Architecture analysis: 2026-06-07*
