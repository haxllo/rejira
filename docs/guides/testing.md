<!-- generated-by: gsd-doc-writer -->

# Testing

## Test Framework and Setup

The project uses **Vitest** for unit and integration tests and **Playwright** for end-to-end and accessibility tests.

- **Vitest** configuration: `apps/web/vitest.config.ts`
- **Playwright** configuration: `playwright.config.ts` (project root)
- Both are installed as devDependencies

## Running Tests

| Command | Description |
|---------|-------------|
| `npm run db:test` | Vitest: RLS + Drizzle + auth tests (filtered to `auth|db`) |
| `npm run test` | Full Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run test:e2e` | Full Playwright E2E suite |
| `npm run test:a11y` | Playwright accessibility tests (axe-core) |

### Test-specific commands (from `apps/web/package.json`)

| Command | Description |
|---------|-------------|
| `npm run db:test:load` | Vitest load tests |
| `npm run db:test:full-flow` | End-to-end flow test |
| `npm run db:test:observability` | Observability test suite |
| `npm run test:e2e:full` | Playwright full flow spec |
| `npm run test:e2e:realtime` | Playwright realtime tests |

## Writing New Tests

**Naming convention**: Test files use `.test.ts` or `.spec.ts` extensions. Vitest tests are in `apps/web/tests/`. Playwright tests are in the project root `e2e/` directory.

**Shared test helpers**:
- `apps/web/lib/db/_tests/` — database test utilities
- `apps/web/lib/auth/` — auth-related test files

**Database tests**: Use the local Supabase stack. The test suite verifies:
- RLS isolation (cross-tenant data access is denied)
- Drizzle transaction atomicity
- Better Auth authentication flows
- pgTAP SQL-level RLS tests (`supabase/migrations/`)

## Coverage Requirements

No coverage threshold is currently configured in CI. Coverage reports can be generated with `npm run test:coverage`.

## CI Integration

Tests run in CI via `.github/workflows/ci.yml`:

- **Trigger**: Push or PR to `main`
- **Job**: `typecheck + lint + db:test + build` (single job)
- **Steps**: Typecheck → Lint → Start Supabase → Apply migrations → DB lint + drift detection → Seed → Vitest (RLS + Drizzle + auth) → Build
- **Timeout**: 15 minutes
