# Technology Stack

**Analysis Date:** 2026-06-07

## Languages

**Primary:**
- TypeScript 5.7.2 — All source files in `apps/web`; root `tsconfig.json` enforces `strict: true`, `noEmit: true`, `target: ES2022`, `moduleResolution: bundler` (`apps/web/tsconfig.json:1-29`)
- TSX (TypeScript + JSX) — UI components; React JSX runtime via `"jsx": "react-jsx"` (`apps/web/tsconfig.json:18`)

**Secondary:**
- SQL (PostgreSQL dialect) — Authored in `supabase/migrations/*.sql` (Phase 2 plan, not yet present in tree)
- CSS — Tailwind v4 CSS-first config in `apps/web/app/globals.css:1-477` with `@theme {}` block defining OKLCH tokens
- JavaScript (ESM) — Build/seed scripts in `scripts/*.mjs`; workspace root `"type": "module"` (`package.json:5`)

## Runtime

**Environment:**
- Node.js 22 — Pinned by `node-version: 22` in `.github/workflows/ci.yml:25-28`; `@types/node: ^22.19.20` / `22.10.2`
- Edge runtime — `@edge-runtime/vm: ^5.0.0` in devDependencies (root `package.json:41`) for Drizzle migration testing
- Browser — Modern evergreen (no legacy targets in `tsconfig.json`)

**Package Manager:**
- npm — Lockfile present (`package-lock.json`); root workspaces config in `package.json:24-26`
- No pnpm, yarn, or bun lockfiles

## Frameworks

**Core (App):**
- Next.js ^16.2.7 — App Router, Turbopack, React Compiler (`apps/web/package.json:45`)
- React ^19.2.0 + react-dom ^19.2.0 (`apps/web/package.json:48-49`)

**UI / Styling:**
- Tailwind CSS 4.3.0 — CSS-first config; PostCSS plugin `@tailwindcss/postcss: 4.3.0` (`apps/web/postcss.config.mjs:1-7`)
- Motion 12.40.0 — Replaces framer-motion; imported as `motion/react` (`apps/web/components/issue/issue-drawer.tsx:4`)
- Animate UI icons — Local vendored set at `apps/web/components/animate-ui/icons/*.tsx` (64+ icons, 24×24 stroke 1.5px)
- Lucide — Set as the shadcn icon library in `apps/web/components.json:13` (used as fallback, not active icons in tree)

**Component Primitives:**
- Radix UI — `apps/web/package.json:18-35` (avatar, checkbox, collapsible, dialog, dropdown-menu, label, popover, radio-group, scroll-area, separator, slot, switch, tabs, toast, toggle, toggle-group, tooltip, visually-hidden)
- Custom primitives at `apps/web/components/primitives/` (avatar, button, kbd, label, priority, status) — CVA + Motion-powered (`apps/web/components/primitives/button.tsx:1-50`)

**Drag & Drop:**
- @dnd-kit/core ^6.3.1 + @dnd-kit/sortable ^10.0.0 + @dnd-kit/utilities ^3.2.2 (`apps/web/package.json:14-16`)

**State / Data (Client):**
- Zustand 5.0.3 — Stores in `apps/web/lib/state/` (issues, keyboard, mutations, saved-views, ui, view-query) — `zustand/middleware` imported in `apps/web/lib/state/issues.ts:3`
- @tanstack/react-query 5.62.7 — Listed as dependency (not yet actively imported in source — Phase 4 will adopt it)
- @tanstack/react-virtual 3.13.6 — Virtualization for long lists
- nuqs 2.4.3 — URL state synchronization
- cmdk 1.0.4 — Command palette (`apps/web/components/shell/command-palette.tsx:23`)
- @floating-ui/react ^0.27.19 — Popovers, tooltips

**State / Data (Server — planned, not wired into source):**
- Drizzle ORM ^0.36.0 + drizzle-kit ^0.28.0 — Phase 2
- pg ^8.21.0 + postgres ^3.4.5 — Two drivers: `pg` for Better Auth session pool, `postgres.js` for Drizzle transactions
- kysely 0.27.5 — Type-safe SQL builder (dependency only; not yet imported in source)

**Validation:**
- zod 3.24.1 — Schema validation (dependency only; not yet imported in source)

