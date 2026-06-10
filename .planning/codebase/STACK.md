# Technology Stack

**Analysis Date:** 2026-06-09

## Package Manager & Monorepo

**Package Manager:** npm (Node.js 22)
- Lockfile: `package-lock.json` (present at root and `apps/web/`)
- Workspace config in root `package.json`: `"workspaces": ["apps/*"]`
- Monorepo with one app workspace: `apps/web/`

**Root `package.json`** (`.\package.json`): Orchestrates all workflows. Scripts delegate to `apps/web` via `npm --prefix apps/web run <script>`. Supabase CLI commands (`db:*`, `auth:*`) and test runners defined here.

**App `package.json`** (`apps\web\package.json`): Contains the Next.js app and all its dependencies.

## Framework & Runtime

**Framework:** Next.js 16.2.7 — App Router, RSC, Server Actions, Turbopack
**React:** 19.2.0, `react-dom` 19.2.0
**TypeScript:** 5.7.2 (strict mode, `tsconfig.json` at `apps\web\tsconfig.json`)
**Runtime:** Node.js 22 (production in CI, `github/workflows/ci.yml`), `runtime: 'nodejs'` set on route handlers
**ES Target:** ES2022, module resolution: `bundler`

## Styling

**CSS Framework:** Tailwind CSS v4.3.0
- Plugin: `@tailwindcss/postcss` 4.3.0 (PostCSS-based config, `apps\web\postcss.config.mjs`)
- Global CSS: `apps\web\app\globals.css`

**Design System:**
- OKLCH color tokens; dark mode default, light mode alternative
- Fonts: `Geist` (sans), `Geist Mono` (code), loaded from Google Fonts (`apps\web\app\layout.tsx`)
- 8pt base grid; density modes: Compact (28px), Default (36px), Roomy (48px)
- 5 surface levels: `bg`, `surface-1`, `surface-2`, `surface-3`, `overlay`
- Motion: `motion` 12.40.0 (no framer-motion); spring physics only; durations 120/220/320ms
- Icons: `@animate-ui/icons` (24×24, stroke 1.5px) + `lucide`; no emoji in UI

**Component Primitives:** Radix UI (16 packages at pinned versions in `apps\web\package.json`):
- `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-popover`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `@radix-ui/react-visually-hidden`

**Utilities:**
- `clsx` 2.1.1 + `tailwind-merge` 2.5.5 → `cn()` helper (`apps\web\lib\utils\cn.ts`)
- `class-variance-authority` 0.7.1 for component variants
- `components.json` (`apps\web\components.json`): shadcn/ui-compatible config, `radix-nova` style

**Component Library Registries:**
- `@animate-ui`: `https://animate-ui.com/r/{name}.json`

## Database & ORM

**Database:** PostgreSQL 15 via Supabase (managed)
- Local dev: Supabase CLI with 3 connection modes:
  - Transaction-mode pooler port 6543 (`DATABASE_URL`) — app queries
  - Direct connection port 5432 (`DIRECT_URL`) — migrations only
  - Session-mode port 5432 (`DATABASE_URL_SESSION`) — Better Auth

