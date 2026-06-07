# rejira Auth System Threat Model

**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
**Scope:** Full Phase 3 auth system — authentication, authorization, sessions, multi-tenancy, email, i18n
**Document version:** 1.0
**Last updated:** 2026-06-08

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → App Server (HTTPS) | All traffic encrypted via TLS 1.3. CSP, HSTS, and security headers enforced at edge. |
| App Server → Supabase Postgres | Connection via connection pooler (port 6543). RLS is the only authorization boundary. |
| App Server → Better Auth | Server-side auth logic; session tokens validated via database lookup. |
| App Server → Resend | API key authenticated. Email templates rendered server-side. |
| App Server → Upstash Redis | Redis REST API with token auth. Rate limit counters stored in Redis. |
| App Server → Sentry/PostHog | Client-side SDKs with project-specific API keys. No PII sent. |
| Browser → Supabase Realtime | WSS with RLS-enforced visibility. Only rows in user's workspaces are streamed. |
| Accept-Language header | Untrusted client header. Validated against allowlisted locales only. |

## Data Flow Diagram

```
[Browser] --HTTPS--> [Vercel Edge/Next.js] --pg--> [Supabase Postgres+RLS]
     |                      |                           |
     |--WSS---------------->|--[Supabase Realtime]------|
     |                      |
     |--[Better Auth]-------|--[Resend]--> [SMTP]
     |                      |
     |--[PostHog/Sentry]----|
```

## STRIDE Threat Register

### S — Spoofing

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-S1 | Session token forgery | Better Auth sessions | High | JWT signed with BETTER_AUTH_SECRET; tokens validated on every request |
| T-03-S2 | Email spoofing in sign-up | Sign-up flow | Medium | Email verification required before account activation |
| T-03-S3 | OAuth provider spoofing | OAuth config | Medium | Redirect URIs whitelisted; state parameter validated |
| T-03-S4 | Locale header spoofing | Accept-Language | Low | Locale validated against SUPPORTED_LOCALES allowlist; unknown → "en" |

### T — Tampering

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-T1 | Workspace policy tampering | Workspace security policy | High | Only admins can modify; RLS enforced; audit log written on change |
| T-03-T2 | Session data tampering | Session cookies | High | HttpOnly + Secure + SameSite=Lax cookies |
| T-03-T3 | Email link tampering | Magic link / reset | Medium | Single-use tokens with short expiry (15 min); rate-limited |
| T-03-T4 | Rate limit bypass | Rate limiter | Medium | Rate limits stored server-side in Redis; IP + user-based keys |

### R — Repudiation

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-R1 | User denies action | Audit log | Medium | All security events logged with actor_id, IP, user_agent, timestamp |
| T-03-R2 | Admin denies policy change | Workspace policy | Medium | Policy changes written to audit_log with previous/new values |

### I — Information Disclosure

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-I1 | Session token in URL | auth redirects | Medium | Tokens never in URL; cookie-only transport |
| T-03-I2 | i18n dictionary exposure | Locale files | Low | Translation files are public by design; no secrets stored |
| T-03-I3 | Error message enumeration | Sign-in / sign-up | Medium | Generic error messages; no user existence disclosure |
| T-03-I4 | CSP bypass via script-src | CSP header | High | Strict CSP; `unsafe-inline` permitted only for PostHog; frame-ancestors 'none' |

### D — Denial of Service

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-D1 | Brute force login | Sign-in endpoint | High | Rate limited: 5 attempts/IP/15min; account lockout after 10 failures |
| T-03-D2 | Email bombing | Magic link / reset | Medium | Rate limited: 3 emails/email/hour |
| T-03-D3 | npm dependency vulnerability | Dependencies | Medium | Dependabot weekly PRs; `npm audit` on CI |

### E — Elevation of Privilege

| ID | Threat | Component | Risk | Mitigation |
|----|--------|-----------|------|------------|
| T-03-E1 | 2FA requirement bypass | Workspace policy enforcement | High | Policy enforced server-side in Better Auth hooks; cannot be bypassed client-side |
| T-03-E2 | Domain restriction bypass | Allowed email domains | Medium | Domain check server-side during sign-up and invite |
| T-03-E3 | Cross-workspace access | RLS | High | RLS on every table gates by workspace membership; no app-side tenancy checks |
| T-03-E4 | Admin role escalation | Memberships RLS | High | Only owners can assign admin role; role change audited |

## Risk Matrix

| Likelihood → | Low | Medium | High |
|--------------|-----|--------|------|
| **High Impact** | T-03-E1, T-03-E4 | T-03-S1, T-03-T1, T-03-T2 | |
| **Medium Impact** | T-03-S3, T-03-T4 | T-03-S2, T-03-E2, T-03-D1 | |
| **Low Impact** | T-03-S4 | T-03-I2, T-03-D3 | |

## Acceptance

All threats with risk Medium or above have mitigations implemented in Phase 3.
Low-risk threats are accepted.

- T-03-I2 (i18n dictionary exposure): Accepted. Locale files are static assets with no secrets.
- T-03-D3 (npm vulnerabilities): Accepted with mitigation (Dependabot + CI audit).