**Auth (planned, stubs in source):**
- better-auth ^1.6.14 — Server `apps/web/lib/auth/server.ts:9-23` (throws until Phase 3 init); client `apps/web/lib/auth/client.ts:10-32` with magicLink, twoFactor, organization plugins
- nextCookies plugin `better-auth/next-js` (`apps/web/lib/auth/server.ts:10`)
- OAuth: Google + GitHub providers configured in `apps/web/lib/auth/oauth-config.ts:11-25` (env-driven)
- @supabase/ssr ^0.10.3 — Supabase Realtime/Storage client wrappers; Auth is NOT used (Better Auth replaces it)

**Email (planned):**
- resend ^4.0.0 — ResendTransport in `apps/web/lib/email/transport.ts:30-60` (direct `fetch` to `https://api.resend.com/emails`); no SDK used
- react-email ^4.0.0 — Listed in root deps; not yet imported (3K will use `@react-email/components`)

**Hooks / Utilities:**
- class-variance-authority 0.7.1 + clsx 2.1.1 + tailwind-merge 2.5.5 — Tailwind class composition
- date-fns 4.1.0 — Date formatting
- sonner 1.7.1 — Toast notifications
- motion 12.40.0 — Animation primitives (used as `motion/react`)

**Testing:**
- Vitest 4.1.8 — Unit tests (`apps/web/package.json` does not list; root `package.json:48`); no `vitest.config.*` exists in tree
- Playwright ^1.60.0 — E2E + screenshot scripts (`scripts/screenshot.mjs:1-321`, `scripts/filter-screenshots.mjs:1-156`)
- pgTAP — Planned for RLS testing in CI (`.github/workflows/ci.yml:42-70`)

**Linting / Type-checking:**
- ESLint ^9.17.0 + eslint-config-next ^16.2.7 (`apps/web/package.json:60-61`)
- TypeScript 5.7.2 — `tsc --noEmit` (`apps/web/package.json:11`, `:64`)

## Key Dependencies

**Critical (Runtime, App):**
| Package | Version | Role |
| --- | --- | --- |
| `next` | ^16.2.7 | App framework, RSC, server actions, Turbopack, React Compiler |
| `react` / `react-dom` | ^19.2.0 | UI runtime |
| `motion` | ^12.40.0 | Animation (AnimatePresence, `motion` component) |
| `tailwindcss` | 4.3.0 | CSS framework, OKLCH design tokens |
| `zustand` | 5.0.3 | Client state management |
| `cmdk` | 1.0.4 | Command palette (⇧⌘K) |
| `class-variance-authority` | 0.7.1 | Component variants |

**Auth & Data (Installed, not yet wired to source):**
| Package | Version | Role |
| --- | --- | --- |
| `better-auth` | ^1.6.14 | Auth framework (Phase 3 target) |
| `drizzle-orm` | ^0.36.0 | ORM (Phase 2 target) |
| `drizzle-kit` | ^0.28.0 | Migrations / Studio |
| `pg` | ^8.21.0 | Postgres driver for Better Auth |
| `postgres` | ^3.4.5 | postgres.js driver for Drizzle |
| `@supabase/ssr` | ^0.10.3 | Supabase Realtime/Storage (browser + server) |
| `@supabase/supabase-js` | ^2.107.0 | (transitive) |
| `zod` | 3.24.1 | Validation |
| `kysely` | 0.27.5 | Type-safe SQL (transitive / future) |

**Tooling:**
| Package | Version | Role |
| --- | --- | --- |
| `@playwright/test` | ^1.60.0 | E2E + screenshot scripts |
| `vitest` | ^4.1.8 | Unit tests |
| `eslint` | ^9.17.0 | Linting |
| `typescript` | 5.7.2 | Type checking |
| `tsx` | ^4.19.0 | Run TS scripts (seed) |
| `@edge-runtime/vm` | ^5.0.0 | Edge test sandbox |
| `@types/node` | ^22.19.20 | Node type defs |
| `@types/pg` | ^8.11.10 | `pg` type defs |

## Configuration