**ORM:** Drizzle ORM
- `drizzle-orm` ^1.0.0-rc.4-5d5b77c (in `apps/web/`), ^0.45.0 (root hoisted)
- `drizzle-kit` ^1.0.0-rc.3 (in `apps/web/`), ^0.31.0 (root hoisted)
- Dialect: `postgresql`
- Schema: `apps\web\lib\db\schema\index.ts` (21 schema files)
- Migrations: Hand-authored SQL in `supabase\migrations\` (25 migrations, `0000` through `0025`)
- Config: `drizzle.config.ts` (root), `schemaFilter: ['public', 'auth', 'auth_app']`
- Prepare mode: `false` (no server-side prepared statements)
- Query logging: Custom `drizzleLogger` → Sentry breadcrumbs + console debug (`apps\web\lib\observability\drizzle-logger.ts`)
- Driver: `pg` 8.x (`pg.Pool`) — node-postgres (NOT `postgres.js`)
- Statement timeout: 5s, query timeout: 5s, max pool size: 10

**Extras:**
- `pgvector` extension enabled (migration `0014`) — issue embeddings for Phase 6
- `pg_cron` extension enabled (migration `0016`) — 4 scheduled jobs
- `tsvector` full-text search index (migration `0009`)
- Row Level Security on every table (migrations `0001`–`0003`, `0021`)

## Authentication

**Library:** Better Auth 1.6.14 (`apps\web\lib\auth\server.ts`)
- Server-side init: `betterAuth()` with `pg.Pool` to `DATABASE_URL_SESSION`
- Client-side: `createAuthClient` from `better-auth/react` (`apps\web\lib\auth\client.ts`)
- Route handler: `apps\web\app\api\auth\[...all]\route.ts` → `toNextJsHandler(auth)`

**Plugins used (server):**
- `nextCookies()` — cookie management for Next.js
- `organization()` — multi-workspace (renamed: organizations→workspaces, members→memberships, invitations→invitations, teams→teams)
- `admin()` — admin role management
- `jwt()` — JWT issuance
- `magicLink()` — magic link auth (expires 900s)
- `genericOAuth()` — Google and GitHub providers
- `twoFactor()` — TOTP 6-digit, 30s period, 10-char backup codes

**Plugins used (client):**
- `magicLinkClient()`, `twoFactorClient()`, `organizationClient()`, `genericOAuthClient()`

**Security features:**
- Session: 7-day expiry, 24h update age, 1h fresh age, cookie cache 5min
- Password: min 12 chars, HIBP breach check on signup (`apps\web\lib\auth\breach-check.ts`)
- Rate limiting: Database-stored, custom rules per endpoint (`apps\web\lib\auth\server.ts`)
- Session binding: New device detection + email notification (`apps\web\lib\auth\session-binding.ts`)
- Account linking/unlinking (`apps\web\lib\auth\account-linking.ts`)
- Audit logging: Auth events emitted to audit trail (`apps\web\lib\auth\audit.ts`)
- CSRF: trusted origins + cookie-based
- Email verification: Required (dev skip via `DEV_SKIP_EMAIL_VERIFICATION`)

**Auth config file:** `apps\web\lib\auth\cli-config.ts` (for Better Auth CLI schema generation)

## Realtime

**Provider:** Supabase Realtime
- Publication: `supabase_realtime` with 6 tables subscribed (`supabase\migrations\0012_realtime_publication.sql`):
  - `issues`, `comments`, `notifications`, `saved_views`, `memberships`, `project_members`
- Replica identity: `FULL` on realtime tables (migration `0013`)
- RLS enforced during subscription — user JWT scopes access
- Client-side: `@supabase/supabase-js` 2.x via `createBrowserClient` from `@supabase/ssr`
- Server-side: `@supabase/ssr` `createServerClient` with cookie handling
- Storage client in `apps\web\lib\supabase\storage.ts`

## Storage

**Provider:** Supabase Storage (S3-compatible)
- Buckets: `avatars` (2MB max), `attachments` (50MB max), `exports` (100MB max)
- RLS policies on storage buckets (`supabase\migrations\0011_storage_rls.sql`)
- Access: Signed URLs (1h default TTL) via `apps\web\lib\supabase\storage.ts`
- Operations: `signedUrl()`, `uploadFile()`, `deleteFile()` — server-side only

## Email

**Provider:** Resend (production) + ConsoleTransport (development)
- Transport abstraction: `apps\web\lib\email\transport.ts`
  - `ResendTransport` — uses `fetch()` to `https://api.resend.com/emails` with Bearer auth
  - `ConsoleTransport` — logs rendered emails to stdout with boxed output
