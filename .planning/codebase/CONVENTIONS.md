# Coding Conventions

**Analysis Date:** 2026-06-09

## TypeScript Configuration

**Config file:** `apps/web/tsconfig.json`

**Key settings:**
- **Target:** ES2022
- **Strict mode:** `true` (enables all strict checks: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.)
- **Module:** `esnext` with `moduleResolution: "bundler"`
- **JSX:** `react-jsx` (automatic runtime)
- **Path alias:** `@/*` maps to `apps/web/*` (used consistently across the entire app)
- **Isolated modules:** `true` (required by swc/Turbopack)
- `allowJs: true`, `skipLibCheck: true`, `resolveJsonModule: true`
- **Next.js plugin:** `{ "name": "next" }` for type validation of app router conventions
- **Incremental builds:** `true`

**No `any` enforcement:** The project uses TypeScript strict mode. Explicit return types on exported functions are a convention (observed on `lib/server-actions.ts` actions and `lib/utils/*.ts` utilities).

## Code Style

**Formatting:** No `.prettierrc` detected. The codebase relies on ESLint defaults from `eslint-config-next` (Next.js 16 flat config). No explicit Prettier configuration exists — formatting is handled by ESLint via `eslint .`.

**Linting:**
- **Tool:** ESLint 9 (`eslint` ^9.17.0) with `eslint-config-next` ^16.2.7
- **Command:** `npm run lint` (runs `eslint .` in `apps/web`)
- No detected `.eslintrc*` or `eslint.config.*` — uses Next.js defaults

**Observed conventions in source files:**

| Rule | Convention |
|------|-----------|
| Indentation | 2 spaces |
| Quotes | **Mixed.** Double quotes (`"`) in `.tsx` components; single quotes (`'`) in `.ts` test files. No standard enforced. |
| Semicolons | Always present at statement ends |
| Trailing commas | Present in multi-line objects/arrays/imports |
| Line endings | LF (Windows repo but cross-platform) |

**Examples from source:**
```typescript
// components/primitives/button.tsx — double quotes, semicolons, trailing commas
"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

// lib/db/_tests/rls.test.ts — single quotes, semicolons, trailing commas
import { describe, it, expect, beforeAll } from 'vitest';
import { seedTwoWorkspaces, asUser } from './setup';
```

**ESLint rules observed:** No custom rule overrides detected. The project uses `eslint-config-next` defaults which include: react-hooks rules, `@next/next` rules (no `<img>`, no `target="_blank"` without `rel="noreferrer"`), and TypeScript rules from the Next.js preset.

## Component Patterns

### Server vs Client Components

**Default: Server Components.** Components are server components by default. Only add `"use client"` when using:
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser APIs (`window`, `document`, `navigator`)
- Event handlers (`onClick`, `onChange` passed to DOM elements)
- Motion/react animations (motion requires client)
- Zustand stores (state management requires client)
- Context providers

**File organization:**
```
apps/web/
├── components/
│   ├── primitives/       # Reusable base components (button, status, priority, avatar, kbd, label)
│   ├── shell/            # App shell (top-bar, primary-nav, command-palette, status-bar, toast, global-shortcuts)
│   ├── views/            # View system (view-renderer, filter-chips, filter-popover, grouped-list, cycle-board, bulk-action-bar)
│   ├── auth/             # Auth UI (sign-in-form, sign-up-form, oauth-buttons, two-factor-*, passkey-*)
│   ├── onboarding/       # Workspace setup wizard steps
│   ├── settings/         # User settings forms (profile, password, email, two-factor, sessions)
│   ├── team/             # Team management (workspace-members-table, workspace-invite-form, role-select)
│   ├── home/             # Dashboard widgets
│   ├── activity/         # Activity feed
│   ├── inbox/            # Inbox items
│   ├── workspace/        # Workspace-level (data-hydrator)
│   ├── icons/            # Custom SVG icons in animate-ui style
│   ├── animate-ui/       # Third-party animate-ui icon components
│   └── issue/            # Issue components (issue-row, issue-drawer)
```

**Component structure pattern:**
```typescript
"use client"; // Only when needed

import * as React from "react";
import { motion } from "motion/react"; // For animated components
import { cva, type VariantProps } from "class-variance-authority"; // For variants
import { cn } from "@/lib/utils"; // className merging

const buttonVariants = cva([...base classes...], {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "secondary", size: "md" },
});

type ButtonProps = HTMLMotionProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", children, ...props }, ref) => {
    // ...
  },
);
Button.displayName = "Button";
```

