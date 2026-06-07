# Testing Patterns

**Analysis Date:** 2026-06-07

## TL;DR

**There are no tests in this repo.** No `*.test.*`, no `*.spec.*`, no `__tests__/` directories, no fixtures, no mocks for tests, no coverage tooling. The framework, runner, and assertion library are installed and wired into root `package.json` scripts, but the codebase is not exercising them yet. The repo is at the end of Phase 1 (Interactions) and about to enter Phase 2 (Data layer); testing is planned for later phases.

**Confirmed absences (zero matches across the entire repo, including `node_modules` excluded):**
- `apps/web/**/*.test.{ts,tsx}` — 0 files
- `apps/web/**/*.spec.{ts,tsx}` — 0 files
- `apps/web/**/__tests__/**` — 0 files
- `apps/web/**/vitest.config.*` — 0 files
- `apps/web/**/playwright.config.*` — 0 files
- `apps/web/vitest.config.ts` / `vitest.config.mjs` — 0 files
- `apps/web/playwright.config.ts` — 0 files
- `apps/web/jest.config.*` — 0 files
- `apps/web/.vitest/` / `apps/web/test-results/` — 0 directories
- No `vitest` import anywhere in `apps/web/**/*.{ts,tsx}`
- No `@playwright/test` import anywhere in `apps/web/**/*.{ts,tsx}`

**Confirmed presences:**
- `vitest@^4.1.8` is in `package.json:48` (root `devDependencies`).
- `@playwright/test@^1.60.0` is in `package.json:42` (root `devDependencies`).
- `tsx@^4.19.0` is in `package.json:46` (root `devDependencies`) — used to run the `db:seed` script.
- Root `package.json:20-22` declares `"test": "vitest run"` and `"test:e2e": "playwright test"`.
- Root `package.json:6-23` scripts include `test` and `test:e2e`; both will fail at runtime today because no config file exists and no spec files exist.

The `apps/web/package.json` (workspace) does **not** declare its own `test` or `test:e2e` script — testing is centralized at the root.

---

## Test Framework

**Runner (planned / partially installed):**
- **Vitest 4.1.x** for unit and integration tests. Config file: **not present** — will need to be added at `apps/web/vitest.config.ts` (recommended location, since `apps/web` is the only workspace with source code).
- **Playwright 1.60.x** for E2E tests. Config file: **not present** — will need to be added at `apps/web/playwright.config.ts` or root `playwright.config.ts`.

**Assertion library:** Vitest ships its own `expect` API. No separate assertion library (chai / jest-circus) is installed.

**Run commands (from root, when configured):**
```bash
npm test            # vitest run — all unit tests
npm run test:e2e    # playwright test — all E2E tests
```

**Planned pgTAP for RLS tests:** AGENTS.md and `PHASE_2_PLAN.md` plan to use pgTAP for database-level RLS enforcement tests. pgTAP is a Postgres extension and runs via `pg_prove` (Perl) — there is no Node runner for it; the test driver will be invoked from `supabase db test` or a `pg_prove` shell command, not Vitest. **Status: planned for Phase 2H / Phase 4H; nothing installed yet.**

**Coverage:** not enforced. No `c8` / `istanbul` / `vitest --coverage` configuration exists. `@vitest/coverage-v8` is **not** installed.

---

## Test File Organization

**Current state:** none.

**Recommended pattern (when tests are added):** co-locate tests next to the source module they exercise. The AGENTS.md / PLAN.md stack table says "Vitest (unit) + Playwright (E2E) + pgTAP (DB RLS)" — that implies unit/E2E/DB tiers with no shared `tests/` directory.

**Naming convention to follow when adding tests:**
- Unit: `<module>.test.ts` co-located — e.g., `lib/utils/date.test.ts` next to `lib/utils/date.ts`.
- Hooks: `hooks/use-<name>.test.ts` co-located next to `hooks/use-<name>.ts`.
- React component: `components/<area>/<component>.test.tsx` co-located. Use Vitest's `jsdom` environment + `@testing-library/react` (the latter is **not** installed — add it when introducing component tests).
- E2E (Playwright): `e2e/<feature>.spec.ts` under a new top-level `e2e/` directory. `playwright.config.ts` will need `testDir: "e2e"`.
- RLS (pgTAP): `supabase/tests/<table>.sql` per the Supabase test layout. The convention is `select * from has_table('public'::name, 'issues'::name);` style.

