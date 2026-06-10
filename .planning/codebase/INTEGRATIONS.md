# External Integrations

**Analysis Date:** 2026-06-09

## External Services

### Supabase (Database + Realtime + Storage)

**What it provides:** Managed PostgreSQL 15 with PITR, branching, read replicas; Realtime WebSocket subscriptions; S3-compatible object storage; pgvector extension; pg_cron scheduling.

**SDK/Client packages:**
- `@supabase/supabase-js` ^2.108.0 — browser client for Realtime subscriptions
- `@supabase/ssr` ^0.10.3 — server-side client with Next.js cookie handling
- Driver: `pg` ^8.21.0 — direct Postgres connection via `pg.Pool` (used by Drizzle and Better Auth)

**Connection strings (3):**
- `DATABASE_URL` — transaction-mode pooler port 6543, used by Drizzle ORM (`apps\web\lib\db\client.ts`)
- `DIRECT_URL` — direct port 5432, used by `drizzle-kit` migrations only (`drizzle.config.ts`)
- `DATABASE_URL_SESSION` — session-mode port 5432, used by Better Auth (`apps\web\lib\auth\server.ts`)

**Browser-side env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — anon/publishable key

**Server-only env vars:**
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (never exposed to client)

### Better Auth

**What it provides:** Authentication framework — email/password, magic link, OAuth, 2FA, organizations/workspaces.

**Version:** ^1.6.14

**Server init:** `apps\web\lib\auth\server.ts`
- Uses `pg.Pool` to `DATABASE_URL_SESSION` (max 10 connections)
- Plugins: `nextCookies()`, `organization()`, `admin()`, `jwt()`, `magicLink()`, `genericOAuth()`, `twoFactor()`
- Custom password validator with HIBP breach check (`apps\web\lib\auth\breach-check.ts`)
- Database hooks for audit logging on user create/update, session create/delete

**Client init:** `apps\web\lib\auth\client.ts`
- Uses `createAuthClient` from `better-auth/react`
- Client plugins: `magicLinkClient()`, `twoFactorClient()`, `organizationClient()`, `genericOAuthClient()`

**API endpoint:** `apps\web\app\api\auth\[...all]\route.ts` — catch-all handler via `toNextJsHandler(auth)`

