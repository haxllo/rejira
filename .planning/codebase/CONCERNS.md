# Codebase Concerns

**Analysis Date:** 2026-06-07

This document captures tech debt, known bugs, security and performance concerns, fragile areas, and missing features for rejira as it stands at the end of Phase 1 / start of Phase 2.

The codebase is a Next.js 16 / React 19 / Supabase / Drizzle monorepo. Phase 0 (Foundation) and Phase 1 (Interactions) are marked complete; Phase 2 (Supabase + Drizzle data layer) is the next deliverable. All data still flows from in-memory mock modules under `apps/web/lib/mock/`.

## Tech Debt

### Entire data layer is mock — must be deleted in Phase 4

**Issue:** Every page, component, and state store reads from `apps/web/lib/mock/*` instead of a real database. Per `AGENTS.md`, the mock is deleted in Phase 4. Today, no data can be persisted, no two browser sessions stay in sync, and any "create" or "edit" action is lost on reload.

**Files (heavy mock coupling):**
- `apps/web/lib/mock/index.ts` — barrel
- `apps/web/lib/mock/types.ts`, `users.ts`, `projects.ts`, `issues.ts`, `inbox.ts` — fixtures
- All page/component files that import from `@/lib/mock` (effectively every page: inbox, my-issues, home, search, projects/*, views/*, settings)

**Impact:** No real persistence, no multi-user, no shared workspace. Phase 2 is the first chance to fix this; the sooner mock coupling is removed from the page layer, the smaller the eventual Phase 4 diff.

**Fix approach:** Phase 2 introduces Drizzle; Phase 4 (per `AGENTS.md`) deletes `lib/mock/` wholesale. Until then, treat the mock as a temporary read-only fixture — do not let new code branch on mock-only shapes (e.g., `u_aria` IDs — see "Hardcoded current user = u_aria" below).

### Convex legacy checked, none found

**Issue:** Verify no Convex artifacts remain after the Convex → Drizzle decision. None found.
- No imports of `convex`, `convex/react`, `convex/server` in `apps/`, `packages/`, or `scripts/`.
- `package.json` dependencies do not list `convex`.
- The build log does not mention Convex.
- `PLAN.md` and `AGENTS.md` both state the decision is irrevocable and that Convex is not coming back.

**Impact:** None. No action required; this is documented as evidence the cleanup is complete.

**Fix approach:** Keep checking `package.json` and grep on each phase so a new install doesn't re-introduce the dep.

### `as any` casts undermine type safety

**Issue:** Multiple files cast through `any` to bypass missing types. The `eslint-config-next` and `tsconfig.json` `strict: true` settings will not catch regressions in any of these spots.

**Files and locations:**
- `apps/web/lib/auth/client.ts:43-46` — destructures `authClient as any` for `resetPassword`, `forgetPassword`, `requestPasswordReset`. Better Auth's official API surface has changed (renamed between 1.4 and 1.6); the project is on `^1.4.0` at root and `^1.6.14` in `apps/web/package.json`, so the `as any` is hiding an actual version skew.
- `apps/web/components/auth/forgot-password-form.tsx:8` — same kind of cast, falling back from `requestPasswordReset` to `forgetPassword`.
- `apps/web/components/auth/sign-in-form.tsx:19`, `sign-up-form.tsx:20`, `magic-link-form.tsx:19` — `await signIn.email(...) as any` to read `res.error.message`.
- `apps/web/components/auth/two-factor-setup.tsx:16` — `enableTwoFactor(password) as any` then `setSecret(result as ...)`.
- `apps/web/lib/auth/backup-codes.ts:13` — `(twoFactorApi as any).viewBackupCodes()`.
- `apps/web/lib/observability/index.ts:17,22` — `Record<string, any>` for event props.
- `apps/web/components/issue/issue-drawer.tsx:453` — `activity.payload.to as any` for `priority_changed`.

**Impact:** Runtime errors will be unguarded by TypeScript; an upstream Better Auth API change can silently break the auth flow without compile-time warning. Auth is security-critical so the impact is high.

**Fix approach:** Add a typed `auth-client.d.ts` and import concrete return types from `better-auth/react` once Phase 3A wires the real instance. Replace `as any` with explicit `unknown` narrowing + zod parsing at the boundaries (already a project dep, see `package.json:38`).

### Two `package-lock.json` files — Next.js build warning

**Issue:** `build.log` records a Next.js 16.2.7 warning: "We detected multiple lockfiles and selected the directory of `G:\ciqada2\Projects\jira redesign\package-lock.json` as the root directory... Detected additional lockfiles: `apps/web/package-lock.json`."

**Files:** `package-lock.json` (root) and `apps/web/package-lock.json` (nested).

**Impact:** The workspace root will be mis-inferred on Vercel, producing hard-to-debug path resolution issues. The warning is also a build-time leak of the monorepo shape.

**Fix approach:** Set `turbopack.root` in `apps/web/next.config.ts` (per the Next.js docs message in `build.log`), or delete the inner `apps/web/package-lock.json` and rely on the root one. The simpler fix is the lockfile removal since `workspaces: ["apps/*"]` in the root `package.json:25` already means one lockfile is authoritative.

### `db:studio` script contradicts the project decision

**Issue:** `package.json:15` defines `"db:studio": "drizzle-kit studio"`. The project decision (per `AGENTS.md` → `PLAN.md`) is to use Supabase Studio, **not** Drizzle Studio. The script name `db:studio` is ambiguous and the underlying command is the disallowed one.

**Impact:** A developer who runs `npm run db:studio` will get Drizzle Studio, not the Supabase Studio flow that Phase 2 plans call for. This silently violates the decision and is not obviously wrong-looking.

**Fix approach:** Remove or rename to `db:studio:drizzle` (matching the alias in `PHASE_2_PLAN.md:283`). Add an `db:studio:supabase` that points at the Supabase dashboard.

### `apps/web/proxy.ts` exports a named function, not a default

**Issue:** Next.js 16's new convention is `proxy.ts` exporting a `default` function called `proxy`. The current file does `export async function proxy(request: NextRequest)` (named, not default). File path: `apps/web/proxy.ts:13`.

**Impact:** Next.js may silently fail to register the proxy/middleware at all. Sessions will not be checked for protected routes; unauthenticated users can hit `/(workspace)/*` directly because the only check is a client-side redirect from a route handler that may not run. (Empirically the `/sign-in` and `/(auth)/*` pages exist, but nothing actually blocks the workspace shell from rendering without a session.)

**Fix approach:** Change to `export default async function proxy(request: NextRequest) { ... }` once Phase 3A lands. Until then, the `proxy.ts` file should be considered dead code; the redirect path through it is a stub.

### `apps/web/components/issue/issue-drawer.tsx:78-83` indentation is brittle

**Issue:** The `const onKey` `useEffect` block has hand-aligned closing braces (`});` / `}` / `};`) that are valid in isolation but easy to break on refactor. The `build.log` shows a recent Turbopack build error on this file at line 82:

```
./apps/web/components/issue/issue-drawer.tsx:82:6
'const' declarations must be initialized
Expected a semicolon
```

The current read shows the braces close cleanly, but the build log proves a recent revision had the file unparseable. The structure (an `if` containing an `apply({...})` containing arrow function `undo`/`retry`, then `useEffect` body) is a refactor trap.

**Files:** `apps/web/components/issue/issue-drawer.tsx:62-83`.

**Impact:** Random build breaks for anyone editing the file. Refactoring this hook into a custom `useIssueQuickStatus()` would localize the risk.

**Fix approach:** Extract the `⌘1-5` quick-status effect to its own `useEffect` and a small helper, removing the nested-arrow-function-inside-if-inside-callback shape.

### `tsconfig.json` has `skipLibCheck` listed twice

**Issue:** `apps/web/tsconfig.json:10` and `:28` both set `"skipLibCheck": true`. Duplicate key — no functional impact but a lint smell.

**Fix approach:** Delete the line at `:28`.

### `apps/web/.env.example` doesn't match what `utils/supabase/{client,server,middleware}.ts` reads

**Issue:** `utils/supabase/client.ts:6` and `utils/supabase/server.ts:8` and `utils/supabase/middleware.ts:8` read `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!`. The repo-root `.env.example` defines `NEXT_PUBLIC_SUPABASE_ANON_KEY` and explicitly notes "Also accepted: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (newer alias for the anon key)". `apps/web/.env.example` only defines `NEXT_PUBLIC_SUPABASE_ANON_KEY`. So out of the box, the new env var name is referenced in three files but is not even in the example file. The `!` non-null assertion will also crash at runtime if the env var is unset.

**Files:**
- `apps/web/utils/supabase/client.ts:6`
- `apps/web/utils/supabase/server.ts:8`
- `apps/web/utils/supabase/middleware.ts:8`
- `apps/web/.env.example` (missing key)
- `.env.example` (root, only lists the older alias)

**Impact:** If a fresh checkout sets only `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the documented variable), the Supabase clients will throw on the `!` assertion. Conversely, if only the new alias is set, devs following `.env.example` are surprised.

**Fix approach:** Pick one. The project should standardize on `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (per Supabase's current docs) and update both `.env.example` files; or read both with a fallback. The current `!` assertion should become a clear runtime error so misconfiguration is loud, not silent.

### `proxy.ts` is referenced from nothing — orphaned

**Issue:** `apps/web/proxy.ts` exists at the project root of the web app but is never referenced in `next.config.ts` or any other file. It also has the wrong export style (named, not default) per the previous concern.

**Fix approach:** Either wire it correctly (default export, see above) or delete until Phase 3A.

## Known Bugs

### Hardcoded current user = `u_aria`

**Issue:** The "me" filter and the current-user hook both hardcode `u_aria` (Aria Vance) as the logged-in user. This is fine while the app is single-user / mock-driven, but it leaks assumptions into the page layer that the real auth flow will have to override.

**Files and locations:**
- `apps/web/lib/state/view-query.ts:140` — `if (f === "me" && assigneeIds.includes("u_aria")) return true;` — every "me" filter only ever matches Aria. Any other user sees zero results for "me" in the filter popover.
- `apps/web/hooks/useCurrentUser.ts:11-20` — `useCurrentUserId()` reads the session but falls back to `USERS[0]?.id ?? "u_aria"`. As soon as any other user signs in, the mock fallback overrides them.
- `apps/web/lib/state/view-query.ts:140` is the same hardcode reached through a different path.
- `apps/web/components/issue/issue-drawer.tsx:481` — `const meId = USERS[0]?.id ?? "u_aria";` (the ReplyBox author).
- `apps/web/components/issue/create-issue-dialog.tsx:36,45,62` — new issues are created with `authorId: "u_aria"` and default `assigneeIds: ["u_aria"]`.
- `apps/web/app/(workspace)/home/page.tsx:11-13` — `const me = "Aria";` and filters issues by `assigneeIds.includes("u_aria")`.
- `apps/web/components/views/filter-chips.tsx:113` — `isMe ? USERS.find((u) => u.id === "__me__")` — looks up a non-existent ID `"__me__"`, always returns `undefined`, so the chip renders `"Me"` label with `value: "Me"` (lucky fallback at line 117). If the label fallback at line 117 is changed, this will silently render the user id literally.

**Impact:** Once auth is wired (Phase 3A), the wrong user will be associated with filters, comments, and "my issues". The current-user code path is a placeholder that must be replaced before any real login.

**Fix approach:** Make every "me" / current-user lookup go through `useCurrentUserId()` (which already has the session-aware path). Replace `assigneeIds.includes("u_aria")` in `view-query.ts` with `assigneeIds.includes(currentUserId)`. Remove the `__me__` placeholder and the `USERS[0]?.id` fallbacks entirely.

### Hardcoded cycle ID and date strings

**Issue:** Multiple page-level deep-links and stat values are hardcoded to specific mock data IDs and dates.

**Files and locations:**
- `apps/web/app/(workspace)/projects/eng/cycles/23/page.tsx:15-16,20` — `cycleById("c_23")` and `s.issues.filter((i) => i.cycleId === "c_23")`. The route only ever renders cycle 23; the URL `/projects/eng/cycles/24` (cycle 24 exists in mock) 404s.
- `apps/web/lib/state/keyboard.ts:147` — `c: "/projects/eng/cycles/23"` — `g c` shortcut is broken for any cycle that isn't 23.
- `apps/web/components/issue/issue-drawer.tsx:144` — `cycle.name.replace(/^Cycle \d+ — /, "")` — the regex assumes the cycle name format `Cycle NN — <goal>`; if a cycle's name doesn't match, the prefix isn't stripped (silent cosmetic).
- `apps/web/app/(workspace)/projects/[key]/page.tsx:41` — `i.updatedAt > "2026-05-30"` — hardcoded "completed this week" cutoff. Will silently show wrong data after 2026-05-30.
- `apps/web/app/(workspace)/projects/[key]/page.tsx:63` — `cycles/23` deep-link again, hardcoded.
- `apps/web/components/shell/primary-nav.tsx:89` — `href="/projects/eng/cycles/23"` and line 98-110 — entire "Cycle 23 — 2 days left" footer with hardcoded `width: "62%"` and `26 / 42 pts`.
- `apps/web/app/(workspace)/home/page.tsx:24` — `description="Tuesday, June 6 · here's your snapshot for today."` — the rendered greeting hardcodes the date.

**Impact:** Tests will flake past 2026-05-30. The cycle page only works for one cycle. The "completed this week" stat is wrong by default. None of these break the build, but the date-driven bugs will silently ship to production.

**Fix approach:** In Phase 2, replace with Drizzle queries parameterized by route id and current time. Until then, gate the hardcoded values behind a dev-only flag or add a `// TODO: 2A` annotation.

### Inbox row `actorName` drift from user names

**Issue:** The mock `INBOX` records have `actorName` strings like "Aria Wen", "Kenji Park", "Maya Okafor" (mock `users.ts` has "Aria Vance", "Kenji Sato", "Maya Iyer"). The inbox row at `app/(workspace)/inbox/page.tsx:111-112` only uses the user lookup if `actorId` is provided; when missing, it uses `item.actorName` directly. Result: in mock state, the names are inconsistent and the Avatar uses a different "name seed" than the canonical user record.

**Files:** `apps/web/lib/mock/inbox.ts:10-100`, `apps/web/lib/mock/users.ts:3-16`, `apps/web/app/(workspace)/inbox/page.tsx:110-112`.

**Impact:** Cosmetic in mock; will be moot after the mock is deleted.

**Fix approach:** Out of scope — fix by deleting `lib/mock/`.

### Cycle "velocity 42" hardcoded in cycle page

**Issue:** `apps/web/app/(workspace)/projects/eng/cycles/23/page.tsx:28` — `const velocity = 42;` — fake metric. Same for "26/42 pts" and "62%" in `components/shell/primary-nav.tsx:108-110`.

**Impact:** Cosmetic; flagged because it's the kind of thing that gets copy-pasted into other code paths as "real" data.

### `useViewQuery` re-sync effect is over-broad

**Issue:** `apps/web/hooks/useViewQuery.ts:37-43` — `useEffect` depends only on `search` (the URLSearchParams instance). When the URL changes for any reason (back/forward, manual replace), state is reset to the URL values, but the effect does not compare against the current state. Multiple navigation events in the same render cycle can clobber an in-flight `setFilter` call.

**Impact:** Race condition where a user's filter choice gets reverted to the URL value if the user clicks ⌘K → "View all" while a debounced URL write is pending (debounce 200ms in `setFilter`).

**Fix approach:** Compare current `filter` and `view` against the parsed URL and only update on actual change. Or use `useSyncExternalStore` against the URL.

### `useEffect` in `my-issues/page.tsx` reseeds the filter on every mount

**Issue:** `apps/web/app/(workspace)/my-issues/page.tsx:43-56` — `useEffect(() => { vq.setFilter(...) }, [])` sets the default filter on mount. If the user navigates away and back, the defaults are reset, wiping any "me + done" view they had.

**Impact:** Multi-step workflows that involve leaving My Issues lose state on return.

**Fix approach:** Only set defaults when no filter state is present AND the user has not previously saved a view. Or move the default into `DEFAULT_FILTER_FOR_VIEW` in `view-query.ts:43-48`.

### `useUI.setState({})` no-op in project landing page

**Issue:** `apps/web/app/(workspace)/projects/[key]/page.tsx:87` — `onClick={() => useUI.setState({})}` — the active-cycles button has an `onClick` that does nothing. Dead handler. Either a stub for Phase 2 routing or a forgotten implementation.

**Impact:** Clicking the active-cycle card on the project landing has no effect.

**Fix approach:** Wire it to navigate to `/projects/${project.key}/cycles/${c.number}` (or use cycle id) once cycle routing is parameterized.

### `BulkActionBar` undo snapshots are full state replacements

**Issue:** `apps/web/components/views/bulk-action-bar.tsx:212-216,229-237,253-265,281-285,304-308` — every undo callback rewrites the issue state to a captured `Map`. This is the same pattern as `useIssues.setState({ issues: before })` in `cycle-board.tsx:123` and `grouped-list.tsx:189`. If the user undoes one bulk action while another mutation has already changed the same issue (status, priority), the undo silently overwrites the newer change. There is no merge logic.

**Impact:** Lost work after a single undo if the user has done two bulk actions in succession. Mild for status changes, more visible for priority/label/assignee.

**Fix approach:** When Phase 4 wires real mutations, the undo should call a server endpoint to revert rather than restoring client state. Until then, document this in the action toast.

## Security Considerations

### `.env.local` exists at the repo root

**Issue:** `.env.local` is present (319 bytes) at `G:\ciqada2\Projects\jira redesign\.env.local`. `.gitignore:3-4` correctly excludes `.env.local` and `.env*.local`, so it is not committed.

**Risk:** Low (it's gitignored), but worth verifying after every checkout: the file's existence suggests real Supabase credentials are present. **The contents were not read by this audit.** The risk is: future contributors copy `.env.local` to a commit (e.g., a misguided "for your convenience" `git add .env*`).

**Current mitigation:** `.gitignore` blocks it.

**Recommendations:** Add a `SECURITY.md` note explaining that `.env.local` must never be committed, and consider adding a `pre-commit` hook (when git is initialized — see "No git history yet").

### RLS is the only tenancy boundary — and the schema is not yet applied

**Issue:** Per `AGENTS.md`, RLS on every table is the only authorized tenancy boundary. There is no `requireRole` helper on the server. The risk is: in Phase 2, the temptation to write a `requireRole(user, 'admin', workspaceId)` helper is strong; the architecture requires that no such helper exists. Today there is no DB, so the risk is latent; when the schema lands, every table must ship with RLS policies in the same migration or a follow-up.

**Risk:** If a single table ships without RLS, the entire multi-tenant model is broken. One mistake, one data leak.

**Current mitigation:** None in code yet. The architectural plan (`PLAN.md`, `AGENTS.md`) explicitly forbids app-side role checks.

**Recommendations:**
- Add a CI check that runs after `supabase db push` and fails if any table lacks `ENABLE ROW LEVEL SECURITY` (a `pgTAP` test, per Phase 2H plan).
- Add a static check that `apps/web/` contains no `requireRole`-like helper. Easier: add an ESLint rule that fails the build if certain function names appear.

### No CSRF protection on the auth route handler

**Issue:** `apps/web/app/api/auth/[...all]/route.ts` is the Better Auth catch-all. Better Auth itself has CSRF protection (it uses SameSite cookies and a token exchange), but the proxy at `apps/web/proxy.ts:24-26` does a cookie-name check without verifying the value:

```ts
const hasSession = request.cookies.has("better-auth.session_token") ||
  request.cookies.has("__Secure-better-auth.session_token");
if (hasSession) return NextResponse.next();
```

This lets any request that sets an empty `better-auth.session_token=` cookie bypass the redirect. Combined with the (probably) broken proxy registration (named export vs default), an attacker who can set a cookie on the auth subdomain gets into the workspace shell.

**Risk:** If the proxy file is actually loaded by Next.js, the cookie-name check is exploitable. The cookie value is never validated.

**Current mitigation:** Better Auth will reject the invalid session cookie when the server-side `auth.api.getSession()` is called. But the page may still render briefly with a phantom user.

**Recommendations:** Verify the proxy actually runs in dev (`curl -I http://localhost:3000/inbox`) before Phase 3. Don't rely on cookie-name presence; call Better Auth to validate.

### Two-factor backup codes are not actually generated

**Issue:** `apps/web/lib/auth/backup-codes.ts:12-14` — `getBackupCodes()` calls `(twoFactorApi as any).viewBackupCodes()`. The `as any` and the absence of any real auth instance mean this throws. The page at `app/(auth)/two-factor/backup-codes/page.tsx:14-24` catches and sets codes to `[]` on error, showing "View backup codes" with no result.

**Risk:** None today (auth is not wired). High when Phase 3A lands if this isn't fixed — users would have no recovery path.

**Recommendations:** This is part of Phase 3 plan; just flagging that the failure mode is silent.

### OAuth callback URL is environment-sensitive

**Issue:** `apps/web/lib/auth/oauth-config.ts:1-9` — the file says "The callback URL pattern is `{baseURL}/api/auth/callback/{provider}`". But there's no enforcement that the `baseURL` matches the configured `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL`. If those diverge between env files, OAuth flows will round-trip to the wrong origin.

**Risk:** OAuth login lands on the wrong host and the user gets a confusing error.

**Recommendations:** Add a startup check that the OAuth client_id/secret was registered for the current baseURL.

### `in-memory` rate limit is per-instance

**Issue:** `apps/web/lib/auth/rate-limit.ts:13-39` — the comment explicitly says "In serverless/multi-instance deployments this in-memory map is per instance and will undercount; the Better Auth database rate limit is the real ceiling." The file is documented as defense-in-depth.

**Risk:** If the Better Auth DB rate limit is misconfigured, the per-instance limit is silently bypassed.

**Recommendations:** Default-on `OFF` rather than `ON`. Right now if a future dev imports `checkRateLimit` and uses it without verifying the DB limit is up, they get false security.

## Performance Bottlenecks

### `useIssues` subscribes the whole array to every consumer

**Issue:** `apps/web/lib/state/issues.ts:75` — `useIssues = create<IssuesState>((set, get) => ({ issues: INITIAL_ISSUES, ... }))`. Every consumer that reads `s.issues` (e.g., `my-issues/page.tsx:31`, `home/page.tsx:12`, `inbox/page.tsx:18` indirectly via INBOX) subscribes to the entire issue list. Every mutation (`setStatus`, `addIssue`, `bulkArchive`) creates a new array via `.map`, which re-renders every consumer regardless of which issue changed.

**Impact:** With ~30 issues in mock, this is fine. With a real workspace of 1,000+ issues, every status change re-renders the entire app.

**Fix approach:** In Phase 2/4, use Drizzle to fetch only the subset each view needs, and use Zustand's `useShallow` or per-issue slices.

### Filter runs on every render

**Issue:** `apps/web/lib/state/view-query.ts:300-313` — `useFilteredIssues` is a `useMemo` that depends on `[state, group, sortKey, sortDir, source]`. Any of those changing recomputes the entire filter. With 1,000+ issues, this is `O(n)` per render of every consumer.

**Impact:** Linear scaling in the size of the issue list. Will be fine for mock (30 issues) and not fine for real data.

**Fix approach:** Move filtering server-side (Postgres + RLS + view parameters) in Phase 4. Use cursor pagination instead of "load all then filter".

### `INBOX.filter((i) => !i.read).length` runs twice on every render

**Issue:** `apps/web/app/(workspace)/inbox/page.tsx:52,71,73` — same `INBOX.filter(...)` recomputed three times. The cost is trivial for 10 mock items; will be O(n) in real data.

**Impact:** Negligible today.

**Fix approach:** `const unread = INBOX.filter(...).length` once.

### `Activity.payload` type is `Record<string, unknown>`

**Issue:** `apps/web/lib/mock/types.ts:80` — `payload: Record<string, unknown>`. Every render of the activity row does `activity.payload.to as any` (drawer line 453) or `as StatusKey` (line 444) — both unchecked.

**Impact:** Runtime crashes if a payload key is missing or wrong type. Minor.

**Fix approach:** Discriminated union on `Activity.type`.

### Drag overlay redraws the entire issue body

**Issue:** `apps/web/components/views/cycle-board.tsx:174-176`, `apps/web/components/views/grouped-list.tsx:293-295` — `DragOverlay` renders the entire card/row body (labels, priority, assignee, etc.) at 60fps during a drag. With 100+ cards on screen and motion springs, this can hit the per-frame budget.

**Impact:** The project is opinionated about interaction budgets; this is exactly the kind of thing to monitor.

**Fix approach:** Render a simplified version of the card in the overlay (key, title, status dot) — the same one Linear uses.

## Fragile Areas

### `mutations.ts` undo stack and pending-pulse timing

**Issue:** `apps/web/lib/state/mutations.ts:54-176` — the `STACK`, `lastError`, `hostBridge`, and the `requestAnimationFrame` pending-pulse are all module-level singletons. Hot reload in dev can leak listeners (`window.addEventListener` callbacks that reference dead closures).

**Files:** `apps/web/lib/state/mutations.ts:155-176`.

**Impact:** Memory growth in dev across hot reloads. The cleanup function is returned from `bindToastHost` (line 65) but the `jira:toast` listener at line 95 has no cleanup if `setPending`'s `useIssues.setState` is called on a dead store.

**Fix approach:** Move module-level state into a Zustand store (or React context) so dev-mode HMR can dispose it cleanly.

### `cycle-board.tsx:107-138` mutates `useIssues` from the drag handler

**Issue:** The drag handler reads `useIssues.getState().issues`, mutates, then `apply({ undo: () => useIssues.setState({ issues: before }) })`. The undo callback captures `before` by closure. If the user drags 5 issues in quick succession and then undoes them, each undo restores the state from the time of *that* drag, but the captures are not stacked — every undo replays the original snapshot over the current state, wiping subsequent changes.

**Files:** `apps/web/components/views/cycle-board.tsx:117-138`, `apps/web/components/views/grouped-list.tsx:178-211`.

**Impact:** Multi-drag-undo is broken; the second undo overwrites the first.

**Fix approach:** When Phase 4 wires real mutations, undo is a server call. Until then, use the per-issue `HISTORY` map in `lib/state/issues.ts:51` (already exists) instead of whole-state snapshots.

### `issue-drawer.tsx` keyboard `⌘1-5` has `parseInt("0", 10) - 1 === -1` and `parseInt` for non-numeric keys returns `NaN`

**Issue:** `apps/web/components/issue/issue-drawer.tsx:67-68` — `const idx = parseInt(e.key, 10) - 1;` returns `-1` for `e.key === "0"` (which `STATUS_ORDER[idx]` then would error on; the `-1` is caught by the `>= 0` check at line 68, OK). But pressing `"M"` (a letter) yields `NaN - 1 = NaN`, the `>= 0` check fails, so the handler does nothing — fine. The fragility is that the check is `idx >= 0 && idx < STATUS_ORDER.length`; if STATUS_ORDER ever grows, this needs updating.

**Impact:** Low.

**Fix approach:** Use `STATUS_ORDER.indexOf(...)` if a string key is used, or document the numeric keys are exclusive.

### `saved-views` persist store is per-browser, per-workspace-tenant-confused

**Issue:** `apps/web/lib/state/saved-views.ts:29-51` — `useSavedViews` is persisted to `localStorage` under `jira-redesign-saved-views`. There is no `workspaceId` in the storage key. A user with two browser profiles (or a shared machine) will see the same saved views in both workspaces.

**Impact:** Cross-tenant view leakage in localStorage.

**Fix approach:** Key by `jira-redesign-saved-views:${workspaceId}` and bump the schema.

### `keyboard.ts` `c` shortcut conflicts with cheatsheet's "Cycle priority" (`P`)

**Issue:** `apps/web/lib/state/keyboard.ts:119-123` — pressing `c` opens the create-issue dialog, but the cheatsheet (`components/shell/cheatsheet.tsx:35`) advertises `P` for "Cycle priority" which isn't actually wired (no `p` handler in `keyboard.ts` — see the full grep). The cheatsheet is stale and will confuse users.

**Impact:** Documentation/code drift.

**Fix approach:** Either remove the unimplemented entries from `cheatsheet.tsx` or implement the missing shortcuts.

### `primary-nav.tsx` cycle progress bar (`62%`, `26/42 pts`) is hardcoded

**Issue:** `apps/web/components/shell/primary-nav.tsx:95-110` — the bottom-of-sidebar "Cycle 23" card uses `width: "62%"` literally and `26 / 42 pts`. No data binding.

**Impact:** The progress bar never updates. Cosmetic in mock.

### `view-header.tsx` "Save as view" menu has no wiring to `onSaveAsView` when not provided

**Issue:** `apps/web/components/views/view-header.tsx:73` — when `onSaveAsView` is provided, `SaveAsViewMenu` renders. But the menu is only mounted in `app/(workspace)/views/[id]/page.tsx:113-130`. Other pages (Inbox, My Issues) don't expose the menu, so users can't save those views.

**Impact:** Feature is half-wired; expected by users who read the cheatsheet (which advertises "⌘ /" to toggle).

### `IssueDrawer` onBlur race

**Issue:** `apps/web/components/issue/issue-drawer.tsx:640` — `onBlur={() => setTimeout(() => setOpen(false), 150)}`. If the user clicks an item inside the dropdown before the 150ms, the dropdown closes anyway because the `mousedown` happens before blur and the timeout still fires.

**Impact:** Status picker occasionally closes even when the user successfully clicked a new status.

**Fix approach:** Use `onMouseDown` on the dropdown items with `e.preventDefault()` (the same pattern used at line 660) for the `StatusPicker`.

## Dependencies at Risk

### `better-auth` version skew

**Issue:** `package.json:31` declares `^1.4.0`; `apps/web/package.json:38` declares `^1.6.14`. The auth code uses APIs (`forgetPassword`, `requestPasswordReset`, `viewBackupCodes`) that have been renamed between these versions. Resolved version on disk is not visible without running `npm ls better-auth` (no install log present).

**Impact:** If the resolved version is 1.4, the `as any` casts in `auth/client.ts` are also hiding missing methods. If 1.6, the `forgetPassword` reference is dead code.

**Fix approach:** Pin the same version in both `package.json` files. Add a smoke test that imports `authClient` and asserts each method exists.

### `kysely` is declared but unused

**Issue:** `apps/web/package.json:43` — `"kysely": "0.27.5"`. Kysely is a query builder; Drizzle is the chosen ORM. No imports of `kysely` were found in `apps/web/`.

**Impact:** Bundle bloat (~30KB) and an extra dep to maintain. Not a security issue, but a "what is this doing here" smell.

**Fix approach:** Remove. If it was a half-experiment for a query builder fallback, kill it.

### `react-email` declared but unused

**Issue:** `package.json:35` — `"react-email": "^4.0.0"`. The `apps/web/lib/email/` uses inline HTML strings (see `apps/web/lib/email/templates/index.ts:7-50`), not React Email components.

**Impact:** 4.0+ of `react-email` brings `@react-email/components` and a builder; not importing it means the dep is dead weight.

**Fix approach:** Either remove or commit to React Email per the Phase 3K plan that says "3K replaces these with React Email components".

### `motion` 12 is the chosen version but no install verification

**Issue:** `apps/web/package.json:44` — `"motion": "^12.40.0"`. `motion/react` is the import path used in 30+ files. Confirm at install time that `12.40.0+` ships the `motion/react` subpath export; older 12.x did not.

**Impact:** Build break on install if the subpath was added in a later 12.x.

## Missing Critical Features

### No Drizzle config

**Issue:** No `drizzle.config.ts` (or `.json`/`.mjs`) exists in the repo. `package.json:12-17` has `db:generate`, `db:migrate`, `db:push`, `db:studio` scripts that all call `drizzle-kit`, which will fail without a config. Phase 2's first deliverable is the schema + migrations + Drizzle config.

**Impact:** Phase 2 cannot start without it.

### No Supabase config

**Issue:** No `supabase/config.toml`, no `supabase/migrations/`, no `supabase/seed.sql`. The `supabase` CLI commands in `PHASE_2_PLAN.md` (2A–2H) all assume these exist.

**Impact:** Phase 2A cannot start.

### No tests

**Issue:** No `*.test.ts` or `*.spec.ts` files exist in the repo. `package.json:20-21` has `test` (Vitest) and `test:e2e` (Playwright) scripts, but no `vitest.config.ts` and no `playwright.config.ts` exist. The Vitest and Playwright packages are installed but have no configuration.

**Files searched:** `**/*.test.{ts,tsx}` and `**/*.spec.{ts,tsx}` — zero matches.

**Impact:** Phase 2H (pgTAP for RLS) and the planned Vitest/Playwright suites are completely missing. Any change is unverified.

**Fix approach:** Add `vitest.config.ts` and `playwright.config.ts` as a Phase 0 prerequisite (out of order but trivial). Write one smoke test that imports `useIssues.getState().issues.length` to confirm the mock is wired.

### No git repository

**Issue:** `Is directory a git repo: yes` per the system prompt, but no `.git/` is visible in the directory listing. `git status` was not run (out of scope). If a repo is initialized at some future point, the concerns about `.env.local` and lockfile count are the main pre-commit risks.

### `Three connection strings` not yet configured

**Issue:** Per `AGENTS.md` and `.env.example`, three connection strings must be configured per env: `DATABASE_URL` (transaction-mode 6543), `DIRECT_URL` (5432, migrations), `DATABASE_URL_SESSION` (5432, session-mode for Better Auth). No `DATABASE_URL`, no `DIRECT_URL`, no `DATABASE_URL_SESSION` is in any `.env.local` (the file exists, but its contents are not read by this audit). Phase 2A needs these to wire Drizzle.

**Impact:** Phase 2A is blocked.

### Audit log and attachment tables not yet defined

**Issue:** Per `AGENTS.md`, the schema is 16 tables including `audit_log` and `attachments`. None exist in code yet (no SQL files, no Drizzle schema).

**Impact:** Phase 2A deliverable.

### No `pgTAP` for RLS

**Issue:** Phase 2H (expanded 4H) is supposed to add pgTAP tests for every RLS policy. Today the `supabase/` directory is empty and pgTAP isn't installed.

**Impact:** Without tests, RLS regressions are silent.

### Hardcoded single-tenant data (workspace switcher is a stub)

**Issue:** `apps/web/hooks/useWorkspace.ts:6-8` — `WORKSPACES` is a single hardcoded entry. The "Acme" workspace is the only one. The switcher at `top-bar.tsx:51-72` only renders the dropdown when `workspaces.length > 1` — so the switcher is invisible.

**Impact:** Multi-tenancy is architecturally defined but the UI doesn't expose it.

**Fix approach:** Read from the Better Auth `organization` plugin in Phase 3A.

## Test Coverage Gaps

There are no tests in the repo. Every test type from the spec is missing:

**Unit (Vitest):** Zero test files. Critical missing coverage:
- `apps/web/lib/state/issues.ts` — 325 lines, all mutations
- `apps/web/lib/state/view-query.ts` — filter/sort/group semantics
- `apps/web/lib/state/mutations.ts` — undo/redo, pending-pulse, error recording
- `apps/web/lib/auth/password-policy.ts` — password rules
- `apps/web/lib/utils/date.ts` — `dueLabel`, `dueIsOverdue` edge cases
- `apps/web/lib/state/keyboard.ts` — keyboard handler

**Integration:** None. The Drizzle queries that Phase 2 will add have no scaffolding.

**E2E (Playwright):** None. The auth flow, create-issue flow, drag-and-drop, and command palette are untested.

**DB (pgTAP):** None. RLS policies will be unverified.

**Priority:** High. The Phase 2H RLS tests are the single most important gate before any data ships to production. Vitest for the state store is a close second because all mutations will be refactored in Phase 4.

## Summary Table

| Area | Severity | Where |
|------|----------|-------|
| Build may be broken in `issue-drawer.tsx` | High | `apps/web/components/issue/issue-drawer.tsx:62-83`, `build.log:21-58` |
| All data is mock, no real DB | High | `apps/web/lib/mock/*`, every page |
| `as any` casts in auth flow | High | `apps/web/lib/auth/client.ts:43-46`, plus 7 other files |
| Hardcoded current user `u_aria` | High | `view-query.ts:140`, `useCurrentUser.ts:15`, drawer 481, home 11-13, create-dialog 36/45/62, filter-chips 113 |
| Hardcoded cycle `c_23` / `23` | Medium | cycle page, keyboard.ts:147, project page, primary-nav |
| Hardcoded `"2026-05-30"` date stat | Medium | `app/(workspace)/projects/[key]/page.tsx:41` |
| `proxy.ts` named vs default export | High | `apps/web/proxy.ts:13` |
| `.env.example` doesn't list `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Medium | `apps/web/.env.example`, `utils/supabase/*.ts` |
| Cookie-presence check in proxy is bypassable | Medium | `apps/web/proxy.ts:24-26` |
| `db:studio` script is Drizzle (forbidden) | Low | `package.json:15` |
| Two `package-lock.json` files | Low | root + `apps/web` |
| `kysely`, `react-email` declared, unused | Low | `apps/web/package.json:43,35`, `package.json:35` |
| `better-auth` version skew | Medium | root `^1.4.0` vs `apps/web ^1.6.14` |
| Inbox cycle progress `62%` hardcoded | Low | `primary-nav.tsx:108-110` |
| `view-header` "Save as view" not on Inbox/My Issues | Low | `view-header.tsx:73` |
| No Drizzle config, no Supabase config, no schema | High | repo root |
| No tests, no Vitest/Playwright/pgTAP | High | repo root |
| `saved-views` localStorage not keyed by workspace | Medium | `lib/state/saved-views.ts:48-50` |
| Bulk action undo clobbers later state | Medium | `bulk-action-bar.tsx:200-329` |
| Mock `__me__` placeholder ID | Low | `filter-chips.tsx:113` |
| `motion/react` subpath availability unverified | Low | `apps/web/package.json:44` |
| Inbox `actorName` strings don't match `USERS` | Low | mock files |
| `setUI.setState({})` no-op click | Low | `projects/[key]/page.tsx:87` |
| `useViewQuery` re-sync can clobber in-flight setFilter | Low | `hooks/useViewQuery.ts:37-43` |
| `my-issues` page resets filter on every mount | Low | `my-issues/page.tsx:43-56` |

---

*Concerns audit: 2026-06-07*