**Pattern for new tests:** there is no test scaffolding to copy from. New tests should:
- Use `import { describe, it, expect, vi, beforeEach } from "vitest"` for unit/integration.
- Use `import { test, expect } from "@playwright/test"` for E2E.
- Avoid touching the network or env vars; the codebase already uses `console.log` for email transport (`lib/email/transport.ts:18-28`) when `RESEND_API_KEY` is unset, so tests can run with no `.env.local` once the in-memory rate limit, console transport, and mock-only auth shim are in place.

---

## Test Structure

**Suite organization:** none observed.

**Recommended patterns (when introducing tests):**
- One `describe("<module>")` per source file. Sub-`describe` per exported function.
- Use `it("does X when Y")` rather than `it("should X")` (the codebase does not have a stated preference yet).
- Use `beforeEach` for store reset — `useIssues` and `useUI` are zustand stores that carry state across tests. The `lib/state/issues.ts:324` `reset: () => set({ issues: INITIAL_ISSUES })` action exists for exactly this case. For `useUI`, no reset is exported — Phase 2 will need to add one.

**Setup / teardown:**
- For zustand stores: call the store's `getState().reset()` (or a new `reset()` action) in `beforeEach`.
- For React components with `motion`: prefer testing the props/outcome rather than the animation. Render with `render(<Component />)` from `@testing-library/react`, then assert on DOM.
- For modules that depend on `Date.now()` or `requestAnimationFrame` (e.g., `lib/state/mutations.ts:155-176`), use Vitest's fake timers: `vi.useFakeTimers()` / `vi.advanceTimersByTime(...)`.

**Assertion pattern:** `expect(...)` with Vitest matchers. The codebase does not yet use any matchers, but a sensible default for the current code is `.toBe`, `.toEqual`, `.toHaveLength`, `.toThrow`.

---

## Mocking

**Framework:** none installed. Vitest's built-in `vi` (mock, spy, fn) ships with the framework; no `msw`, `nock`, or `@testing-library/jest-dom` is present.

**Patterns to apply when writing tests:**

**Module-level mocks (Vitest):**
```ts
import { vi } from "vitest";
vi.mock("@/lib/auth/client", () => ({
  signIn: { email: vi.fn() },
  useSession: () => ({ data: null }),
}));
```

**Fetch mocks for the email transport and Better Auth routes:**
- `lib/email/transport.ts:39-58` uses `fetch("https://api.resend.com/emails", ...)`. Mock with `vi.stubGlobal("fetch", vi.fn())` or `vi.spyOn(globalThis, "fetch")`.
- `app/api/auth/[...all]/route.ts` calls `getAuthInstance()` which throws on import (`lib/auth/server.ts:16-21`). Tests for auth code must stub this with `vi.mock("@/lib/auth/server", () => ({ getAuthInstance: vi.fn() }))`.

