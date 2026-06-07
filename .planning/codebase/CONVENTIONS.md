# Coding Conventions

**Analysis Date:** 2026-06-07

## Scope

Source roots analyzed: `apps/web/app/`, `apps/web/components/`, `apps/web/lib/`, `apps/web/hooks/`, `apps/web/utils/`, plus the `package.json` / `tsconfig.json` / `next.config.ts` configuration. The `packages/` directory exists at the repo root but is **empty** (no workspaces defined under it — `package.json` at root declares `apps/*` only).

Source file counts: **186** `.ts` / `.tsx` files in `apps/web` (excluding `node_modules` and `.next`).

The two top-level enforcement files that this codebase **is missing**:
- `apps/web/.eslintrc*` / `eslint.config.*` — none found. ESLint is installed (`^9.17.0`, `eslint-config-next ^16.2.7`) and `npm run lint` is wired in `apps/web/package.json:10`, but no config file is committed.
- `.prettierrc*` / `biome.json` — none found. Prettier is **not** installed; the convention doc claims "Prettier defaults" but no tool enforces them.

---

## Naming Patterns

**Files:**
- Components: `kebab-case.tsx` — `components/issue/issue-drawer.tsx`, `components/primitives/button.tsx`, `components/sell/command-palette.tsx`. (Note: `components/sell/` is a typo for `shell/` — pre-existing in the tree, see `components/shell/global-shortcuts.tsx`, `components/shell/top-bar.tsx`.)
- Hooks: `use-kebab-case.ts` (`hooks/useCurrentUser.ts` and `hooks/useWorkspace.ts` are the only exceptions to the kebab rule) — `hooks/useViewQuery.ts`, `hooks/useIsInView.tsx`. New hooks should be `use-kebab-case.ts`.
- Lib modules: `kebab-case.ts` — `lib/auth/two-factor.ts`, `lib/state/view-query.ts`, `lib/motion/variants.ts`. (The `get-strict-context.tsx` file uses camelCase for a one-off helper.)
- Pages: always `page.tsx` inside the route folder. Layouts: `layout.tsx`. (No `loading.tsx`, `error.tsx`, or `not-found.tsx` yet.)
- Icon registry: one icon per file under `components/animate-ui/icons/<kebab>.tsx`, all `PascalCase` named exports.

**Functions / Components / Variables:**
- Components and exported functions: `PascalCase` — `export function IssueDrawer()`, `export function CommandPalette()`, `export function enableTwoFactor()`. (`Button` and `Kbd` are `export const` `forwardRef` or `function` declarations.)
- Local helpers and factory functions: `camelCase` — `function collectVisibleIds()`, `function nextIssueNumber()`, `function colorFor()`.
- Constants: `UPPER_SNAKE_CASE` for top-level immutable objects — `STATUS_ORDER`, `STATUS_META`, `PRIORITY_META`, `COMMON`, `MAX_DEPTH`, `PROJECT_KEY`. `const SHORTCUTS` and `const noop` are also `UPPER_SNAKE_CASE`.
- Booleans / state shape: `is*`, `has*`, `open*`, `show*` — `isDragging`, `isPending`, `isOAuthConfigured`, `hasSession`, `showCompletedCycles`, `openDrawer`, `commandOpen`.
- Event handlers: `handle*` or `on*` — `handleSubmit`, `handleEnable`, `handleInvite`; `onClick`, `onOpen`, `onSelect`, `onDone`, `onKeyDown`, `onRehydrateStorage`.

**Types:**
- Type / interface names: `PascalCase` — `UIState`, `IssuesState`, `MutationContext`, `LastError`, `Issue`, `StatusKey`, `PriorityKey`, `ButtonProps`, `AvatarProps`, `KbdProps`, `AuditEvent`, `EmailPayload`, `EmailTransport`, `IconProps`.
- Discriminated string unions use `Key` suffix: `StatusKey`, `PriorityKey`, `ProjectId`, `LabelId`, `UserId`, `IssueId`. (IDs are typed as `string` brand-style via the `*Id` alias.)
- Variant objects are suffixed `*Variants` (`homeVariants`, `starVariants`, `alertCircleVariants`).
- Record maps: `*_META` — `STATUS_META`, `PRIORITY_META`. The `*_META` convention is used for label→color/label/bars lookup tables.

