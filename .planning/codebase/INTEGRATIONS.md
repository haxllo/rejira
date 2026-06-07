# External Integrations

**Analysis Date:** 2026-06-07

## APIs & External Services

### Authentication — Better Auth (Phase 3 — stubbed)

- **Provider:** [Better Auth](https://better-auth.com) ^1.6.14
- **Role:** Replaces Supabase Auth and NextAuth as the single auth framework
- **Server entry:** `apps/web/lib/auth/server.ts:9-23` — `betterAuth()` instance; **throws until Phase 3 init** (current state: pre-Phase 2/3)
- **Client entry:** `apps/web/lib/auth/client.ts:10-32` — `createAuthClient` with `basePath: "/api/auth"`
- **Route handler:** `apps/web/app/api/auth/[...all]/route.ts:1-40` — `toNextJsHandler` from `better-auth/next-js`; `runtime = "nodejs"`
- **Active client plugins:** `magicLinkClient`, `twoFactorClient`, `organizationClient` (`apps/web/lib/auth/client.ts:11-13`)
- **Server plugin stack (planned):** `organization`, `twoFactor`, `magicLink`, `admin` (per AGENTS.md/PLAN.md)
- **Env vars:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_API_KEY` (`.env.example:21-23`)

### OAuth Providers (planned, env-gated)

- **Google** — Client/secret read in `apps/web/lib/auth/oauth-config.ts:11-14`
  - Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`.env.example:26-27`)
  - Callback URL pattern: `{baseURL}/api/auth/callback/google`
- **GitHub** — Client/secret read in `apps/web/lib/auth/oauth-config.ts:16-19`
  - Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (`.env.example:28-29`)
  - Callback URL pattern: `{baseURL}/api/auth/callback/github`
- **Account linking:** Configured for trusted providers Google + GitHub (`apps/web/lib/auth/account-linking.ts:11-22`); `allowUnlinking: true`

### Email — Resend (planned, env-gated)

- **Provider:** [Resend](https://resend.com) ^4.0.0
- **Implementation:** Direct REST call to `https://api.resend.com/emails` (no SDK); `apps/web/lib/email/transport.ts:39-59`
- **Auth:** Bearer token from `RESEND_API_KEY`
- **Env vars:**
  - `RESEND_API_KEY` (`.env.example:32`)
  - `RESEND_FROM` (`.env.example:33`) — Default: `Rejira <noreply@rejira.app>`
  - `RESEND_WEBHOOK_SECRET` (`.env.example:34`) — For bounce/DMARC/SPF
- **Dev transport:** `ConsoleTransport` logs emails to stdout when `RESEND_API_KEY` is unset (`apps/web/lib/email/transport.ts:18-28`)
- **Templates:** Inline HTML in `apps/web/lib/email/templates/index.ts:6-51` (welcome, verify-email, magic-link, reset-password); planned migration to `@react-email/components` in 3K
- **React Email:** ^4.0.0 installed (root `package.json:35`) but no component imports yet

### Two-Factor QR Codes (third-party)

- **Provider:** [goqr.me](https://goqr.me) (api.qrserver.com) — Free public QR service
- **Use:** Renders TOTP QR code during 2FA setup
- **URL pattern:** `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={otpauth_url}` (`apps/web/components/auth/two-factor-setup.tsx:32`)
- **Note:** No API key, no rate-limit handling; runs on the client. Should be replaced with a self-hosted or paid QR service in production

### HaveIBeenPwned (planned, stub)

- **Provider:** HIBP k-anonymity API
- **Use:** Password breach check on signup/password change
- **Env:** `HIBP_API_KEY` (`.env.example:48`)
- **Status:** Stub returns `Promise.resolve(false)` (`apps/web/lib/auth/password-policy.ts:20-24`) — implementation in 3K

## Data Storage

### Database — Supabase Postgres (Phase 2 target)

- **Provider:** [Supabase](https://supabase.com) — Managed Postgres 15 with PITR, branching, read replicas
- **Role:** Single source of truth for app data + Better Auth sessions
- **Three connection strings per env** (from `.env.example:11-17`):
  - `DATABASE_URL` — Transaction-mode pooler (port 6543); used by Drizzle in the app
  - `DIRECT_URL` — Port 5432, never pooled; used by `drizzle-kit migrate` only
  - `DATABASE_URL_SESSION` — Port 5432, session-mode pooler; used by Better Auth for long-lived prepared statements
- **Connection pooling strategy:** Transaction pool for short queries, session pool for auth (Better Auth), direct for migrations
- **Drivers (both installed):**
  - `pg` ^8.21.0 — For Better Auth's `pg.Pool` to `DATABASE_URL_SESSION` (`apps/web/package.json:47`)
  - `postgres` ^3.4.5 — For Drizzle's transaction wrapper (root `package.json:34`)
- **ORM:** Drizzle ^0.36.0 + drizzle-kit ^0.28.0
- **RLS:** Planned on every table (Phase 2H); pgTAP test suite in CI
- **Migrations:** 13 hand-authored SQL migrations (planned; not yet in tree); applied via `supabase db push`. Better Auth schema generated via `npx @better-auth/cli generate`
- **Scripts available:**
  - `npm run db:generate` — Drizzle generate
  - `npm run db:migrate` — Drizzle migrate
  - `npm run db:push` — Drizzle push
  - `npm run db:studio` — Drizzle Studio (note: AGENTS.md says use Supabase Studio instead)
  - `npm run db:seed` — `tsx scripts/seed.ts` (seed script not in tree)
  - `npm run db:reset` — Drop + migrate + seed
  - `npm run auth:generate` / `auth:migrate` — Better Auth CLI
- **Local dev:** CI uses `supabase start` to run a self-contained Supabase stack (`.github/workflows/ci.yml:50-51`)

### File Storage — Supabase Storage (Phase 2 target)

- **Provider:** Supabase Storage (S3-compatible)
- **Use:** Avatars, attachments, exports
- **Status:** Buckets not yet created (Phase 2 deliverable)
- **Client:** Browser-side `@supabase/ssr` client; `process.env.NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Caching — None (Phase 3 target: Upstash Redis)

- **Provider (planned):** Upstash Redis (REST API)
- **Use:** Production rate limiting; in-memory fallback in dev (`apps/web/lib/auth/rate-limit.ts:13-40` — already implemented as in-process Map with 60s GC)
- **Env:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (`.env.example:38-39`)

## Authentication & Identity

### Primary auth

- **Provider:** Better Auth (see above) — currently a stub that throws on import
- **Browser session storage:** Cookie-based; cookie names `better-auth.session_token` and `__Secure-better-auth.session_token` (`apps/web/proxy.ts:24-25`)
- **Auth proxy:** `apps/web/proxy.ts:1-31` — checks Supabase session first, then falls back to Better Auth cookie; redirects unauthenticated users to `/sign-in?next=…`
- **Public routes (no auth):** `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/two-factor`, `/api/auth/*`, `/api/check`, `/invite*` (`apps/web/proxy.ts:6-11`)

### Two-factor auth (TOTP)

- **Library:** `better-auth/client/plugins` → `twoFactorClient` (`apps/web/lib/auth/client.ts:12`)
- **TOTP secret delivery:** QR code via api.qrserver.com (see above)
- **Backup codes:** Generated by Better Auth's twoFactor plugin; UI in `apps/web/components/auth/backup-codes-display.tsx`

### Password policy

- **Min length:** 12 chars (`apps/web/lib/auth/password-policy.ts:12`)
- **Composition:** Letters + at least one number
- **Blocklist:** 8 common passwords (`apps/web/lib/auth/password-policy.ts:6-9`)
- **Breach check:** HIBP stub (planned 3K)

### Audit logging (planned 3K)

- **Pattern:** Subscribe to events; emit to handlers (`apps/web/lib/auth/audit.ts:14-32`)
- **Targets (planned):** PostHog, Sentry
- **Events tracked:** sign-in, sign-out, password change (per module comments)

## Monitoring & Observability

### Error Tracking — Sentry (Phase 4J/3K, stubbed)

- **Status:** Stubs in `apps/web/lib/observability/index.ts:3-8` — currently console.logs; `import("@sentry/nextjs")` planned
- **Env:** `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (`.env.example:42-43`)

### Product Analytics — PostHog (Phase 4J/3K, stubbed)

- **Status:** Stubs in `apps/web/lib/observability/index.ts:10-20`; `posthog-js` and `posthog.capture` planned
- **Env:** `POSTHOG_API_KEY` (server-side), `POSTHOG_HOST` (default `https://us.i.posthog.com`), `NEXT_PUBLIC_POSTHOG_KEY` (browser-exposed; not yet documented in `.env.example` but referenced in `lib/observability/index.ts:11`)

### Logs — Axiom (planned, not yet referenced)

- Per PLAN.md stack table; no env vars documented in `.env.example`; no imports in source

## CI/CD & Deployment

### Hosting — Vercel

- **Config:** `vercel.json:1-6`
  - `buildCommand`: `npm --prefix apps/web run build`
  - `outputDirectory`: `apps/web/.next`
  - `installCommand`: `npm install`
  - `framework`: `nextjs`
- **Preview envs:** Supabase Branching for per-PR database (planned)

### CI Pipeline — GitHub Actions

- **Workflow:** `.github/workflows/ci.yml:1-82`
- **Triggers:** Push to `main`, PRs to `main`
- **Concurrency:** Cancels in-flight runs for the same branch (`:10-12`)
- **Job `build`** on `ubuntu-latest`, 15 min timeout
- **Steps:**
  1. Checkout (`actions/checkout@v4`)
  2. Setup Node 22 with npm cache (`actions/setup-node@v4`)
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint` (Biome)
  6. Install Supabase CLI (`supabase/setup-cli@v1`)
  7. `supabase start` — local Supabase stack
  8. `supabase db reset --no-seed` — apply migrations
  9. `supabase db lint` + `supabase db diff` — drift detection (fails CI if drift)
  10. `npm run db:seed` — populate demo workspace
  11. `npm run db:test` — Vitest (RLS, Drizzle transactions, auth flow)
  12. `npm run build` — with placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Note:** `npm run lint` is documented as Biome in CI but `apps/web/package.json:10` uses `eslint .` — mismatch (likely TODO)

## Environment Configuration

### Required env vars (committed in `.env.example`)

| Group | Var | Required | Purpose |
| --- | --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Yes (client) | Supabase project URL |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (client) | Browser-exposed anon/publishable key |
| Supabase | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alias | Newer alias for anon key |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Bypasses RLS — never expose to client |
| Database | `DATABASE_URL` | Yes (server) | Transaction-mode pooler (port 6543) for Drizzle |
| Database | `DIRECT_URL` | Yes (migrations) | Port 5432, never pooled; migrations only |
| Database | `DATABASE_URL_SESSION` | Yes (Better Auth) | Session-mode pooler (port 5432) |
| Auth | `BETTER_AUTH_SECRET` | Yes (prod) | 32-byte secret (`openssl rand -base64 32`) |
| Auth | `BETTER_AUTH_URL` | Yes | Base URL (e.g. `http://localhost:3000`) |
| Auth | `BETTER_AUTH_API_KEY` | Optional | API key for external consumers |
| OAuth | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in |
| OAuth | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | GitHub sign-in |
| Email | `RESEND_API_KEY` | Optional (prod) | Falls back to console transport in dev |
| Email | `RESEND_FROM` | Optional | Default `Rejira <noreply@rejira.app>` |
| Email | `RESEND_WEBHOOK_SECRET` | Optional | Webhook signature verification |
| Rate limit | `UPSTASH_REDIS_REST_URL` | Optional (prod) | Upstash Redis (in-memory fallback in dev) |
| Rate limit | `UPSTASH_REDIS_REST_TOKEN` | Optional (prod) | |
| Observability | `SENTRY_DSN` | Optional | Sentry error tracking |
| Observability | `SENTRY_AUTH_TOKEN` | Optional | Sentry auth |
| Observability | `POSTHOG_API_KEY` | Optional | PostHog server-side events |
| Observability | `POSTHOG_HOST` | Optional | Default `https://us.i.posthog.com` |
| Optional | `HIBP_API_KEY` | Optional | HaveIBeenPwned breach check |

### Client-exposed vars (NEXT_PUBLIC_*)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `_PUBLISHABLE_KEY`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` (consumed in `apps/web/lib/auth/client.ts:18-20`)
- `NEXT_PUBLIC_SITE_URL` (consumed in `apps/web/lib/auth/client.ts:19`, `apps/web/lib/email/templates/index.ts:11`)
- `NEXT_PUBLIC_POSTHOG_KEY` (referenced in `apps/web/lib/observability/index.ts:11`, not in `.env.example`)
- `NEXT_PUBLIC_APP_URL` (used in CI placeholder, not in `.env.example`)

### Secrets location

- Local: `apps/web/.env.local` (gitignored) and root `.env.local` (gitignored, present in tree)
- Production: Vercel environment variables (per `vercel.json` framework setup)
- CI: GitHub Actions secrets (no env values hardcoded; placeholders used for build)

## Realtime & Subscriptions

### Supabase Realtime (Phase 2 target)

- **Channels:** Postgres Changes + Broadcast + Presence (per AGENTS.md)
- **Subscription model:** One WebSocket per workspace
- **Status:** Client wrappers exist (`apps/web/utils/supabase/{client,server,middleware}.ts`) but no Realtime subscriptions in source yet

## Webhooks & Callbacks

### Incoming

- `POST /api/auth/[...all]` — Better Auth catch-all (sign-in, sign-up, OAuth callback, magic-link, 2FA, etc.) — `apps/web/app/api/auth/[...all]/route.ts:32-40`
- `POST /api/auth/verify-email?token=…` — Email verification (called from `apps/web/app/(auth)/verify-email/page.tsx:23`)
- `POST /api/check` — Listed as public in `apps/web/proxy.ts:9`; implementation not in source
- Resend webhook — `RESEND_WEBHOOK_SECRET` env present; no route handler in source yet (Phase 3K)

### Outgoing

- Better Auth → Google OAuth (`{baseURL}/api/auth/callback/google`) — handled by Better Auth
- Better Auth → GitHub OAuth (`{baseURL}/api/auth/callback/github`) — handled by Better Auth
- Resend API — `POST https://api.resend.com/emails` (`apps/web/lib/email/transport.ts:40-53`)
- api.qrserver.com — `GET https://api.qrserver.com/v1/create-qr-code/?…` (client-side, `apps/web/components/auth/two-factor-setup.tsx:32`)
- Google Fonts — `GET https://fonts.googleapis.com/css2?family=Geist…` (`apps/web/app/layout.tsx:34-36`)

## Assets & Static Resources

- **Google Fonts (CDN):** `https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap` — preconnect + stylesheet link in `apps/web/app/layout.tsx:24-36`
  - Fonts: Geist (sans), Geist Mono (code)
  - Loaded with `display=swap`; no FOIT
  - **No self-hosting** — third-party CDN dependency at runtime

## Integration Status Matrix

| Integration | Dependency | Env vars | Code | Status |
| --- | --- | --- | --- | --- |
| Supabase Realtime/Storage | `@supabase/ssr` 0.10.3 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `apps/web/utils/supabase/*` | Wired, no active subscriptions yet |
| Supabase Postgres | `pg` 8.21.0, `postgres` 3.4.5 | `DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL_SESSION` | Not in source | Phase 2 — not started |
| Drizzle ORM | `drizzle-orm` 0.36.0 + `drizzle-kit` 0.28.0 | (DB) | Not in source | Phase 2 — not started |
| Better Auth | `better-auth` 1.6.14 | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Stubs throw | Phase 3 — pre-init |
| Google OAuth | via Better Auth | `GOOGLE_CLIENT_*` | `oauth-config.ts` reads env | Env-gated, not yet active |
| GitHub OAuth | via Better Auth | `GITHUB_CLIENT_*` | `oauth-config.ts` reads env | Env-gated, not yet active |
| Resend Email | `resend` 4.0.0 (not imported) | `RESEND_API_KEY`, `RESEND_FROM` | `lib/email/transport.ts` (raw fetch) | Active transport, no callers yet |
| React Email | `react-email` 4.0.0 (not imported) | — | — | Phase 3K — not started |
| QR codes (2FA) | none | — | `two-factor-setup.tsx:32` | Active (third-party) |
| HIBP | none | `HIBP_API_KEY` | `password-policy.ts:20` stub | Phase 3K — not started |
| Sentry | none (env stubbed) | `SENTRY_DSN` | `observability/index.ts:3` stub | Phase 4J — not started |
| PostHog | none (env stubbed) | `POSTHOG_API_KEY` | `observability/index.ts:10` stub | Phase 4J — not started |
| Upstash Redis | none | `UPSTASH_REDIS_*` | In-memory `rate-limit.ts` | Phase 3 — not started |
| Google Fonts | none | — | `layout.tsx:24-36` | Active (CDN) |

---

*Integration audit: 2026-06-07*