**Supabase mocks:**
- `apps/web/utils/supabase/{client,server,middleware}.ts` read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` non-null-asserted. Tests for code that uses these should set the env vars in `beforeAll` or stub the `@supabase/ssr` module.
- `vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }))` is the simplest path.

**State store mocking:**
- For components that call `useUI` / `useIssues` / `useCurrentUser` / `useWorkspace`, the most ergonomic approach is to use the actual store and `beforeEach` reset. The stores are pure zustand, no React Query, no TanStack Query (despite `@tanstack/react-query@5.62.7` being in `apps/web/package.json:36` — it is **not** yet used in source).
- For server components in tests, use `renderToString` from `react-dom/server` (the codebase is on React 19, which supports it without a separate import).

**What to mock / what NOT to mock (recommended for this codebase):**
- **Mock:** `fetch`, `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`, `redirect`), `better-auth` modules, `@/lib/auth/client`, `@/utils/supabase/*`, `Date.now`, `requestAnimationFrame` (when testing the `apply()` pending-pulse logic).
- **Do not mock:** zustand stores, the `cn` utility, `date-fns`, the design-token CSS variables (test components with a real DOM — the tokens are referenced via `var(--color-*)` and jsdom is fine), `motion` (let it run; the animations are cheap).
- **Do not mock `lib/mock/`** — the mock data is the explicit data source for the current phase, and tests should be free to read it. Future tests written after Phase 4 will replace it with Drizzle fixtures.

---

## Fixtures and Factories

**Current state:** none.

**Where fixtures should live (recommended for this codebase):**
- Shared mock data: `apps/web/lib/mock/` is **not** a tests-only fixture directory — it is the running app's data source for the current phase. Tests should not import it as a "fixture". When the codebase has real data, fixtures belong in `apps/web/test/fixtures/` (root of the workspace) with one file per entity, mirroring the future Drizzle schema.
- For React component tests, prefer lightweight in-test factory functions: `const makeIssue = (overrides: Partial<Issue>): Issue => ({ id: "...", title: "...", ...overrides });` placed in the test file itself. Lift into a shared `apps/web/test/factories/` only when the same factory is used by 3+ tests.
- For E2E: Playwright's `playwright/.auth/` directory is the canonical location for authenticated state. The default config would create `playwright/.auth/user.json` after `playwright/tests/auth.setup.ts` runs.

**Pattern for the existing mock data when tests do appear:** `lib/mock/issues.ts`, `lib/mock/projects.ts`, `lib/mock/users.ts`, `lib/mock/inbox.ts` are the seed data; tests can `import { ISSUES, USERS, PROJECTS, INBOX } from "@/lib/mock"` directly. Once the Drizzle migration lands in Phase 2, the mock data will be deleted and these imports will become invalid.

---

## Coverage

**Requirements:** none enforced. The repo has no `coverage` field in any `package.json`, no `c8` / `nyc` / `@vitest/coverage-v8` package, and no Vitest `coverage` configuration. `npm test` runs `vitest run` (no `--coverage`).

**Future plan:** when Phase 2/3 work begins, add `@vitest/coverage-v8` and set a per-phase target. Given the AGENTS.md stack plan, reasonable starting targets for the first coverage phase would be:
- `lib/state/mutations.ts`, `lib/state/issues.ts`, `lib/state/ui.ts`, `lib/utils/date.ts`, `lib/auth/password-policy.ts`, `lib/auth/rate-limit.ts` — pure functions, easy targets for ≥80% line coverage.
- `lib/auth/email.ts`, `lib/auth/two-factor.ts`, `lib/auth/audit.ts` — wrapper functions; cover the happy path and the `getAuthInstance()` throw case.
- `lib/auth/server.ts` — currently throws on `getAuthInstance()`; cover the throw path with a single test.

**View coverage (planned command, not yet active):**
```bash
npm test -- --coverage
# or with the binary directly:
npx vitest run --coverage
```

---

## Test Types

**Unit tests:** **not yet used.** When added, target the pure-function modules first:
- `lib/utils/date.ts` — `relativeTime`, `shortDate`, `dateWithYear`, `timeOnly`, `dueLabel`, `dueIsOverdue`. All have no React or side effects; cover with snapshots of formatted output.
- `lib/auth/password-policy.ts` — `validatePassword` (return-value branches: too short, no letters, no digits, common password, valid). `checkBreach` is a stub returning `false`.
- `lib/auth/rate-limit.ts` — `checkRateLimit` sliding window. Cover the first call (allowed, remaining = max-1), the n-th call (allowed, remaining = 0), the n+1-th call (denied), and the post-window reset.
- `lib/auth/audit.ts` — `emitAudit` populates the `AuditEvent` shape and fans out to registered handlers. `onAuditEvent` accumulates handlers. Cover with a fresh handler in each test.
- `lib/auth/account-linking.ts` — `isProviderTrusted("google")` → `true`, `isProviderTrusted("password")` → `false`, `accountLinkingConfig` is `enabled: true` and `allowUnlinking: true`.
- `lib/i18n/dict.ts` — `t("auth.signIn", "en")` returns the English string; `t("auth.unknown", "en")` returns the key; `t("auth.signIn", "es")` falls back to English.
- `lib/auth/oauth-config.ts` — `isOAuthConfigured` is environment-driven; cover with `vi.stubEnv` to set/clear the relevant env vars.

**Integration tests:** **not yet used.** When added, target:
- The mutations pipeline: `lib/state/mutations.ts` + `lib/state/issues.ts` + `lib/state/ui.ts`. The pipeline is synchronous today, but tests can call `apply(...)` and assert the undo stack (`undoStack()`) contains the context, then call `undoLast()` and assert the state is reverted.
- The keyboard handler: `lib/state/keyboard.ts` + `components/shell/global-shortcuts.tsx`. Render with `@testing-library/react`, dispatch a `keydown` on `window`, assert the store updates.
- The email transport: `lib/email/transport.ts`. Stub `globalThis.fetch` and assert the request body matches `EmailPayload`. Cover `ConsoleTransport` by spying on `console.log`.

**E2E tests (Playwright):** **not yet used.** When added, the natural first E2E flows are:
- Sign-up → onboarding → first workspace → first issue created via the command palette.
- ⌘K → search for an issue → open the issue drawer → ⌘1–5 to change status → undo via `Z`.
- Sign-in with email + password (mock the Better Auth HTTP response via Playwright's `page.route`).

**DB tests (pgTAP):** **not yet used.** When added in Phase 2H, the natural first tests are:
- `workspaces` table has RLS enabled and only returns rows the session user is a member of.
- `issues` table RLS denies a user from another workspace.
- `members` table RLS hides rows for non-admins.
- The `pg_cron` schedule includes a nightly cleanup job.

---

## Common Patterns

**Async testing (recommended for the codebase, since `apply()` is sync but most auth/server modules are async):**
```ts
import { describe, it, expect, vi } from "vitest";

describe("validatePassword", () => {
  it("returns null for a valid password", () => {
    expect(validatePassword("Sup3rSecret!")).toBeNull();
  });
  it("rejects a password shorter than 12 characters", () => {
    expect(validatePassword("Short1!")).toMatch(/at least 12/);
  });
});
```

**Error testing (recommended):**
```ts
import { getAuthInstance } from "@/lib/auth/server";

it("throws when getAuthInstance is called before Phase 3 init", () => {
  expect(() => getAuthInstance()).toThrowError(/PHASE_3 init/);
});
```

**Module-mock pattern (recommended for auth/server modules that throw on import):**
```ts
vi.mock("@/lib/auth/server", () => ({
  getAuthInstance: vi.fn().mockReturnValue({ handler: vi.fn() }),
}));
```

**Store reset pattern (recommended, mirroring the `useIssues` `reset()` action):**
```ts
import { useIssues } from "@/lib/state/issues";

beforeEach(() => {
  useIssues.getState().reset();
});
```

**Density / theme testing (recommended for components that read CSS variables):** the `data-density` attribute is set on `document.documentElement` by `useUI.setDensity` (`lib/state/ui.ts:59-61`). Tests can drive it via `document.documentElement.setAttribute("data-density", "compact")` directly, without going through the store, when the test is purely about layout.

---

## Notes & Caveats

- **Vitest 4.1.x is installed but never executed.** `npm test` will currently fail with "No test files found" or similar. The first person to add tests will need to write `apps/web/vitest.config.ts` (or root-level `vitest.config.ts`) and pick a test file pattern. The default Vitest patterns are `**/*.{test,spec}.?(c|m)[jt]s?(x)` which already match this repo's naming intent.
- **Playwright 1.60.x is installed but no browsers are installed.** `npx playwright install` will need to run before `npm run test:e2e` works. There is no `playwright install` script in `package.json`.
- **No CI workflow** — there is no `.github/workflows/` directory. CI is not yet wired.
- **No pre-commit hook** — there is no `.husky/` directory. `package.json` does not declare a `prepare` script.
- **The existing `eslint-disable` comments in `components/animate-ui/icons/icon.tsx` and `components/animate-ui/primitives/animate/slot.tsx`** are upstream code from the animate-ui registry and should be left alone; they are not test code.
- **The codebase is intentionally test-light at this phase** — the AGENTS.md "Current focus" line says "Phase 2 — Data layer (Supabase Postgres + Drizzle)" and the project will land real data in `lib/db/` only after Phase 2 finishes. Many modules throw on import today (`lib/auth/server.ts:16-21`, `lib/auth/account-deletion.ts:13-21`) because their Phase 3 implementation is not yet written. Tests for those modules should target the throw branches; integration tests will become meaningful only after the implementations land.