**Key patterns:**
- `cva` (class-variance-authority) for component variants — used in `button.tsx`, pattern shared across primitives
- `cn()` from `@/lib/utils` for className merging (clsx + tailwind-merge)
- `React.forwardRef` for components that need ref forwarding
- Explicit `displayName` for better DevTools experience
- `motion/react` (Motion 12) for animation, not `framer-motion`
- Design tokens referenced via CSS custom properties: `var(--color-text)`, `var(--color-surface-2)`, `var(--radius-md)`
- `@/*` path alias for all internal imports

**Strict context pattern (`lib/get-strict-context.tsx`):**
Creates a typed context that throws when accessed outside its Provider:
```typescript
const [Provider, useContext] = getStrictContext<MyType>("ContextName");
```

## Data Fetching Patterns

Three distinct patterns based on context:

### 1. Server Components (Direct Drizzle)
Server components call `requireAuth()` then query Drizzle directly inside `async` RSC functions. This is the primary path for the Phase 4 migration.

### 2. Server Actions (`lib/server-actions.ts`)
Client components call typed action functions that `POST` to `/api/db/{domain}`:
```typescript
// lib/server-actions.ts
export interface CreateIssuePayload {
  op: 'create';
  workspaceId: string;
  projectId: number;
  title: string;
  // ...
}
export async function createIssueAction(input: CreateIssuePayload): Promise<Issue> {
  return post<Issue>('issues', input);
}
```
Each action has:
- An interface for its payload (with `op` discriminator)
- An async function wrapping `post<T>()` or `get<T>()`
- Return type explicitly declared

### 3. Transaction Wrappers (`lib/db/transaction.ts`)
For server-side mutations requiring auth + RLS context:
```typescript
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>
export async function withWorkspaceTransaction<T>(workspaceId: string, fn: (tx: Tx) => Promise<T>): Promise<T>
```
These wrappers:
1. Call `requireAuth()` to get the user
2. Open a Drizzle transaction
3. Set `request.jwt.claims` via `set_config()` to pass user identity through RLS
4. Capture errors via Sentry
5. Map Drizzle errors through `mapDrizzleError()`

**Client data access:**
- Better Auth hooks: `useSession()` wraps Better Auth's `useSession` to normalize shape
- Zustand stores in `lib/state/` for UI state (density, selected IDs, drag state, sort/group)
- Supabase Realtime via `hooks/useRealtime*.ts` for live subscriptions
- `@tanstack/react-query` (5.62.7) available for server-state caching

**Phase 4 migration:** Server actions (`POST /api/db/:domain`) and RSC reads will replace the current `lib/mock/` data. Mock imports like:
```typescript
import { ISSUES } from "@/lib/mock";
```
...are being replaced with Drizzle queries. The `ISSUES` constant from `lib/mock/` will be deleted in Phase 4.

## Error Handling

### Server-Side Error Classes

**`DbError` (`lib/db/errors.ts`):**
```typescript
export class DbError extends Error {
  code: DbErrorCode; // 'FORBIDDEN' | 'CONFLICT' | 'FOREIGN_KEY' | 'TIMEOUT' | 'NOT_FOUND' | 'INTERNAL'
  status: number;
  cause?: unknown;
}
```
Maps PostgreSQL SQLSTATE codes to typed errors:
| SQLSTATE | Error | Status |
|----------|-------|--------|
| `42501` | FORBIDDEN | 403 |
| `23505` | CONFLICT | 409 |
| `23503` | FOREIGN_KEY | 409 |
| `57014` | TIMEOUT | 408 |
| `PGRST116` | NOT_FOUND | 404 |

**`ServerActionError` (`lib/server-actions.ts`):**
```typescript
export class ServerActionError extends Error {
  code: string;
  status: number;
  details?: unknown;
}
```

### Error Capture

- **Sentry:** `captureError()` and `captureDrizzleError()` with context (workspaceId, SQL truncated to 500 chars)
- **Sentry wrappers:** `withSentryTransaction()` for performance tracing
- **Sentry ignores:** `NEXT_REDIRECT`, `NEXT_NOT_FOUND` (Next.js internal exceptions)
- **Fallback:** If no `SENTRY_DSN`, errors are logged via `console.error` with `[observability]` prefix

### Database Hook Error Handling
In `lib/auth/server.ts`, database hooks wrap side effects in try/catch with "non-critical" comments:
```typescript
try { await emitAuditEvent({...}); }
catch { /* non-critical */ }
```