---

## Code Style

**Formatting (observed in source, NOT enforced by any tool in-repo):**
- 2-space indentation across the entire codebase.
- Single quotes for strings; double quotes only inside JSX attribute values (HTML) and in a few icon files.
- Trailing commas present in multi-line object/array literals and function call args (Prettier default).
- Semicolons: present everywhere (Prettier default).
- Line length: appears to wrap around 100–120 chars; no enforcement.

**Linting:**
- ESLint 9 + `eslint-config-next` are installed and `npm run lint` is wired (`apps/web/package.json:10`). **No config file is committed** — `apps/web/.eslintrc*`, `eslint.config.mjs`, and `eslint.config.js` do not exist. Lint therefore uses `eslint-config-next` defaults plus any defaults baked into ESLint 9's flat config resolution.
- Project uses `// eslint-disable-next-line` 10 times, all for `react-hooks/exhaustive-deps` (8 occurrences across `hooks/`, `components/shell/status-bar.tsx`, `components/animate-ui/icons/icon.tsx`, `components/views/...`) and `@typescript-eslint/no-explicit-any` (2 occurrences in `animate-ui/primitives/effects/highlight.tsx` and `animate-ui/primitives/animate/slot.tsx`). 1 `react-hooks/rules-of-hooks` disable in `animate-ui/icons/icon.tsx:621`.

**TypeScript:**
- `strict: true` is set in `apps/web/tsconfig.json:11`.
- Target `ES2022`, module `esnext`, moduleResolution `bundler`.
- `paths: { "@/*": ["./*"] }` — the alias maps to the **app root** (`apps/web/`), not `apps/web/src/`. Use `@/lib/...`, `@/components/...`, `@/hooks/...` from anywhere in `apps/web/`.
- `noEmit: true`, `incremental: true`, `isolatedModules: true`.
- `verbatimModuleSyntax` is **not** set; the project uses a mix of `import type` and value imports freely.
- `next-env.d.ts` and `.next/types/**/*.ts` are auto-included.

**Exported-function return types:** the project claims "explicit return types on exported functions" in `AGENTS.md` ("GSD:conventions"), but the actual source mixes inferred and explicit. Examples of **explicit** return types: `export const useUI = create<UIState>()(...)` (inferred via generic), `export const getStatusLabel = (s: StatusKey) => string` is implicit, `export const getPriorityLabel = (p: PriorityKey): string` is **explicit** in `components/primitives/priority.tsx:83`. Server-only `lib/auth/server.ts:14` does explicit: `export function getAuthInstance(): ReturnType<typeof betterAuth>`. **Recommendation for new code:** keep annotating return types for exported functions; this is partially followed.

**The `any` ban is violated in 7 places** (per a repo-wide grep for `: any` and `as any`):
- `apps/web/app/api/auth/[...all]/route.ts:6` — `let _handler: any = null;`
- `apps/web/app/api/auth/[...all]/route.ts:14, 26, 36` — `catch (e: any) { ... }` (three occurrences)
- `apps/web/components/team/workspace-invite-form.tsx:23` — `catch (err: any) { ... }`
- `apps/web/app/(workspace)/inbox/page.tsx:41-43, 96` — array literals cast `as any` and an `it: any` in `.map()`
- `apps/web/components/issue/issue-drawer.tsx:453` — `priority={activity.payload.to as any}`
- `apps/web/components/animate-ui/primitives/animate/slot.tsx:20` — `children?: any`
- `apps/web/components/issue/issue-drawer.tsx` and a few client forms use `res = await ... as any` to access the `.error.message` shape on Better Auth responses. See `sign-in-form.tsx:19`, `sign-up-form.tsx:20`, `magic-link-form.tsx:19`, `two-factor-setup.tsx:16`, `forgot-password-form.tsx:8`, `app/(auth)/two-factor/backup-codes/page.tsx:18`, `lib/auth/backup-codes.ts:13`, `lib/auth/client.ts:43, 45, 46`.
- **Recommendation:** when writing new code, do not use `any`; use `unknown` for caught errors and narrow with `err instanceof Error`.

