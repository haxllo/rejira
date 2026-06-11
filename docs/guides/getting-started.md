<!-- generated-by: gsd-doc-writer -->

# Getting Started

## Prerequisites

- **Node.js 22+**
- **npm 10+**
- **Docker Desktop** (for local Supabase stack)
- **Supabase CLI** — install via `npm install -g supabase`, `brew install supabase/tap/supabase`, or `scoop install supabase`

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd jira-redesign
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

At minimum, set the following in `.env.local`:
- `BETTER_AUTH_SECRET` — run `openssl rand -base64 32` to generate
- `BETTER_AUTH_URL=http://localhost:3000`

The Supabase environment variables are auto-populated after running `npm run db:start`.

## First Run

1. Start the local Supabase stack:
   ```bash
   npm run db:start
   ```

2. Apply migrations and seed the demo workspace:
   ```bash
   npm run db:reset
   ```
   This drops existing data, re-applies all 28+ SQL migrations, and seeds 1 workspace with 12 users, 4 projects, 30 issues, 3 cycles, and 10 labels.

3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

The app is now at `http://localhost:3000`.

| Service | URL |
|---------|-----|
| Next.js app | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Inbucket (email) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## Common Setup Issues

**Port 3000 already in use**: Change the port with `npm --prefix apps/web run dev -- -p 3001` and update `BETTER_AUTH_URL` in `.env.local`.

**Docker not running**: The Supabase stack requires Docker Desktop. Run `supabase start` separately to verify Docker is available.

**Missing `.env.local`**: The app will fail to start without the required environment variables. Copy `.env.example` and fill in the values.

**Auth pages not working**: Better Auth requires `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to be set. OAuth providers (Google, GitHub) are optional — the app works with email+password and magic link without them.

## Next Steps

- See `docs/guides/development.md` for development workflows and code style
- See `docs/guides/testing.md` for how to run and write tests
- See `docs/guides/configuration.md` for all environment variables