## Naming Conventions

**Files:**
- `kebab-case.ts` for utility files: `server-actions.ts`, `get-session.ts`, `require-auth.ts`, `email-url.ts`
- `PascalCase.tsx` for components: `Button`, `SignInForm`, `ViewRenderer`, `TopBar`
- `camelCase.ts` for hooks: `useSession`, `useLocale`, `useCurrentUser`
- `.test.ts` suffix for test files: `rls.test.ts`, `auth.test.ts`
- `_tests/` directories contain tests (underscore prefix keeps them grouped)
- `_tests/` `setup.ts` for shared test setup

**Directories:**
- `kebab-case` with hyphen: `animate-ui`, `server-actions`, `view-query`
- `camelCase` for feature directories: `useRealtimeIssues` (hook file)

**Functions:**
- `camelCase` for regular functions: `getSession`, `mapDrizzleError`, `createId`
- `PascalCase` for React components: `Button`, `StatusDot`, `ViewRenderer`
- `camelCase` for React hooks: `useSession`, `useLocale`, `useUI`
- Export function names are explicit and descriptive

**Variables:**
- `camelCase`: `userExternalId`, `localeCookie`, `selectedIssueIds`
- `UPPER_SNAKE_CASE` for constants: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `STATUS_META`
- `camelCase` for React refs: `localRef`, `lastGRef`, `drawerPrevFocusEl`

**Types:**
- `PascalCase` interfaces: `CreateIssuePayload`, `ViewRendererProps`, `ButtonProps`
- `PascalCase` type aliases: `StatusKey`, `PriorityKey`, `Tx`, `DB`
- Type imports use `import type` for type-only imports: `import type { Metadata, Viewport } from 'next'`

**Enums:** Drizzle enum values exported as union types: `type StatusKey = (typeof statusKeyEnum.enumValues)[number]`

## Import Conventions

**Order (observed in source files):**
1. React imports: `import * as React from "react"`
2. External framework imports: `import { motion } from "motion/react"`
3. External utility imports: `import { cva } from "class-variance-authority"`
4. Internal `@/` aliased imports (components, lib, hooks)
5. Type imports: `import type { Issue } from "@/lib/db/types"`

**Path aliases:** Only `@/*` → `apps/web/*`. No other aliases configured.

**Barrel exports (observed):**
- `lib/utils/index.ts` re-exports from `cn.ts` and `id.ts`
- `lib/auth/index.ts` re-exports from `types`, `server`, `get-session`, `require-auth`, `email`, `client`
- `lib/observability/index.ts` re-exports from `sentry`, `posthog`, `auth-events`, `logger`, `drizzle-logger`, `redact`
- `lib/db/types.ts` re-exports all schema types + union types for enums

**No circular imports:** The codebase avoids circular dependencies through barrel exports and the `@/` alias.

**`server-only` imports:** Server-side files (auth server, db client, transaction wrapper, observability) start with `import 'server-only'` to prevent accidental client import. A no-op mock `lib/_tests/__mocks__/server-only.ts` is aliased in `vitest.config.ts` for tests.

## Design System

**Token file:** `apps/web/app/globals.css` (Tailwind v4 `@theme` block)

### Colors (OKLCH — perceptual uniformity, dark-first)

**Surfaces (5 levels of depth):**
```css
--color-bg:        oklch(0.16 0.005 250);   /* Deep navy background */
--color-surface-1: oklch(0.19 0.006 250);   /* Card surface */
--color-surface-2: oklch(0.22 0.007 250);   /* Elevated */
--color-surface-3: oklch(0.26 0.008 250);   /* Overlay surface */
--color-overlay:   oklch(0.10 0.004 250 / 0.72); /* Modal backdrop */
--color-hover:     oklch(1 0 0 / 0.04);     /* Light overlay */
--color-active:    oklch(1 0 0 / 0.08);     /* Pressed state */
```

**Borders (alpha-based):**
```css
--color-border:        oklch(1 0 0 / 0.08);  /* Subtle */
--color-border-strong: oklch(1 0 0 / 0.14);  /* Prominent */
--color-border-focus:  oklch(0.72 0.18 40);   /* Focus ring (warm amber) */
```

