<!-- generated-by: gsd-doc-writer -->

# Configuration

## Environment Variables

The application is configured through environment variables. Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL for Realtime + Storage clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Public anon/publishable key for Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Server-only service role key (never expose to client) |
| `DATABASE_URL` | Yes | — | Transaction-mode pooler (port 6543) for Drizzle |
| `DIRECT_URL` | Yes | — | Direct connection (port 5432) for drizzle-kit migrations |
| `DATABASE_URL_SESSION` | Yes | — | Session-mode pooler (port 5432) for Better Auth |
| `BETTER_AUTH_SECRET` | Yes | — | Auth secret, generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | `http://localhost:3000` | Base URL for auth redirects |
| `BETTER_AUTH_API_KEY` | No | — | API key for admin operations |
| `DEV_SKIP_EMAIL_VERIFICATION` | No | `true` | Skip email verification in dev (ignored in production) |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret |
| `RESEND_API_KEY` | No | — | Resend API key for transactional email |
| `RESEND_FROM` | No | `Rejira <noreply@rejira.app>` | From address for sent emails |
| `RESEND_WEBHOOK_SECRET` | No | — | Webhook secret for bounce handling |
| `UPSTASH_REDIS_REST_URL` | No | — | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | Upstash Redis token for rate limiting |
| `SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | No | — | Sentry auth token for source maps |
| `POSTHOG_API_KEY` | No | — | PostHog API key for product analytics |
| `POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog host URL |
| `HIBP_API_KEY` | No | — | HaveIBeenPwned API key for breach check |

## Three Connection Strings

The application uses three distinct database connection strings, each serving a different purpose:

1. **`DATABASE_URL`** (port 6543, transaction-mode pooler) — used by Drizzle ORM in the app for server components and mutations. Uses `prepare: false` to work with PgBouncer.

2. **`DIRECT_URL`** (port 5432, direct connection) — used exclusively by `drizzle-kit` for migrations. Never goes through the pooler.

3. **`DATABASE_URL_SESSION`** (port 5432, session-mode pooler) — used by Better Auth for long-lived prepared statements.

<!-- VERIFY: These three connection strings must point to the same Supabase Postgres instance, differentiated only by port and pool mode. -->

## Required Settings That Cause Startup Failure

The following variables cause the application to fail on startup if missing:
- `BETTER_AUTH_SECRET` — validated by Better Auth on initialization
- `DATABASE_URL` — validated by Drizzle client on first query
- `NEXT_PUBLIC_SUPABASE_URL` — validated by Supabase client on initialization
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — validated by Supabase client on initialization

## Per-Environment Overrides

| Environment | Configuration Method |
|-------------|---------------------|
| Local development | `.env.local` file (gitignored) |
| Preview deployments | Supabase Branching + Vercel env variables |
| Production | Vercel Environment Variables + Supabase linked project |

Local Supabase (`npm run db:start`) provides a full Postgres + Realtime + Storage stack running in Docker, with credentials printed by `supabase status`.

In production, environments are managed through:
- **Vercel**: Environment variables set per project (Production, Preview, Development)
- **Supabase**: Linked project with connection pooling, PITR backups, and branching
