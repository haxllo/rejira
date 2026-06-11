<!-- generated-by: gsd-doc-writer -->

# rejira

A Linear-grade, keyboard-first redesign of Jira built for engineering teams that need Jira's structure with Linear's speed. Built on **Next.js 16 + React 19 + Tailwind v4.3 + Better Auth + Drizzle ORM + Supabase Postgres**.

## Installation

```bash
git clone <repo-url>
cd jira-redesign
npm install
```

Requires **Node.js 22+** and **Docker Desktop** (for the local Supabase stack).

## Quick start

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
2. Start the local Supabase stack:
   ```bash
   npm run db:start
   ```
3. Apply migrations and seed data:
   ```bash
   npm run db:reset
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

The app is available at `http://localhost:3000`. Supabase Studio runs at `http://127.0.0.1:54323`.

## Usage

The app loads with a seeded demo workspace containing 12 users, 4 projects, 30 issues, 3 cycles, and 10 labels. Navigate using:

| View | Route |
|------|-------|
| Inbox | `/inbox` |
| My Issues | `/my-issues` |
| Project board | `/projects/{key}` |
| Cycle board | `/projects/{key}/cycles/{id}` |
| Activity feed | `/activity` |
| Command palette | `⌘K` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Biome lint across monorepo |
| `npm run typecheck` | `tsc --noEmit` across monorepo |
| `npm run db:test` | Run RLS + auth test suite |
| `npm run test:e2e` | Playwright E2E suite |
| `npm run db:seed` | Re-seed the demo workspace |

## Architecture

The project is a monorepo with one deployable app at `apps/web/`. The backend uses Supabase Postgres with RLS-enforced multi-tenancy. Auth is handled by Better Auth (server-side sessions in Postgres). Realtime subscriptions flow through Supabase Realtime. See `docs/architecture/overview.md` for details.

## License

Private. Not for distribution.