**Server vs client components:**
- Server components are the default — `app/page.tsx` and `app/layout.tsx` have **no** `'use client'` directive. `app/(workspace)/layout.tsx:14` is a server component that mounts client components (`TopBar`, `PrimaryNav`, etc.) inside it.
- `'use client'` appears in 72 files — every file under `components/animate-ui/icons/`, `components/animate-ui/primitives/`, every component in `components/auth/`, `components/issue/`, `components/shell/`, `components/team/`, `components/views/`, plus all of `lib/state/`, `hooks/`, and the `(workspace)/inbox/page.tsx` and `(workspace)/my-issues/page.tsx` pages.
- **Rule for new code:** add `'use client'` only when the file uses hooks (`useState`, `useEffect`, `useRef`, custom hooks), browser APIs, zustand stores, or motion components. Pure layout/typography/presentational JSX stays server-side.

**Module style:**
- `package.json:5` declares `"type": "module"` (ESM).
- `apps/web/package.json:5` also declares `"type": "module"`.
- `next.config.ts` uses ESM (`export default`).
- `postcss.config.mjs` is ESM.
- `proxy.ts` is an ESM module exporting an async function — see note in `Auth & Identity` section below.

**Comments — project rule violation:**
- `AGENTS.md` says "No comments unless asked", but the codebase has **100+ comment lines** across source. Most are one-line file-header `// Phase 3 — Stream 3X: ...` banners in `app/(auth)/*/page.tsx`, `app/(workspace)/**/page.tsx`, and all of `lib/auth/*`. The pattern is consistent:
  - `lib/` modules open with a 4–10 line block describing the file's purpose and phase.
  - `app/` page files have a one-line phase banner.
  - `lib/state/mutations.ts` and `lib/motion/variants.ts` have dense JSDoc-style block comments above each exported function.
  - `components/issue/issue-row.tsx:221` and `components/views/filter-chips.tsx:84, 89, 191` have `/** ... */` block comments above helper functions.
- **Recommendation for new code:** the convention is violated by existing files, but new files should follow the documented "no comments" rule. Treat the existing comment banners as legacy from the phase-by-phase construction and remove them when refactoring.

---

## Import Organization

**Order observed (no tool enforces it):**
1. React / Next / framework imports — `import * as React from "react"`, `import { redirect } from "next/navigation"`, `import type { NextConfig } from "next"`.
2. Third-party UI / state libraries — `import { motion } from "motion/react"`, `import { create } from "zustand"`, `import { Command } from "cmdk"`, `import { create } from "zustand/middleware"`, `import { useSortable } from "@dnd-kit/sortable"`, `import { cva, type VariantProps } from "class-variance-authority"`.
3. Supabase / auth / lib utilities — `import { createBrowserClient } from "@supabase/ssr"`, `import { createAuthClient } from "better-auth/react"`, `import { betterAuth } from "better-auth"`, `import { clsx } from "clsx"`, `import { twMerge } from "tailwind-merge"`, `import { format, isToday } from "date-fns"`.
4. Local alias imports — `import { cn } from "@/lib/utils"`, `import { StatusDot } from "@/components/primitives/status"`, `import { useUI } from "@/lib/state/ui"`, `import type { Issue } from "@/lib/mock"`.
5. Type-only imports use `import type { ... }` — `import type { NextRequest } from "next/server"`, `import type { Transition, Variants } from "motion/react"`, `import type { HTMLMotionProps } from "motion/react"`.

**Path aliases:**
- `@/*` → `apps/web/*` (configured in `apps/web/tsconfig.json:25-27`).
- Conventional sub-paths used in source: `@/components/`, `@/components/primitives/`, `@/components/icons/`, `@/lib/`, `@/lib/auth/`, `@/lib/state/`, `@/lib/mock/`, `@/lib/utils/`, `@/lib/motion/`, `@/lib/observability/`, `@/lib/email/`, `@/lib/i18n/`, `@/hooks/`, `@/utils/supabase/`.
- Components alias is also declared in `components.json:16-21` for the shadcn/animate-ui registries (used at install-time, not at runtime).

