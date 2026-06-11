<!-- generated-by: gsd-doc-writer -->

# Development

## Local Setup

After completing the [Getting Started](getting-started.md) guide, the development environment is ready. The following commands are available for daily development.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server at `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` across the monorepo |
| `npm run lint` | ESLint across the monorepo |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending Drizzle migrations |
| `npm run db:push` | Push migrations to the linked remote Supabase project |
| `npm run db:seed` | Re-seed the demo workspace (idempotent) |
| `npm run db:studio` | Open Supabase Studio in the browser |
| `npm run db:types` | Regenerate TypeScript types from the Supabase schema |
| `npm run auth:generate` | Generate Better Auth's auth tables schema |
| `npm run auth:migrate` | Apply Better Auth schema to the database |

## Code Style

- **Linting**: ESLint with `eslint-config-next` — run `npm run lint`
- **TypeScript**: Strict mode enabled. No `any` types allowed
- **Formatting**: No Prettier — formatting is handled by ESLint rules
- **EditorConfig**: `.editorconfig` enforces 2-space indentation, Unix line endings

## Branch Conventions

No formal branch naming convention is documented. The default branch is `main`. For contributions, create feature branches off `main` with a descriptive name.

## PR Process

1. Create a feature branch from `main`
2. Make changes and ensure `npm run typecheck` and `npm run lint` pass
3. Write or update tests for your changes
4. Run `npm run db:test` to verify RLS + auth tests still pass
5. Open a pull request against `main`
6. CI runs typecheck, lint, database tests, and the production build