**Text hierarchy:**
```css
--color-text:         oklch(0.98 0.002 250); /* Primary */
--color-text-muted:   oklch(0.72 0.005 250); /* Secondary */
--color-text-subtle:  oklch(0.55 0.005 250); /* Tertiary */
--color-text-faint:   oklch(0.40 0.005 250); /* Disabled */
--color-text-inverse: oklch(0.16 0.005 250); /* On accent */
```

**Brand accent (warm amber — deliberately not Jira blue):**
```css
--color-accent:       oklch(0.78 0.17 55);
--color-accent-hover: oklch(0.82 0.17 55);
--color-accent-fg:    oklch(0.16 0.005 250);
--color-accent-soft:  oklch(0.78 0.17 55 / 0.12);
```

**Semantic colors:** `--color-success` (green), `--color-warning` (yellow), `--color-danger` (red), `--color-info` (blue)

**Priority colors:** `--color-prio-urgent`, `--color-prio-high`, `--color-prio-medium`, `--color-prio-low`, `--color-prio-none`

**Workflow status colors:** `--color-status-backlog`, `--color-status-todo`, `--color-status-progress`, `--color-status-review`, `--color-status-done`, `--color-status-cancel`

**Label palette:** 8 deterministic label colors (`--color-label-1` through `--color-label-8`), assigned from name hash.

### Typography

**Fonts:**
- `Geist` (sans-serif): primary UI font (300–700 weights)
- `Geist Mono` (monospace): code, issue keys, IDs, counts
- `Inter Display`: fallback for large numerals

**Scale (in px — Tailwind v4 `@theme` tokens):**
```css
--text-2xs: 10px → 14px line-height
--text-xs:  11px → 16px
--text-sm:  12px → 18px
--text-base: 13px → 20px  (body default)
--text-md:  14px → 22px
--text-lg:  16px → 24px
--text-xl:  20px → 28px
--text-2xl: 24px → 32px
--text-3xl: 32px → 40px
```

### Spacing (8pt grid)

```css
--spacing-1: 4px; --spacing-2: 8px; --spacing-3: 12px; --spacing-4: 16px;
--spacing-5: 20px; --spacing-6: 24px; --spacing-7: 28px; --spacing-8: 32px;
--spacing-9: 36px; --spacing-10: 40px; --spacing-12: 48px; --spacing-16: 64px;
```

### Radii
```
--radius-xs: 3px; --radius-sm: 4px; --radius-md: 6px;
--radius-lg: 8px; --radius-xl: 10px; --radius-2xl: 12px; --radius-3xl: 16px;
```

### Shadows (pure black OKLCH)

```css
--shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.25);
--shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.25), 0 1px 1px 0 oklch(0 0 0 / 0.15);
--shadow-md: 0 4px 8px -2px oklch(0 0 0 / 0.4), 0 2px 4px -1px oklch(0 0 0 / 0.25);
--shadow-lg: 0 12px 24px -4px oklch(0 0 0 / 0.5), 0 4px 8px -2px oklch(0 0 0 / 0.3);
--shadow-popover: 0 8px 24px -4px oklch(0 0 0 / 0.5);
--shadow-focus: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-border-focus);
```

### Density modes

Applied via `data-density` attribute on `<html>`:
| Mode | Row height | Padding | Font size |
|------|-----------|---------|-----------|
| Compact | 28px | 12px | 12px |
| Default | 36px | 14px | 12.5px |
| Roomy | 48px | 18px | 13.5px |

## Motion & Animation

**Framework:** Motion 12 (`motion/react`) — replaces framer-motion.

**Physics:** Spring physics only. No linear easings for UI transitions.

**Token file:** `apps/web/lib/motion/variants.ts`

```typescript
// Spring presets
const spring: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };
const springSnap: Transition = { type: "spring", stiffness: 500, damping: 38, mass: 0.7 };
const springBounce: Transition = { type: "spring", stiffness: 260, damping: 18, mass: 0.6 };
```

**CSS motion tokens (`globals.css`):**
```css
--ease-spring:        cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-spring-snap:   cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-exit:          cubic-bezier(0.4, 0, 1, 1);

--duration-micro:  120ms;
--duration-enter:  220ms;
--duration-layout: 320ms;
--duration-exit:   160ms;
```

**Reusable animation variants:**
- `fadeIn`, `fadeUp`, `fadeDown`, `fadeRight` — basic transitions
- `drawerSlide` + `overlayFade` — drawer component
- `popover`, `dialogContent`, `commandPalette` — overlay components
- `listContainer` + `listItem` — staggered lists (18ms stagger, 40ms delay)
- `pressable` — tap/scale interaction (scale 0.97, y -1)
- `bounceIn` — celebratory animation
- `statusPill` — pulse animation (scale 1→1.08)