**Build:**
- `apps/web/next.config.ts` — `reactStrictMode: true`; `experimental.optimizePackageImports: ["motion", "@radix-ui/react-dialog", "cmdk"]`
- `apps/web/tsconfig.json` — Path alias `@/*` → `./`; `strict: true`; `moduleResolution: bundler`; includes `.next/types/**/*.ts`
- `apps/web/postcss.config.mjs` — Only `@tailwindcss/postcss` plugin
- `apps/web/components.json` — shadcn config: style `radix-nova`, RSC, TSX, baseColor `neutral`, cssVariables on, aliases `@/components`, `@/lib/utils`, `@/hooks`

**Workspace:**
- Root `package.json` — npm workspaces `["apps/*"]` (`package.json:24-26`)
- Root scripts delegate to `apps/web` via `npm --prefix apps/web run …`

**TypeScript Path Aliases:**
- `@/*` → `apps/web/*` (`apps/web/tsconfig.json:25-27`)
- All imports use this alias (no relative `../../../` paths in source)

**Environment:**
- `.env.example` — Committed at repo root; documents all env vars (Supabase, Better Auth, OAuth, Email, Rate limit, Observability, HIBP)
- `.env.local` — Present in tree (NOT read; existence noted only)
- `.env` — Not present
- `apps/web/.env.example` — Workspace-level example (referenced in AGENTS.md)

**Tailwind v4 (CSS-first, no JS config):**
- `apps/web/app/globals.css:1-477` — `@theme {}` block defines color tokens (5 surface levels, 8 status, 8 label, OKLCH), 8pt spacing scale, radii, shadows, motion (springs only)
- Dark mode default, light as alternative
- Custom CSS: scrollbars, focus rings, density modifiers (`[data-density="compact|default|roomy"]`), auth form styles, optimistic mutation pulse animation

## Monorepo Layout

```
jira-redesign/                       (npm workspaces root)
├── apps/
│   └── web/                          (Next.js 16 app — only workspace)
├── scripts/                          (screenshot.mjs, filter-screenshots.mjs)
├── .agents/skills/                   (project skill packs; AGENTS.md source)
├── .github/workflows/                (ci.yml)
├── .planning/                        (GSD planning artifacts)
├── vercel.json                       (Vercel deployment config)
└── package.json                      (root workspace + scripts)
```

- Single Next.js app workspace (`apps/web`); no `packages/` directory content (directory exists but empty)
- `package-lock.json` is the only lockfile
- `screenshots/`, `.tmp/`, `build.log` present at root (build artifacts)

## Platform Requirements

**Development:**
- Node.js 22 (CI-pinned; local matches)
- npm (lockfile present; not pnpm/yarn/bun)
- Internet access — pulls Google Fonts (`apps/web/app/layout.tsx:24-36`) and calls Resend / qrserver / HIBP / Supabase
- `apps/web` directory is the workspace root; all commands scoped there
- Local Supabase stack expected (CI uses `supabase start` per `.github/workflows/ci.yml:50-51`)

**Production:**
- Vercel — `vercel.json` sets `buildCommand: "npm --prefix apps/web run build"`, `outputDirectory: "apps/web/.next"`, `framework: "nextjs"`
- Supabase Cloud — Postgres 15 + Realtime + Storage (per stack planning docs)
- Build output verified by CI: `npm run typecheck` → `npm run lint` → `supabase start` → `supabase db reset` → `npm run db:seed` → `npm run db:test` → `npm run build`

**Runtime Constraints (observed):**
- Auth route handler explicitly uses Node.js runtime: `export const runtime = "nodejs"` (`apps/web/app/api/auth/[...all]/route.ts:2`)
- Supabase clients use `cookies()` from `next/headers` and Web `Request`/`Response` (Edge-compatible)
- Email transport uses `fetch` (works in both Node and Edge)

## Versioning Notes

- Two `better-auth` versions in tree: `^1.4.0` in root `package.json:31`, `^1.6.14` in `apps/web/package.json:38` — workspace install resolves to the apps/web one
- `pg` versions diverge similarly: `^8.13.0` root vs `^8.21.0` web
- `zod` versions: `^3.23.8` root vs `3.24.1` web
- `@types/node` versions: `^22.19.20` root vs `22.10.2` web
- `tailwindcss` aligned at 4.3.0 in both root and web

---

*Stack analysis: 2026-06-07*
