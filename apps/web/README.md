<!-- generated-by: gsd-doc-writer -->

# `web` — Next.js 16 Application

The single deployable application in the rejira monorepo. A Linear-grade, keyboard-first Jira replacement built on Next.js 16 with React 19, Tailwind v4.3, Drizzle ORM, and Better Auth.

**Part of the [jira-redesign](/) monorepo.**

## Usage

```bash
# Development
npm run dev

# Production build
npm run build

# Start production build
npm run start
```

## Key Features

- **App Router** — Server Components, Server Actions, parallel routes
- **Design system** — OKLCH color tokens, Geist fonts, Motion 12 spring physics, Animate UI components
- **Keyboard-first** — `⌘K` command palette, keyboard navigation, status shortcuts (1–5)
- **Multi-tenant** — Workspace-scoped data with RLS enforcement
- **Realtime** — Supabase Realtime for live updates and presence
- **Auth** — Better Auth with email/password, OAuth, 2FA, magic link

## Main Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js routes (RSC + client components) |
| `components/` | UI components (shell, issue, views, primitives) |
| `lib/` | Shared libraries (auth, db, email, realtime, state) |
| `lib/db/schema/` | Drizzle ORM schema definitions (21 tables) |
| `lib/auth/` | Better Auth server and client configuration |
| `emails/` | React Email templates for transactional emails |
| `tests/` | Vitest and Playwright test files |

## Testing

```bash
# Run the RLS + auth test suite
npm run db:test

# Run all vitest tests
npm run test

# Run E2E tests
npm run test:e2e
```