**Env vars:**
- `BETTER_AUTH_SECRET` — signing secret (generate: `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — base URL (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` — browser-accessible auth URL
- `BETTER_AUTH_API_KEY` — API key for programmatic access
- `DEV_SKIP_EMAIL_VERIFICATION` — skip verification in dev

### Resend (Email)

**What it provides:** Transactional email delivery.

**Version:** ^4.0.0

**Transport:** `apps\web\lib\email\transport.ts`
- `ResendTransport` — `POST https://api.resend.com/emails` with `Bearer` token
- `ConsoleTransport` — stdio output for dev (no Resend key required)
- Auto-selection: `RESEND_API_KEY` present → Resend, else → Console

**Templates:** React Email templates rendered via `apps\web\lib\email\render.ts`
- Templates: `reset-password`, `verify-email`, `magic-link`, `workspace-invite`, `new-device`

**Webhook:** `apps\web\app\api\email\webhook\route.ts`
- Receives Resend webhook events (bounce, complaint, etc.)
- HMAC-SHA256 signature validation using `RESEND_WEBHOOK_SECRET`
- Handler: `apps\web\lib\email\bounce-handler.ts`

**Env vars:**
- `RESEND_API_KEY` — Resend API key (if absent, uses ConsoleTransport)
- `RESEND_FROM` — default from address (e.g., `Rejira <noreply@rejira.app>`)
- `RESEND_WEBHOOK_SECRET` — webhook HMAC secret

### Sentry (Error Tracking)

**What it provides:** Error monitoring, performance tracing, query-level breadcrumbs.

**Version:** `@sentry/nextjs` ^10.57.0

**Init:** `apps\web\lib\observability\sentry.ts`
- Lazy init on first `SENTRY_DSN`
- Wraps Next.js config via `withSentryConfig()` (`apps\web\next.config.ts`)
- Traces: 10% sample rate prod, 100% dev
- Drizzle breadcrumbs: every query logged as Sentry breadcrumb; slow queries (>100ms) sent as warning events

**Env vars:**
- `SENTRY_DSN` — Sentry project DSN
- `SENTRY_AUTH_TOKEN` — auth token for source map uploads
- `SENTRY_ORG` — Sentry organization slug
- `SENTRY_PROJECT` — Sentry project slug

### PostHog (Product Analytics)

**What it provides:** Product analytics and event tracking.

**Packages:**
- `posthog-node` ^5.36.7 — server-side tracking (`apps\web\lib\observability\posthog.ts`)
- `posthog-js` ^1.383.2 — browser-side tracking (installed, used client-side)

**Server-side init:** Lazy on first `POSTHOG_API_KEY`
- Flush: 10 events or 5s interval
- Host: `POSTHOG_HOST` (default `https://us.i.posthog.com`)

**Env vars:**
- `POSTHOG_API_KEY` — server-side API key
- `POSTHOG_HOST` — PostHog instance host
- `NEXT_PUBLIC_POSTHOG_KEY` — browser-side API key
- `NEXT_PUBLIC_POSTHOG_HOST` — browser-accessible PostHog host

### Upstash Redis (Rate Limiting)

**What it provides:** Distributed rate limiting for auth endpoints.

**Version:** `@upstash/redis` ^1.38.0

**Usage:** `apps\web\lib\auth\rate-limit.ts`
- `RedisRateLimiter` — uses Upstash Redis REST API when env vars present
- `MemoryRateLimiter` — in-memory fallback when Redis not configured
- Better Auth's built-in rate limiter also uses database storage (`apps\web\lib\auth\server.ts`)

**Env vars:**
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis auth token

### Google OAuth

**Provider in:** `apps\web\lib\auth\server.ts` (genericOAuth plugin)
- Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`
- UserInfo URL: `https://www.googleapis.com/oauth2/v3/userinfo`
- Scopes: `openid`, `profile`, `email`
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`

**Env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### GitHub OAuth

**Provider in:** `apps\web\lib\auth\server.ts` (genericOAuth plugin)
- Authorization URL: `https://github.com/login/oauth/authorize`
- Token URL: `https://github.com/login/oauth/access_token`
- UserInfo URL: `https://api.github.com/user`
- Scopes: `user:email`
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/github`

**Env vars:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### HIBP (Have I Been Pwned)

**What it provides:** Password breach checking during signup.

**Usage:** `apps\web\lib\auth\breach-check.ts` — called in the `user.create.before` database hook
- Uses k-anonymity model (range-based API query)
- Non-blocking on failure (breach check failure does not prevent signup)

**Env vars:** `HIBP_API_KEY` (optional)

## Environment Configuration

### Required Environment Variables

**Supabase (required for data access):**
| Variable | Where Used | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Anon/publishable key for Realtime + Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key |
| `DATABASE_URL` | Server only (`apps\web\lib\db\client.ts`) | Drizzle ORM (transaction pooler :6543) |
| `DIRECT_URL` | `drizzle-kit` only (`drizzle.config.ts`) | Migrations (direct :5432) |
| `DATABASE_URL_SESSION` | Server only (`apps\web\lib\auth\server.ts`) | Better Auth (session pooler :5432) |

**Better Auth (required for authentication):**
| Variable | Where Used | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | Server only | Signing secret |
| `BETTER_AUTH_URL` | Server only | Auth base URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Browser | Client-side auth URL |

**Email (optional — ConsoleTransport used without it):**
| Variable | Where Used | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Server only | Resend API key |
| `RESEND_FROM` | Server only | Default sender address |
| `RESEND_WEBHOOK_SECRET` | Server only | Webhook HMAC secret |

**Environment files:**
- `.env.example` (root) — 52 lines, template with all variables
- `.env.example` (`apps\web\`) — 56 lines, app-specific template
- `.env.local` (`apps\web\`) — gitignored, local dev configuration

## Server-Side Clients

### Drizzle ORM Client
**File:** `apps\web\lib\db\client.ts`
**Init:** `drizzle(pool, { schema, prepare: false, logger: ... })`
- `pg.Pool` to `DATABASE_URL`, max 10 connections, 30s idle timeout, 5s connection timeout
- SSL: `rejectUnauthorized: true` in production, `false` in dev
- Query logger: Development only — `drizzleLogger` (Sentry breadcrumbs + console)
- Exported as `db` via `apps\web\lib\db\index.ts`

### Better Auth Server
**File:** `apps\web\lib\auth\server.ts`
**Init:** `betterAuth({ database: pool, ... })`
- `pg.Pool` to `DATABASE_URL_SESSION`, max 10 connections
- SSL: disabled for localhost, `rejectUnauthorized: false` for remote
- Exported as `auth`, `getAuthInstance()` via `apps\web\lib\auth\index.ts`
- Route handler at `apps\web\app\api\auth\[...all]\route.ts`

### Supabase Server Client
**File:** `apps\web\utils\supabase\server.ts`
**Init:** `createServerClient(url, anonKey, { cookies })` from `@supabase/ssr`
- Uses `next/headers` cookies
- Used in `apps\web\lib\supabase\storage.ts` for Storage operations

### Supabase Middleware Client
**File:** `apps\web\utils\supabase\middleware.ts`
**Init:** `createServerClient(url, anonKey, { cookies })` with request-based cookies
- `updateSession(request)` — validates Supabase auth session, returns `{ supabase, user, response }`

### Observability
**Files:** `apps\web\lib\observability\`
- `sentry.ts` — `initSentry()`, `captureError()`, `withSentryTransaction()`, `captureDrizzleError()`
- `posthog.ts` — `initPostHog()`, `trackEvent()`
- `logger.ts` — Pino logger (`logger`, `withRequestContext()`)
- `drizzle-logger.ts` — Drizzle query logging → Sentry

## Browser-Side Clients

### Better Auth Client
**File:** `apps\web\lib\auth\client.ts`
**Init:** `createAuthClient({ baseURL, basePath: '/api/auth', plugins })` from `better-auth/react`
- Exports: `signIn`, `signUp`, `signOut`, `useSession`, `getSession`, `useActiveOrganization`, `useListOrganizations`, `useActiveMember`
- Base URL auto-detected from `window.location.origin` or `NEXT_PUBLIC_BETTER_AUTH_URL`

### Supabase Browser Client
**File:** `apps\web\utils\supabase\client.ts`
**Init:** `createBrowserClient(url, anonKey)` from `@supabase/ssr`
- Used for Realtime subscriptions and Storage operations from client components

## Route Handlers & API Endpoints

### Auth Routes
| Route | Method | File | Handler |
|---|---|---|---|
| `/api/auth/[...all]` | GET, POST | `apps\web\app\api\auth\[...all]\route.ts` | Better Auth catch-all |

### Database API Routes (all at `/api/db/`)
| Route | Methods | File | Auth |
|---|---|---|---|
| `/api/db/issues` | GET, POST | `apps\web\app\api\db\issues\route.ts` | `requireAuth()` + workspace check |
| `/api/db/projects` | POST | `apps\web\app\api\db\projects\route.ts` | `requireAuth()` + workspace check |
| `/api/db/cycles` | POST | `apps\web\app\api\db\cycles\route.ts` | `requireAuth()` + workspace check |
| `/api/db/comments` | POST | `apps\web\app\api\db\comments\route.ts` | `requireAuth()` + workspace check |
| `/api/db/memberships` | POST | `apps\web\app\api\db\memberships\route.ts` | `requireAuth()` + workspace check |
| `/api/db/notifications` | POST | `apps\web\app\api\db\notifications\route.ts` | `requireAuth()` + workspace check |
| `/api/db/saved-views` | POST | `apps\web\app\api\db\saved-views\route.ts` | `requireAuth()` + workspace check |

**Pattern:** All DB routes use discriminated union Zod schema (field `op`), `requireAuth()`, workspace ID verification against session, `withWorkspaceTransaction()`, and `mapDrizzleError()` for consistent error responses.

### Health Check
| Route | Method | File | Purpose |
|---|---|---|---|
| `/api/db-check` | GET | `apps\web\app\api\db-check\route.ts` | `SELECT 1` liveness probe |

### Email Webhook
| Route | Method | File | Purpose |
|---|---|---|---|
| `/api/email/webhook` | POST | `apps\web\app\api\email\webhook\route.ts` | Resend bounce/complaint webhooks |

### Server Actions
**File:** `apps\web\lib\server-actions.ts` (440 lines)
- Client-side callable functions that POST to `/api/db/<domain>`
- Error handling: throws `ServerActionError` with code, status, details
- Domains: `issues`, `projects`, `cycles`, `comments`, `notifications`, `saved-views`, `memberships`
- Operations per domain: create, update, delete, archive, bulk operations, etc.

## Middleware

**File:** `apps\web\middleware.ts` (115 lines)

**Matcher:** `/((?!_next/static|_next/image|favicon.ico).*)`

**Behavior:**
1. **Public routes** (`/sign-in`, `/sign-up`, etc.): Sets locale cookie, security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), request ID via `x-request-id`
2. **Static/assets** (`/_next`, `/static`, files with `.`): Pass through
3. **Protected routes**: Checks for `better-auth.session_token` cookie — redirects to `/sign-in` if absent

**No Supabase session management in middleware** — Better Auth handles auth; middleware only checks cookie presence for route gating.

**Supported locales:** en, es, fr, de, ja, zh (detected from cookie, then Accept-Language header, default `en`)

## Webhooks

**Incoming Webhooks:**
| Endpoint | Source | File | Validation |
|---|---|---|---|
| `POST /api/email/webhook` | Resend | `apps\web\app\api\email\webhook\route.ts` | HMAC-SHA256 (`RESEND_WEBHOOK_SECRET`) |

**Outgoing Webhooks:** None currently implemented.

---

*Integration audit: 2026-06-09*
