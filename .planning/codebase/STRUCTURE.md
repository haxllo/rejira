# Codebase Structure

**Analysis Date:** 2026-06-07

## Directory Layout

```
jira redesign/                        # repo root — npm workspaces monorepo
├── apps/
│   └── web/                          # the only app (Next.js 16 App Router)
│       ├── app/                      # routes, layouts, route handlers
│       ├── components/               # all React components (incl. vendored animate-ui)
│       ├── hooks/                    # client-only React hooks
│       ├── lib/                      # server + shared client modules
│       ├── utils/                    # supabase client factories (utils/supabase)
│       ├── proxy.ts                  # Next.js middleware (auth gate)
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── components.json
│       └── app/globals.css           # design tokens, density-aware
├── scripts/                          # root-level Playwright screenshot scripts
├── package.json                      # workspaces: ["apps/*"]
├── vercel.json                       # framework: nextjs, build: apps/web/.next
├── ARCHITECTURE_13_LAYERS.md         # planning doc — the 13-layer spec
├── PHASE_2_PLAN.md … PHASE_4_PLAN.md # phase plans
└── .planning/                        # GSD planning artifacts
    └── codebase/                     # this folder (ARCHITECTURE.md, STRUCTURE.md, …)
```

## Directory Purposes

**`apps/web/app/`**
- Purpose: Next.js App Router routes.
- Contains: `page.tsx` (route leaf), `layout.tsx` (segment shell), `route.ts` (HTTP handler), `globals.css` (design tokens).
- Key files:
  - `app/layout.tsx:1` — root layout (font preconnect, `<html data-density>`).
  - `app/page.tsx:1` — `redirect("/inbox")`.
  - `app/(auth)/layout.tsx:1` — centered sign-in card shell.
  - `app/(workspace)/layout.tsx:14` — mounts the entire shell: TopBar, PrimaryNav, CommandPalette, IssueDrawer, Cheatsheet, ToastHost, BulkActionBar, StatusBar.
  - `app/api/auth/[...all]/route.ts:22` — Better Auth catch-all (GET + POST).

**`apps/web/app/(auth)/`**
- Purpose: sign-in / sign-up / password reset / 2FA challenge pages. Route group: not in the URL.
- Contains: `sign-in/`, `sign-up/`, `forgot-password/`, `reset-password/`, `verify-email/`, `two-factor/`, `two-factor/setup/`, `two-factor/backup-codes/`.
- Key files: each subfolder has one `page.tsx`. Forms live in `components/auth/*`.

**`apps/web/app/(workspace)/`**
- Purpose: the authenticated app. Route group: not in the URL.
- Contains: `home/`, `inbox/`, `my-issues/`, `search/`, `settings/`, `settings/account/`, `settings/members/`, `onboarding/`, `projects/[key]/`, `projects/eng/issues/`, `projects/eng/cycles/23/`, `views/[id]/`.
- Key files: every page is `"use client"` because it reads from zustand. `onboarding/` and `invite/[token]` are Phase 3 placeholders.

**`apps/web/app/invite/[token]/`**
- Purpose: invite-accept page. Not in a route group; lives at `/invite/:token` (matches the `PUBLIC` allowlist in `proxy.ts`).
- Contains: a single `page.tsx` placeholder.

**`apps/web/app/api/`**
- Purpose: HTTP route handlers.
- Contains: `auth/[...all]/route.ts` only. No other endpoints yet.