**Button tap pattern:**
```typescript
<motion.button
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
>
```

**Reduced motion:** `prefers-reduced-motion: reduce` media query sets `animation-duration` and `transition-duration` to `0.01ms !important`.

## Accessibility

### Focus Management
- **Universal focus ring** (`globals.css`):
  ```css
  :where(button, a, input, textarea, select, [tabindex]):focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  ```
- Focus rings are always visible on keyboard focus (`focus-visible`), never on mouse clicks
- `cmdk` search inputs suppress their own focus rings (implicit focus affordance)

### ARIA & Semantics
- `aria-label` on icon-only components (e.g., `StatusDot`, `PriorityIcon`)
- `role` attributes on custom interactive elements
- Semantic HTML: `<nav>`, `<button>`, `<form>`, `<input>`, `<kbd>`
- `type="button"` default on `<button>` elements to prevent accidental form submissions

### Keyboard Navigation
- **Full keyboard navigability** tested via Playwright E2E tests (`e2e/a11y/keyboard.spec.ts`)
- **Global shortcut system** (`components/shell/global-shortcuts.tsx` → `lib/state/keyboard.ts`):
  - `⌘K` / `Ctrl+K` → Command palette
  - `Esc` → Close drawer, cancel drag, close modals
  - `G` then `{key}` → Go-to navigation (Linear-style)
  - `⌘Z` → Undo
  - Number keys 1–5 → Status shortcuts (per issue row)
- **Skip logic:** Shortcuts are suppressed when focus is in `INPUT`, `TEXTAREA`, or `contentEditable` elements

### Accessibility Testing
- **axe-core** integrated via `@axe-core/playwright` (^4.11.3)
- WCAG 2.2 AA audits for sign-in, sign-up, forgot-password pages (`e2e/a11y/auth.spec.ts`)
- Keyboard navigability tests for all auth pages (`e2e/a11y/keyboard.spec.ts`)
- E2E tests run on Chromium, Firefox, and WebKit

### Other
- `suppressHydrationWarning` on `<html>` for theme/density attribute hydration
- `text-rendering: optimizeLegibility` with font feature settings `"ss01", "cv11", "cv02", "cv03", "cv04"`
- `-webkit-tap-highlight-color: transparent` for mobile
- Custom scrollbars in OKLCH tokens for dark theme consistency

## Internationalization

**Supported locales:** `en`, `es`, `fr`, `de`, `ja`, `zh` (defined in `lib/i18n/dict.ts`)

**Locale resolution priority:**
1. URL path segment (e.g., `/es/sign-in`)
2. Browser `locale` cookie
3. Browser `navigator.language`
4. Default: `en`

**Dictionary system:**
- JSON dictionaries in `lib/i18n/dictionaries/{locale}.json`
- Typed dictionary structure: `Record<string, Record<string, string>>`
- `getDict(locale)` with in-memory cache per locale
- `t(key, dict)` lookup with dot-notation: `t("sign_in.title", dict)`
- Replacement interpolation: `t("greeting", { name: "John" })` replaces `{name}`
- Client-side: `useLocale()` hook (`hooks/useLocale.ts`) with dictionary loaded via `loadLocaleDict()`

**Example dictionary structure (`en.json`):**
```json
{
  "sign_in": {
    "title": "Sign in",
    "subtitle": "to continue to rejira",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in"
  }
}
```

## Git Conventions

**Commit format:** Conventional Commits (scope-first)

From the git log (`git log --oneline -30`), the pattern is:
```
type(scope): description
```
Where:
- `type`: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `chore`
- `scope`: The phase/plan number or feature area: `04`, `04-01`, `04-02`, `04-04`, `09-dev-env-onboarding-flow`, `09-dev-env`, `phase-8`
- Description: Imperative mood, lowercase, no period

**Examples from log:**
```
feat(04): complete Wave 2 — issues/projects/cycles page migrations
docs(04): update Phase 4 state (4/8 executed)
test(04-04): add pages-aux integration tests (9 cases)
refactor(04-04): slim inbox.ts, users.ts, index.ts to type re-exports only
fix(09-dev-env-onboarding-flow): redirect new users to /onboarding after sign-up
```

**Branching:** Not evident from log (squash/merge workflow). The CI runs on push/PR to `main`.

---

*Convention analysis: 2026-06-09*