**Tailwind class composition:**
- Always use the `cn()` helper from `apps/web/lib/utils/cn.ts` to combine class strings — it wraps `twMerge(clsx(...inputs))`. Import as `import { cn } from "@/lib/utils"` (re-exported via `lib/utils/index.ts`).
- Tailwind classes are written in `arbitrary-value` form when binding to a CSS variable: `bg-[var(--color-surface-1)]`, `text-[var(--color-text-muted)]`, `border-[var(--color-border)]`, `h-[15px]`. This is the dominant styling pattern — almost every color in JSX uses a `var(--color-*)` reference.

---

## Error Handling

**Strategy:** **client-side try/catch with state, server-side try/catch with a 500 JSON response.** There is no global error boundary, no `error.tsx` route segment, and no Sentry wiring (the observability stub at `lib/observability/index.ts:22` is a `console.error` placeholder).

**Client-component pattern (`components/auth/sign-in-form.tsx:14-35`):**
```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const res = await signIn.email({ email, password, callbackURL: "/inbox" }) as any;
    if (res?.error) {
      setError(res.error.message ?? res.error.statusText ?? "Sign in failed");
    } else if (!res?.data) {
      setError("Sign in failed — unexpected response. Check console.");
      console.error("[sign-in] unexpected", res);
    } else {
      setDone(true);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setError(msg || "Sign in failed. Check console.");
    console.error("[sign-in]", err);
  } finally {
    setLoading(false);
  }
}
```

**Server route pattern (`app/api/auth/[...all]/route.ts:22-40`):**
```ts
export async function GET(request: Request) {
  try {
    const h = await getHandler();
    return h.GET(request);
  } catch (e: any) {
    console.error("[auth] GET error:", e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), { status: 500 });
  }
}
```

**Throw patterns (6 occurrences):**
- Stub functions that are placeholders for future phases throw a descriptive `Error` — `lib/auth/server.ts:16-21` (Better Auth not yet initialized), `lib/auth/account-deletion.ts:13, 17, 21` (Phase 3Q GDPR work), `lib/get-strict-context.tsx:16-19` (`useContext for "${name}" must be used within a Provider.`), `components/animate-ui/primitives/effects/highlight.tsx:53` (`useHighlight must be used within a HighlightProvider`).
- The `getStrictContext<T>(name)` factory in `lib/get-strict-context.tsx` is the canonical "throw if used outside Provider" pattern — copy this when building new context-bound hooks.

**State stores and undo (`lib/state/mutations.ts`):**
- A module-level `STACK: MutationContext[]` (max depth 50) holds the undo queue. `apply(ctx)` pushes; `undoLast()` pops and runs `ctx.undo()` inside a `try/finally` that always clears the pending state.
- `retryLast()` catches errors from `ctx.retry()` and re-sets `pending` + records a `LastError` snapshot that subscribers can render as a toast.
- Errors propagate to UI through two channels: a `setLastError(err)` function that fans out to subscribed listeners (`errorListeners`), and a custom DOM event `jira:toast` dispatched on `window`. The toast host (`components/shell/toast.tsx`) binds via `bindToastHost(fn)`.
- The `getStrictContext` factory at `lib/get-strict-context.tsx` is the project's context-with-throw pattern (see above).

**Console as the only logger:** `lib/observability/index.ts` exposes `trackEvent` and `captureError` that currently `console.log`/`console.error` with a `[observability]` prefix. The `lib/email/transport.ts:18-28` `ConsoleTransport` (dev fallback when `RESEND_API_KEY` is absent) prints `[EMAIL] TO/SUBJECT/TEXT…` banners.

**Validation:** `lib/auth/password-policy.ts:11-18` uses early-return pure functions that return `string | null` (the error message, or `null` if valid). The Phase 3 stream 3G will swap this for a HaveIBeenPwned k-anonymity check.

---

## Logging

