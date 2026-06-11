<!-- generated-by: gsd-doc-writer -->

# Deployment

## Deployment Targets

The application deploys to two cloud platforms:

| Target | Platform | Config File |
|--------|----------|-------------|
| Web app | **Vercel** | `vercel.json` (project config) |
| Database & infra | **Supabase Cloud** | `supabase/config.toml` |

## Build Pipeline

CI/CD runs through GitHub Actions (`.github/workflows/ci.yml`):

1. **Trigger**: Push or pull request to `main`
2. **Typecheck**: `tsc --noEmit`
3. **Lint**: ESLint
4. **Database**: Supabase local stack starts, migrations applied, drift detection runs, seed executed
5. **Tests**: pgTAP RLS tests + Vitest (Drizzle, auth)
6. **Build**: `next build` with placeholder environment variables

Deploy to Vercel is configured through the Vercel GitHub integration — every push to `main` triggers an automatic production deployment. Preview deployments are created for pull requests.

## Environment Setup

Production requires the following environment variables set in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` — production Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — production anon key
- `SUPABASE_SERVICE_ROLE_KEY` — production service role key
- `DATABASE_URL` — transaction-mode pooler URL (port 6543)
- `DIRECT_URL` — direct database URL for migrations (port 5432)
- `DATABASE_URL_SESSION` — session-mode pooler URL for Better Auth
- `BETTER_AUTH_SECRET` — auth secret
- `BETTER_AUTH_URL` — production URL

<!-- VERIFY: The Supabase project reference must be set in Vercel environment variables. These values are unique per deployment environment and cannot be determined from the repository. -->

Optional production variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `POSTHOG_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Database Deployment

Database changes are managed through Supabase migrations:

1. Generate a migration: `npm run db:generate`
2. Test locally: `npm run db:reset`
3. Push to staging: `npm run db:push:staging`
4. Push to production: `npm run db:push:prod`

For production database changes:
- Use Supabase Branching for zero-downtime schema changes
- Run `supabase db push` during a maintenance window
- Verify with `supabase db diff` before pushing

<!-- VERIFY: The staging and production project references for `db:push:*` scripts must be configured in `.env.local` or as Vercel environment variables. -->

## Rollback Procedure

**Web app**: Vercel instant rollback — redeploy a previous deployment through the Vercel dashboard.

**Database**: Use Supabase Point-in-Time Recovery (PITR) to restore to a pre-migration state:
1. Identify the migration that needs rollback
2. Create a new migration that reverses the changes
3. Apply the rollback migration
4. Deploy the matching application code

<!-- VERIFY: PITR retention period is configurable in Supabase project settings and varies by plan tier. -->

## Monitoring

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking and performance monitoring |
| **PostHog** | Product analytics and user behavior |
| **Supabase** | Database metrics, connection pool usage, queries |
| **Vercel** | Deployment logs, function invocations, edge network |

<!-- VERIFY: Sentry DSN and PostHog API key must be configured as Vercel environment variables for production error tracking. -->
