# Production Deployment Runbook

## Prerequisites

- `supabase` CLI installed and logged in
- `vercel` CLI installed and logged in
- Access to the GitHub repository
- Access to Google Cloud Console (for OAuth)
- Access to GitHub Developer Settings (for OAuth)
- Resend account with verified domain

## 1. Supabase Production Project

```bash
supabase projects create rejira-prod \
  --org <your-org-slug> \
  --region eu-west-1 \
  --db-size small
```

- Enable PITR: Supabase Dashboard > rejira-prod > Database > Backups > Enable PITR (7 days)
- Enable Branching: Supabase Dashboard > rejira-prod > Database > Branching > Enable
- Note the project reference ID and database password

## 2. Environment Variables

Create the following env vars in Vercel:

| Variable | Source |
|----------|--------|
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `DATABASE_URL` | Supabase Dashboard > Connect > Transaction (port 6543) |
| `DIRECT_URL` | Supabase Dashboard > Connect > Session (port 5432) |
| `DATABASE_URL_SESSION` | Supabase Dashboard > Connect > Session (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > service_role key |
| `NEXT_PUBLIC_SITE_URL` | Production domain (e.g., `https://rejira.dev`) |
| `RESEND_API_KEY` | Resend Dashboard > API Keys |
| `SENTRY_DSN` | Sentry Project > Settings > Client Keys |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog Project > Settings > Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `GITHUB_CLIENT_ID` | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub Developer Settings |
| `UPSTASH_REDIS_REST_URL` | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console |

## 3. Run Migrations

```bash
supabase db push --project-ref <prod-project-ref>
```

## 4. Seed Production Data

```bash
DATABASE_URL=<prod-db-url> npm run db:seed
```

## 5. OAuth App Registration

### Google OAuth
1. Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://<domain>/api/auth/callback/google`
4. Add authorized JavaScript origins: `https://<domain>`

### GitHub OAuth
1. GitHub Settings > Developer Settings > OAuth Apps
2. Register new application
3. Homepage URL: `https://<domain>`
4. Authorization callback URL: `https://<domain>/api/auth/callback/github`

## 6. Resend Domain Verification

1. Resend Dashboard > Domains > Add Domain
2. Add DNS records: SPF, DKIM (2 records), DMARC
3. Verify domain
4. Update `RESEND_API_KEY` if using domain-specific keys

## 7. Monitoring Setup

### Sentry
1. Create project: Sentry > Projects > Create Project (Next.js)
2. Note DSN
3. Add `SENTRY_DSN` to Vercel env vars
4. Configure alert rules: Slack/Discord integration

### PostHog
1. Create project: PostHog > Projects > New Project
2. Note project API key
3. Add `NEXT_PUBLIC_POSTHOG_KEY` to Vercel env vars

## 8. Vercel Deployment

```bash
vercel --prod
```

Or connect GitHub repository via Vercel Dashboard:
1. Vercel > New Project > Import GitHub repo
2. Set root directory to `apps/web`
3. Add all environment variables from step 2
4. Set build command: `npm run build`
5. Deploy

## 9. DNS Configuration

1. Point domain to Vercel:
   - CNAME `www` → `cname.vercel-dns.com`
   - A record `@` → `76.76.21.21`
2. Vercel will auto-provision SSL certificate
3. Verify HTTPS is working

## 10. Smoke Tests

Run against production:

- [ ] `GET /sign-in` returns 200
- [ ] `GET /sign-up` returns 200
- [ ] Sign up with email + password succeeds
- [ ] Email verification link received in inbox
- [ ] Sign in with email + password succeeds
- [ ] Create workspace succeeds
- [ ] Invite team member succeeds
- [ ] 2FA setup succeeds
- [ ] Sign out succeeds
- [ ] Security headers present (check response headers)
- [ ] CSP does not break app functionality