**Framework:** plain `console.*` calls, gated by `[<namespace>]` log prefixes. The full list of `console.*` usages in source (16 occurrences):
- `lib/observability/index.ts:6, 13, 19, 23` — `[observability]` prefix
- `lib/email/transport.ts:21-25` — `[EMAIL]` prefix (5 lines per send)
- `app/api/auth/[...all]/route.ts:15, 27, 37` — `[auth]` prefix
- `components/auth/sign-in-form.tsx:24, 31` — `[sign-in]` prefix
- `components/auth/sign-up-form.tsx:25, 32` — `[sign-up]` prefix

**Patterns:**
- Dev fallback to console: `lib/email/transport.ts:18-28` implements `ConsoleTransport` so emails render to stdout in the absence of `RESEND_API_KEY`.
- No `pino` / `winston` / `Axiom` SDK is wired; `lib/observability/index.ts` is a no-op stub.
- **Recommendation:** when adding a log, prefix with the file's module name in brackets (e.g., `[mutations]`, `[inbox]`). Do not log user PII, session tokens, or full email payloads in production builds.

---

## Function Design

**Component pattern (`components/primitives/button.tsx:51-67`):**
```ts
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", children, ...props }, ref) => {
    return (
      <motion.button ref={ref} type={type} whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >{children}</motion.button>
    );
  },
);
Button.displayName = "Button";
```
- `forwardRef` is used for primitives that wrap an intrinsic element so consumers can pass refs through.
- `displayName` is set explicitly (only `Button` does this in the current code; `Avatar`/`AvatarGroup`/`Kbd` rely on the inferred name from the `export function`).
- `cva` (class-variance-authority) variants are exported alongside the component as `buttonVariants` so consumers can extend the class set.

**Props typing:**
- Inline `type X = { ... }` is preferred for component prop types (`components/primitives/avatar.tsx:40-46`, `components/sell/command-palette.tsx:266-276`, `components/primitives/kbd.tsx:4-6`).
- Compound variants on `cva` use a single string union or boolean (no nested unions in observed source).
- Functions that return JSX use `React.ReactNode` for slot props (`{ children: React.ReactNode }`).
- Event callbacks use `(e: React.MouseEvent | React.FormEvent | React.KeyboardEvent)` and check `e.currentTarget` / `e.target` directly.

**Parameter style:**
- Destructured parameters are the rule for components: `function Avatar({ name, size = "md", className, ring, status }: AvatarProps)`.
- Default parameter values use `=` with no spaces around: `size = 8`, `size = "md"`, `type = "button"`, `className, ...props`.
- Rest spread is the last parameter: `({ className, ...props }, ref)`.
- `noUncheckedIndexedAccess` is **not** set in tsconfig — array access returns `T` not `T | undefined`, so `const target = STATUS_ORDER[idx]!` uses the `!` non-null assertion in `components/issue/issue-drawer.tsx:70`. New code that needs the assertion can use `!` but prefer narrowing with `if (!x) return`.

**State hook patterns:**
- zustand `create<State>()(set => ({...}))` is the universal pattern. Selectors are used at call sites: `useUI((s) => s.density)`, `useIssues((s) => s.issues.find(...))`. The `persist` middleware wraps the whole store in `lib/state/ui.ts:53-147` with `name: "jira-redesign-ui"` and a `partialize` whitelist.
- Mutations live in the store action methods; selectors are kept in store files. `useIssues.getState().setStatus(...)` is the pattern used inside event handlers and inside other stores (e.g., `apply()` in `lib/state/mutations.ts:158`).

---

## Module Design

**Exports:**
- Files export **named** functions, not default exports, for components and utilities: `export function IssueDrawer()`, `export const useUI = ...`, `export type StatusKey = ...`, `export const transport = createTransport()`.
- Page files (`app/**/page.tsx`) use **default** export for the page function and **named** export for `metadata` / `viewport` / `revalidate` / `runtime` when needed: `export const metadata: Metadata = {...}`, `export const viewport: Viewport = {...}`, `export const runtime = "nodejs"`.
- Layout files use **default** export for the layout and **named** export for `metadata`: see `app/(auth)/layout.tsx:4-8`.

