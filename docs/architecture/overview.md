<!-- generated-by: gsd-doc-writer -->

# Architecture Overview

rejira is a full-stack web application with a Next.js 16 frontend, Better Auth for authentication, Drizzle ORM for type-safe database access, and Supabase Postgres for persistence, realtime, and storage. The system follows a 13-layer architecture where each layer depends only on the layer directly below it.

## Layered Architecture

```
L13  Observability & Compliance   (Sentry, PostHog, audit log)
L12  Background Jobs              (pg_cron nightly housekeeping)
L11  Integration Adapters         (GitHub, Slack, webhooks)
L10  AI & Intelligence            (pgvector search, AI triage)
L9   Notifications & Presence     (email, in-app notifications)
L8   Search & Indexing            (BM25 + semantic search)
L7   Realtime Engine              (Supabase Realtime)
L6   Auth & Permissions           (Better Auth, RLS)
L5   Data & Persistence           (Drizzle, Postgres, Supabase Storage)
L4   Domain Services              (Issue, Project, Cycle, Workspace)
L3   API Surface                  (Server Actions, Route Handlers)
L2   Client State                 (Zustand stores, React context)
L1   Presentation                 (RSC, Client Components, Tailwind)
```

Dependency direction flows downward only. No layer may skip ahead.

## Directory Structure

```
/
├── apps/web/                         # Single Next.js 16 app (the deployable)
│   ├── app/                          # Routes (App Router)
│   │   ├── (auth)/                   # Sign-in, sign-up, magic-link, 2FA
│   │   ├── (workspace)/              # Authenticated shell + pages
│   │   ├── api/                      # Route handlers (auth, webhooks)
│   │   └── onboarding/               # Post-signup wizard
│   ├── components/                   # UI components
│   │   ├── ui/                       # Animate UI library components
│   │   ├── shell/                    # TopBar, PrimaryNav, CommandPalette
│   │   ├── issue/                    # IssueRow, IssueDrawer, IssueProperties
│   │   ├── views/                    # GroupedList, CycleBoard, FilterPopover
│   │   ├── primitives/               # Button, Input, Kbd, etc.
│   │   ├── auth/                     # SignInForm, TwoFactorSetup
│   │   └── settings/                 # ProfileForm, SessionsList
│   ├── lib/                          # Shared libraries
│   │   ├── auth/                     # Better Auth server + client
│   │   ├── db/                       # Drizzle schema, client, seed
│   │   │   ├── schema/               # 21 table definitions
│   │   │   ├── migrations/           # SQL migration files
│   │   │   ├── client.ts             # Database connection
│   │   │   ├── transaction.ts        # Transaction wrapper
│   │   │   └── rsc.ts               # Server component helpers
│   │   ├── email/                    # Resend + Inbucket email transport
│   │   ├── realtime/                 # Supabase Realtime subscriptions
│   │   ├── mock/                     # Mock data (Phase 1, removed in Phase 4)
│   │   ├── state/                    # Zustand stores
│   │   ├── supabase/                 # Supabase client config
│   │   ├── motion/                   # Spring animation variants
│   │   ├── observability/            # Sentry, PostHog, logger
│   │   └── i18n/                     # Internationalization dictionaries
│   ├── tests/                        # Vitest + Playwright tests
│   └── emails/                       # React Email templates
├── supabase/                         # Supabase CLI local development
│   ├── migrations/                   # 21 versioned SQL migrations
│   ├── seed.sql                      # Alternative SQL seed
│   └── config.toml                   # Local Supabase config
└── docs/                             # Documentation
    ├── architecture/                 # Architecture docs
    ├── guides/                       # Development guides
    └── runbooks/                     # Operational runbooks
```

## Data Flow

1. A user action (click, keystroke) triggers a **Server Action** or client-side mutation.
2. The mutation calls a **Drizzle query** wrapped in `withTransaction()` for atomicity.
3. The query runs against **Supabase Postgres** via the transaction pooler (port 6543).
4. **Row-Level Security** (RLS) policies enforce multi-tenant isolation at the database level — no app-level authorization helpers.
5. On success, **Supabase Realtime** broadcasts the change to all connected clients.
6. Clients receive the delta and update their local **Zustand stores** optimistically.

## Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | RSC, Server Actions, routing |
| UI | React 19 + Tailwind v4.3 + Motion 12 | Component rendering, styling, animation |
| Icons | @animate-ui/icons | 24x24 stroke icons |
| Database | Supabase Postgres 15 | Multi-tenant persistence |
| ORM | Drizzle ORM | Type-safe queries and migrations |
| Auth | Better Auth 1.x | Sessions, OAuth, 2FA, orgs |
| Realtime | Supabase Realtime | Live updates, presence |
| Search | pgvector (BM25 + cosine) | Hybrid search |
| Storage | Supabase Storage | Avatars, attachments |
| Email | Resend | Transactional email |
| Monitoring | Sentry + PostHog | Errors, analytics |

## Database Schema

The schema defines 21 tables across the data layer:

- **Workspace & Org**: `workspaces`, `memberships`, `invitations`, `teams`
- **Projects**: `projects`, `project_members`
- **Issues**: `issues`, `issue_assignees`, `comments`, `labels`, `attachments`
- **Cycles**: `cycles`, `cycle_issues`
- **Views & Filters**: `saved_views`
- **Audit & Activity**: `activities`, `audit_log`, `notifications`
- **Auth**: `users` (extended by Better Auth)

Every business table has RLS enabled, verified by a CI test suite.

## Authentication Flow

Better Auth manages sessions in Postgres via a session-mode pooler (port 5432). The auth flow supports:

- Email + password login
- Magic link (passwordless)
- OAuth (Google, GitHub)
- Two-factor authentication (TOTP)
- Organization-based multi-tenancy (mapped to workspaces)