- Template rendering: `apps\web\lib\email\render.ts` (React Email-compatible)
- Auth emails: `sendEmail()` in `apps\web\lib\auth\email.ts`
- Config: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_WEBHOOK_SECRET`
- Webhook: `apps\web\app\api\email\webhook\route.ts` — receives Resend webhooks (bounce/complaint), HMAC-SHA256 validated

## Observability

**Error Tracking:** Sentry (`@sentry/nextjs` ^10.57.0)
- Init: `apps\web\lib\observability\sentry.ts` — lazy init on first `SENTRY_DSN`
- Next.js integration: `next.config.ts` wrapped with `withSentryConfig()`
- Traces sample rate: 10% prod, 100% dev
- Drizzle breadcrumbs: `drizzleLogger` sends query breadcrumbs + slow-query warnings (>100ms)
- Redaction: Sensitive query params (password, token, secret, etc.) redacted before logging (`apps\web\lib\observability\redact.ts`)

**Product Analytics:** PostHog
- Server: `posthog-node` ^5.36.7 (`apps\web\lib\observability\posthog.ts`)
- Browser: `posthog-js` ^1.383.2 (installed, used on client side)
- Init: Lazy on first `POSTHOG_API_KEY`
- Events: `trackEvent()` with distinctId and properties

**Logging:** Pino ^10.3.1
- Server logger: `apps\web\lib\observability\logger.ts`
  - Name: `rejira-web`, level: `LOG_LEVEL` env (default `info`)
  - Dev: `pino-pretty` transport with colorize
  - Prod: Structured JSON output
- Request context: `withRequestContext()` creates child loggers with `requestId`, `userId`, `workspaceId`

**Auth Events:** Dedicated auth event tracking (`apps\web\lib\observability\auth-events.ts`)

## Cron/Scheduled Jobs

**Provider:** `pg_cron` (Supabase Postgres extension, migration `0016`)
- 4 scheduled jobs (`supabase\migrations\0017_cron_jobs.sql`):
  - `gdpr-hard-delete` — daily at 03:00 UTC (Phase 4 body)
  - `embedding-refresh` — every 6 hours (Phase 6 body)
  - `orphan-attachment-cleanup` — Sundays at 04:00 UTC (Phase 7 body)
  - `issues-vacuum` — daily at 02:00 UTC (VACUUM ANALYZE issues)
- All job bodies use `SECURITY DEFINER` functions; stubs in Phase 2, implementations in Phase 4/6/7
- Additional cron function for nightly session cleanup (`supabase\migrations\0019_session_cleanup.sql`) and hard delete (`supabase\migrations\0018_hard_delete_cron.sql`)

## Testing

**Unit/Integration Tests:** Vitest 4.1.8
- Config: `apps\web\vitest.config.ts`
- Environment: `node`
- Glob patterns: `**/_tests/*.test.ts`
- Coverage: v8 provider, thresholds: lines 80%, functions 80%, branches 70%, statements 80%
- Test files in: `apps\web\lib\auth\_tests\`, `apps\web\lib\db\_tests\`
- Commands: `npm test`, `npm run test:watch`, `npm run test:coverage`

**E2E Tests:** Playwright 1.60.0
- Config: `playwright.config.ts` (root)
- Test dir: `e2e/`
- Browsers: Chromium, Firefox, WebKit
- Reports: HTML + list
- Accessibility: `@axe-core/playwright` ^4.11.3 (`npm run test:a11y`)
- Web server: Auto-starts `npm --prefix apps/web run dev`

**Database Tests (RLS):** pgTAP
- Test files: `supabase\tests\04-rls-cross-tenant.test.sql`, `supabase\tests\04-rls-mutations.test.sql`
- Run via: `supabase db test`
- CI: Runs pgTAP RLS suite after local Supabase start

**CI Coverage Enforcement:** Codecov (`codecov.yml`)
- Target: 80% project, 80% patch, 2% threshold

## CI/CD & Hosting

**CI:** GitHub Actions (`github\workflows\ci.yml`)
- Trigger: push/PR to `main`
- Concurrency: cancel-in-progress per branch
- Steps: Typecheck → Lint → Supabase local start + migrations + pgTAP + Vitest → Build
- Node: 22
- Supabase CLI: `supabase/setup-cli@v1`
- DB drift detection: `supabase db diff` fails CI if drift detected
- No-guard check: `apps\web\scripts\check-rbac.sh` — ensures no `requireRole` helpers exist

**Hosting:** Vercel (`vercel.json`)
- Framework: `nextjs`
- Build command: `npm --prefix apps/web run build`
- Output: `apps\web\.next`
- Install: `npm install`

**Dependabot:** Weekly npm updates (`github\dependabot.yml`), max 5 open PRs

## Notable Dependencies

**Drag & Drop:** `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2
**Floating UI:** `@floating-ui/react` 0.27.19 (popovers, tooltips, dropdowns)
**Command Palette:** `cmdk` 1.0.4 (⌘K)
**Animations:** `motion` 12.40.0 (successor to framer-motion)
**Data Fetching:** `@tanstack/react-query` 5.62.7 (client-side cache)
**Virtualization:** `@tanstack/react-virtual` 3.13.6 (virtual lists)
**State Management:** `zustand` 5.0.3 (global state stores at `apps\web\lib\state\`)
**URL State:** `nuqs` 2.4.3 (type-safe URL search params)
**Validation:** `zod` 3.25.0 (server action inputs, route handler bodies)
**Date Utilities:** `date-fns` 4.1.0
**Toast:** `sonner` 1.7.1
**Rate Limiting:** `@upstash/redis` 1.38.0 (Redis-backed, with in-memory fallback in `apps\web\lib\auth\rate-limit.ts`)
**i18n:** 6 supported locales (en, es, fr, de, ja, zh) — dictionaries in `apps\web\lib\i18n\dictionaries\`

**Not used (explicitly excluded):** Convex, Firebase, Prisma, tRPC, TanStack Query (server-side — used only for client cache), Drizzle Studio, Socket.io, Auth.js/NextAuth, Supabase Auth, framer-motion, Lucide

---

*Stack analysis: 2026-06-09*