**Barrel files:**
- `components/icons/index.ts` re-exports the registry — every icon component used in the app is consumed from `@/components/icons`, not from `@/components/animate-ui/icons/<name>`.
- `components/icons/index-bridge.ts` is the lower-level barrel that re-exports from each icon file.
- `lib/utils/index.ts` re-exports `cn` and the `date.ts` helpers (the file exists but the date re-exports are not yet present in source — `lib/utils/index.ts` currently only re-exports `cn`; date helpers are imported directly from `@/lib/utils/date`).

**Side-effect imports:** none observed. `import "server-only"` is **not** used in any source file, even in `lib/auth/server.ts` and `lib/auth/oauth-config.ts` where it would be appropriate. **Recommendation:** add `import "server-only"` to `lib/auth/server.ts`, `lib/auth/audit.ts`, `lib/auth/rate-limit.ts`, and `lib/email/transport.ts` to enforce the server boundary at compile time.

**File-purpose naming:**
- `kebab-case.ts` for non-component modules.
- `PascalCase` reserved for component filenames would be more conventional, but the project consistently uses `kebab-case` for components too.
- `index.ts` is reserved for barrel re-exports; pages and components use explicit filenames.

---

## Motion Conventions

The project follows the AGENTS.md rules:
- **Spring physics only.** `lib/motion/variants.ts` defines three reusable spring presets: `spring` (stiffness 380, damping 32, mass 0.8), `springSnap` (500/38/0.7), `springBounce` (260/18/0.6). Most components use these directly.
- **Durations 120 / 220 / 320 ms.** These are CSS custom properties `--duration-micro: 120ms`, `--duration-enter: 220ms`, `--duration-layout: 320ms`, `--duration-exit: 160ms` defined in `app/globals.css:136-139`.
- **`ease-spring` cubic-bezier(0.32, 0.72, 0, 1)** is defined in `app/globals.css:132` (`--ease-spring`); `--ease-spring-bounce` and `--ease-spring-snap` are also available.
- **No linear easings** — the variants file uses `easeOut` / `easeIn` strings for opacity-only fades (e.g., `fadeIn` exit) but every enter transition uses a spring. The global `@media (prefers-reduced-motion: reduce)` block in `app/globals.css:257-264` collapses all animations to `0.01ms` for accessibility.
- `motion` (not `framer-motion`) is the only animation library; `framer-motion` is **not** in `package.json`. Both `lib/motion/variants.ts:1` and `components/primitives/button.tsx:4` import from `motion/react`.

---

## Design-System Conventions (verified in source)

These were declared in `AGENTS.md` and **are present** in the codebase:

- **OKLCH color tokens** — every color in `app/globals.css:8-66` is `oklch(...)`. Tokens include `--color-bg`, `--color-surface-1..3`, `--color-overlay`, plus semantic (`--color-success`, `--color-danger`, etc.), priority (`--color-prio-*`), status (`--color-status-*`), and label (`--color-label-1..8`).
- **Five surface levels** — `bg`, `surface-1`, `surface-2`, `surface-3`, `overlay`. Implemented in `app/globals.css:10-14` and referenced throughout components as `bg-[var(--color-surface-1)]`, etc.
- **1px borders at 8% alpha** — `app/globals.css:19` defines `--color-border: oklch(1 0 0 / 0.08)`; `app/globals.css:147` sets `* { border-color: var(--color-border); }` as the universal default.
- **Dark mode default** — `app/layout.tsx:22` does not set a `class` on `<html>`; the dark tokens in `globals.css` are the only theme. The `app/globals.css` file has no `prefers-color-scheme: light` override.
- **Geist fonts (sans/mono)** — `app/layout.tsx:33-36` loads `Geist:wght@300;400;500;600;700` and `Geist+Mono:wght@400;500;600` from Google Fonts; `--font-sans` and `--font-mono` are set in `globals.css:68-69`. `Inter Display` mentioned in the spec is **not** present.
- **8pt spacing grid** — `globals.css:92-111` defines `--spacing-px: 1px` through `--spacing-20: 80px`, with half-step entries (`--spacing-0_5: 2px`, `--spacing-1_5: 6px`, etc.). All Tailwind class usage references the in-token values directly.
- **Density modes** — `globals.css:223-244` defines three CSS selectors for `[data-density="compact|default|roomy"]` with `--row-h`, `--pad-x`, `--group-h`, `--card-pad`, `--row-font` variables. The `data-density` attribute is set by `useUI.setDensity` in `lib/state/ui.ts:59-61` and rehydrated on mount via `onRehydrateStorage` at line 141-145.
- **2px focus ring (accent color, 2px offset)** — `globals.css:195-199` defines `:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; border-radius: var(--radius-sm); }` as the universal focus ring; `--color-border-focus: oklch(0.72 0.18 40)` (line 21).
- **`@animate-ui/icons` 24×24 stroke 1.5px** — partially followed. The custom icons in `components/icons/custom.tsx` use `strokeWidth={2}` and `viewBox="0 0 24 24"` (not 1.5px stroke). The animate-ui icons in `components/animate-ui/icons/*` come from the registry and follow the upstream default (also 2px stroke). The `AGENTS.md` spec says 1.5px but the actual rendered icons use 2px.
- **No emoji in UI** — followed. The only non-ASCII glyphs in the UI are: ⌘, ↵, ⇧, ⌃, ⌥, ⌫, ⌘K, ⎋, ⇪, ⌃, etc. (keyboard shortcut symbols), and `⏣` and `⊘` (`⏣` in `components/sell/top-bar.tsx:42` for the brand logo placeholder, `⊘` in `components/issue/issue-row.tsx:155` for the "blocked-by" badge). These are technically symbols (Unicode miscellaneous symbols block) rather than emoji. The avatar initials use uppercase letters.

---

## Where to Add New Code

**New feature (UI):**
- Component: `apps/web/components/<area>/<feature>-<role>.tsx` with `'use client'` only if it needs hooks/motion. Co-locate state in `lib/state/<area>.ts` if it spans routes.
- Page: `apps/web/app/(workspace)/<feature>/page.tsx` (default export). Add a `loading.tsx` or `error.tsx` only if needed.
- Hook: `apps/web/hooks/use-<name>.ts` (start with `use-` even if not technically a hook, e.g. `use-workspace.ts`). Mark `'use client'` at the top.

**New lib module:**
- `apps/web/lib/<area>/<module>.ts` for non-React utilities.
- Add a `cn` re-export to `lib/utils/index.ts` if it is a generic helper that downstream components will consume.
- If the module is server-only, add `import "server-only"` at the top and place it under `lib/auth/`, `lib/email/`, or `lib/observability/`.

**New icon:**
- Run `npx shadcn@latest add @animate-ui/icons-<name>` to install into `components/animate-ui/icons/<name>.tsx`, then re-export from `components/icons/index-bridge.ts` and `components/icons/index.ts`. Custom icons that the registry does not provide go in `components/icons/custom.tsx` and follow the same `getVariants` + `IconWrapper` API (see `components/icons/custom.tsx:22-51` for the canonical pattern).

**New state slice:**
- `apps/web/lib/state/<slice>.ts` — define the `State` type, a `create<State>()(...)` call, and the action methods. If the slice should persist, wrap the store in `persist({ name, partialize, onRehydrateStorage })` (see `lib/state/ui.ts:53-147` for the canonical pattern). Always export selectors via store methods (`getState()`) when other modules need imperative access.

**New server action / route handler:**
- `apps/web/app/api/<feature>/route.ts` for a REST handler. Use `try/catch` and return `new Response(JSON.stringify({ error: ... }), { status: 500 })` on failure (see `app/api/auth/[...all]/route.ts:22-39` for the pattern).
- `'use client'` is **not** used in route handlers; `export const runtime = "nodejs"` is the only directive in `app/api/auth/[...all]/route.ts:2`.

**Mock data (transitional):**
- Add fixtures to `apps/web/lib/mock/<entity>.ts` and re-export from `apps/web/lib/mock/index.ts`. Phase 4 will delete the `lib/mock/` directory; do not import from `lib/mock/` outside of `app/`, `components/`, and `lib/state/` (i.e., never from a server action or `utils/`).