**`apps/web/components/`**
- Purpose: every React component. Organized by domain.
- Contains (sub-folders):
  - `shell/` — TopBar, PrimaryNav, CommandPalette, StatusBar, ToastHost, Cheatsheet, GlobalShortcuts, RouteChangeSelectionReset.
  - `issue/` — IssueDrawer, IssueRow, CreateIssueDialog, DragOverlay, BoardDragOverlay.
  - `views/` — GroupedList, CycleBoard, FilterChips, FilterPopover, ViewHeader, BulkActionBar.
  - `auth/` — SignInForm, SignUpForm, MagicLinkForm, OAuthButtons, ForgotPasswordForm, ResetPasswordForm, TwoFactorForm, TwoFactorSetup, BackupCodesDisplay.
  - `team/` — WorkspaceInviteForm, RoleSelect.
  - `primitives/` — Button, Kbd, Avatar, StatusDot+getStatusLabel, PriorityIcon+getPriorityLabel, LabelChip+LabelDot. Local design system.
  - `icons/` — `custom.tsx` (navigation icons the registry doesn't ship).
  - `animate-ui/` — vendored library (icons + 4 animate primitives + IconWrapper). Treat as read-only.
- Key files: `components/shell/command-palette.tsx` (cmdk surface), `components/issue/issue-drawer.tsx` (right-side detail panel), `components/views/grouped-list.tsx` (DndContext host).

**`apps/web/components/animate-ui/`**
- Purpose: vendored copy of the Animate UI registry. 80+ icon files plus 4 primitives (`avatar-group`, `tabs`, `tooltip`, `slot`, `highlight`) and the `IconWrapper` base.
- Generated: yes (via `components.json` registry `"@animate-ui"`). Committed: yes.
- Do not edit; treat as a third-party module.

**`apps/web/hooks/`**
- Purpose: client-only React hooks.
- Contains: `useCurrentUser.ts` (Better Auth session → fallback to mock), `useWorkspace.ts` (URL `?w=` → static list), `useViewQuery.ts` (URL ⇄ filter/group/sort binding with debounced `router.replace`).

**`apps/web/lib/`**
- Purpose: server and shared client modules.
- Contains (sub-folders):
  - `auth/` — Better Auth integration: `server.ts` (placeholder factory), `client.ts` (browser client with 3 plugins), `types.ts` (AuthUser/AuthSession shapes), `oauth-config.ts` (Google/GitHub), `index.ts` (barrel re-exports), `email.ts` (signIn/signUp re-exports), `two-factor.ts`, `backup-codes.ts`, `password-policy.ts`, `rate-limit.ts` (in-memory sliding window), `audit.ts` (event bus), `account-linking.ts`, `account-deletion.ts` (Phase 3Q stub).
  - `state/` — zustand stores and shared state: `ui.ts`, `issues.ts`, `mutations.ts` (the `apply()` pipeline), `keyboard.ts` (global shortcuts), `view-query.ts` (filter parser + `useFilteredIssues`), `saved-views.ts` (persisted).
  - `mock/` — in-memory data: `types.ts`, `users.ts`, `projects.ts`, `issues.ts`, `inbox.ts`, `index.ts` (barrel + `ALL` aggregate). To be deleted in Phase 4.
  - `email/` — `transport.ts` (Console + Resend), `render.ts` (template registry), `templates/{index,auth}.ts` (4 inline HTML templates).
  - `motion/` — `variants.ts` (spring-only physics; no linear easings).
  - `utils/` — `cn.ts` (clsx + twMerge), `date.ts` (relative, short, due, etc.), `index.ts` (re-export of `cn`).
  - `i18n/` — `dict.ts` (English-only, typed `t(key, locale)`).
  - `observability/` — `index.ts` (Sentry + PostHog stubs).
- Key files: `lib/state/mutations.ts:54` (`STACK` + `apply` pipeline), `lib/auth/server.ts:14` (placeholder that throws), `lib/mock/index.ts:12` (`ALL` aggregate).

**`apps/web/utils/`**
- Purpose: non-`lib` helpers. Currently only the Supabase client factories.
- Contains: `supabase/server.ts` (server-side, uses `cookies()`), `supabase/client.ts` (browser), `supabase/middleware.ts` (used in `proxy.ts`).

**`apps/web/app/globals.css`**
- Purpose: design tokens (CSS-first Tailwind v4 via `@theme`), density rules, auth styles, label/status palettes.
- Key files: `globals.css:1` (`@import "tailwindcss"`, `@theme` block with OKLCH tokens, 5 surface levels, 3 densities).

**`scripts/`**
- Purpose: root-level Playwright screenshot scripts for design review.
- Contains: `screenshot.mjs` (10 routes × 3 densities), `filter-screenshots.mjs` (filter chip state capture).

## Key File Locations

**Entry Points:**
- `apps/web/app/layout.tsx:16` — root layout.
- `apps/web/app/page.tsx:3` — `/` → `redirect("/inbox")`.
- `apps/web/proxy.ts:13` — edge proxy / auth gate.
- `apps/web/app/api/auth/[...all]/route.ts:22` — Better Auth HTTP entry.
- `vercel.json` — Vercel build config.

**Configuration:**
- `apps/web/next.config.ts` — `reactStrictMode: true`, `experimental.optimizePackageImports: ["motion", "@radix-ui/react-dialog", "cmdk"]`.
- `apps/web/tsconfig.json` — strict mode, `paths: { "@/*": ["./*"] }`.
- `apps/web/postcss.config.mjs` — `@tailwindcss/postcss`.
- `apps/web/components.json` — shadcn-style aliases (`@/components`, `@/lib`, `@/lib/utils`, `@/components/ui`, `@/hooks`), registry `@animate-ui`.
- `package.json` (root) — `workspaces: ["apps/*"]`, scripts for `db:*`, `auth:*`, `test`, `test:e2e`, `screenshots`.
- `.env.example` (root) — Supabase keys, Better Auth, OAuth, Resend, Upstash, Sentry, PostHog, HIBP.
- `apps/web/.env.example` — `NEXT_PUBLIC_*` only (Supabase URL, Supabase publishable key, site URL, Better Auth URL, PostHog key/host).

**Core Logic:**
- `apps/web/lib/state/mutations.ts:54` — `apply()` pipeline + STACK + lastError singleton.
- `apps/web/lib/state/issues.ts:15` — `IssuesState` shape with optimistic mutators.
- `apps/web/lib/state/ui.ts:8` — `UIState` (density, drawer, selection, drag, group/sort, command palette).
- `apps/web/lib/state/view-query.ts:23` — `FilterState` shape, parser, serializer, `useFilteredIssues`.
- `apps/web/lib/auth/server.ts:14` — `getAuthInstance()` placeholder.
- `apps/web/lib/auth/client.ts:24` — `authClient` factory.
- `apps/web/lib/mock/index.ts:12` — `ALL` aggregate + per-entity re-exports.
- `apps/web/hooks/useViewQuery.ts:22` — URL ⇄ view state binding.
- `apps/web/hooks/useCurrentUser.ts:11` — `useCurrentUserId` + `useCurrentUser`.

**Testing:**
- No test files exist in `apps/web` today. `package.json` scripts declare `vitest` and `@playwright/test` as dev deps; `npm run test` runs `vitest run`, `npm run test:e2e` runs `playwright test`. No `vitest.config.*` or `playwright.config.*` yet — these land with Phase 2H/4H.

## Naming Conventions

**Files:**
- kebab-case everywhere: `issue-drawer.tsx`, `command-palette.tsx`, `filter-chips.tsx`, `issue-row.tsx`, `cycle-board.tsx`, `use-view-query.ts`, `use-current-user.ts`, `workspace-invite-form.tsx`.
- One component per file. Named exports (e.g. `export function IssueRow({ ... })`).
- Route files are fixed by Next conventions: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Store files live in `lib/state/` and are named after their primary export: `ui.ts` → `useUI`, `issues.ts` → `useIssues`, `saved-views.ts` → `useSavedViews`.

**Directories:**
- kebab-case: `animate-ui`, `auth`, `email`, `i18n`, `mock`, `motion`, `observability`, `state`, `utils`, `supabase`.
- Route groups wrap in parentheses: `(auth)`, `(workspace)`. They are URL-invisible.
- Components grouped by domain: `components/shell/`, `components/issue/`, `components/views/`, `components/auth/`, `components/team/`, `components/primitives/`, `components/icons/`, `components/animate-ui/`.
- Library grouped by concern: `lib/auth/`, `lib/state/`, `lib/mock/`, `lib/email/`, `lib/motion/`, `lib/utils/`, `lib/i18n/`, `lib/observability/`.

**Hooks:**
- `use*.ts` filenames (`useCurrentUser.ts`, `useWorkspace.ts`, `useViewQuery.ts`).
- Named exports of hook functions. No default exports in `hooks/`.

**Stores (zustand):**
- One store per file, named with the `use` prefix and PascalCase noun: `useUI`, `useIssues`, `useSavedViews`.
- File name = primary export, lowercased: `useUI` ← `ui.ts`, `useIssues` ← `issues.ts`.

**Types:**
- Co-located with the entity they describe (e.g. `StatusKey`, `PriorityKey`, `Issue`, `User` are all in `lib/mock/types.ts`).
- Primitives (`Button`, `Kbd`, `Avatar`, `StatusDot`, `PriorityIcon`, `LabelChip`) live under `components/primitives/` and re-export their prop types.

**Constants:**
- Module-level `UPPER_SNAKE_CASE` exports for the mock collections: `ISSUES`, `INBOX`, `CYCLES`, `PROJECTS`, `LABELS`, `USERS`. Barrel re-export from `lib/mock/index.ts`.

## Where to Add New Code

**New route (workspace page):**
- Create `apps/web/app/(workspace)/<feature>/page.tsx`.
- Mark `"use client"` if it consumes zustand or reads `useSearchParams`. After Phase 2, prefer a server component that fetches and passes data to a client child.
- Compose from `ViewHeader` + filter row + `GroupedList` (or your own list). Read state via `useIssues`, `useUI`, `useViewQuery(viewId)`.
- Test: Playwright e2e in `apps/web/tests/e2e/<feature>.spec.ts` (not yet created).

**New route (auth page):**
- Create `apps/web/app/(auth)/<feature>/page.tsx`. This route group is unauthenticated and uses `(auth)/layout.tsx` for the card shell.
- Form component goes in `apps/web/components/auth/<feature>-form.tsx`, named export, calls Better Auth client from `@/lib/auth/client`.
- If the URL should be public without a session, add the prefix to `PUBLIC` in `apps/web/proxy.ts:6`.

**New API route:**
- Create `apps/web/app/api/<scope>/<path>/route.ts` exporting `GET`/`POST` handlers.
- If the route uses `pg`, `node:crypto`, or any Node-only API, set `export const runtime = "nodejs"`.
- Use `NextResponse.json()` for typed responses.

**New server action:**
- Add a `actions.ts` next to the route that needs it (e.g. `apps/web/app/(workspace)/projects/[key]/actions.ts`).
- `import "server-only"` at the top.
- Validate input with `zod` (already a dep).
- Return a typed result; do not throw across the boundary — return `{ ok, data, error }` discriminated unions.

**New state store:**
- Create `apps/web/lib/state/<name>.ts` exporting `use<Name> = create<...>()(persist(...))`.
- Wire into the mutation pipeline by pushing to `apply()` from `lib/state/mutations.ts` if it represents a state change. Read-only state (e.g. derived selectors) does not need to.
- Place `HISTORY`-style module-level singletons inside the file, not in a separate `consts.ts`.

**New mock entity (Phase 1 → Phase 2 transition):**
- Add types to `apps/web/lib/mock/types.ts`.
- Add a collection to `apps/web/lib/mock/<entity>.ts` exporting the array + a `byId` lookup.
- Re-export from `apps/web/lib/mock/index.ts` and add to the `ALL` aggregate.
- Plan to delete the file in Phase 4 when the entity moves to `lib/db/schema/<entity>.ts` (Drizzle) and queries move to `lib/db/queries/<entity>.ts`.

**New shared utility:**
- `apps/web/lib/utils/<name>.ts` for client-safe helpers (no Node APIs).
- `apps/web/lib/<feature>/<file>.ts` for feature-grouped utilities.
- If the helper needs server-only data (env, `pg`), put it in `lib/<feature>/server.ts` and re-export from `lib/<feature>/index.ts` after `import "server-only"`.

**New shadcn-style primitive:**
- `components.json` declares `aliases: { ui: "@/components/ui" }`, so primitives land in `apps/web/components/ui/<name>.tsx`. There is no `ui/` folder yet — create it on first install.
- After install, hand-edit the result to fit the OKLCH token names in `globals.css` (e.g. `bg-[var(--color-surface-1)]` not `bg-zinc-900`).

**New icon (motion variant):**
- If the icon exists in the Animate UI registry, add to `apps/web/components/animate-ui/icons/<name>.tsx` (vendored copy).
- If it's a navigation-only icon (home, kanban, gantt, etc.), add to `apps/web/components/icons/custom.tsx` following the `getVariants` / `IconWrapper` pattern.
- Always export from a single re-export module (e.g. `components/icons/index.ts` — not yet created) and import via `@/components/icons`.

**New e2e test:**
- `apps/web/tests/e2e/<feature>.spec.ts` (folder not yet created).
- Add `playwright.config.ts` at the repo root or in `apps/web/`.
- Drive against `npm run dev` (port 3000) or the `screenshots.mjs` port (3738) for offline runs.

**New unit test:**
- `apps/web/tests/unit/<file>.test.ts` or co-located `<filename>.test.ts` next to the file under test.
- Configure `vitest.config.ts` at the repo root with `environment: "jsdom"` for hook/store tests.

**New screenshot test:**
- Add the route to `scripts/screenshot.mjs` (the `ROUTES` array) and re-run `npm run screenshots`.

## Special Directories

**`apps/web/components/animate-ui/`**
- Purpose: vendored third-party UI library (icons + animate primitives).
- Generated: yes (via the `@animate-ui` registry in `components.json`).
- Committed: yes.
- Treat as read-only. Do not hand-edit; regenerate from the registry if updates are needed.

**`apps/web/.next/`**
- Purpose: Next.js build output.
- Generated: yes.
- Committed: no (gitignored).

**`node_modules/`**
- Purpose: npm workspaces dependencies. Hoisted to repo root by npm workspaces.
- Generated: yes.
- Committed: no.

**`apps/web/lib/mock/`**
- Purpose: in-memory data substitute.
- Generated: no (hand-authored).
- Committed: yes.
- To be deleted in Phase 4 when Drizzle + Supabase fully replaces it.

**`screenshots/`**
- Purpose: Playwright output for design review.
- Generated: yes (by `scripts/screenshot.mjs`).
- Committed: depends on the team's preference — currently checked in per `.gitignore` defaults (review with `git status`).

**`.planning/`**
- Purpose: GSD planning artifacts.
- Generated: no.
- Committed: yes. Includes `codebase/` (this folder), `phases/`, `research/`, `config.json`, `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`.

**`.agents/skills/`, `.claude/skills/`, etc.**
- Purpose: project-level agent skills.
- Generated: no.
- Committed: yes. Currently empty in this repo (per `AGENTS.md` "No project skills found").

**`build.log`**
- Purpose: most recent `next build` output, captured for review.
- Generated: yes.
- Committed: yes (but should arguably be gitignored — review).

---

*Structure analysis: 2026-06-07*
