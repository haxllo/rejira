# rejira

A Linear-grade redesign of Jira. Built on **Next.js 16 + React 19 + Convex +
Better Auth** with the **animate-ui** component library and **Motion** for
spring-only animation.

This repository is the work in progress of an incremental rewrite. See
[`PLAN.md`](./PLAN.md) for the full 9-phase plan and
[`PHASE_2_PLAN.md`](./PHASE_2_PLAN.md) for the data layer (Convex) being
landed in the current phase.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. (One-time) Provision a Convex deployment
#    This writes `.env.local` at the repo root with the deployment
#    credentials, then exits. It uses the Convex account you are
#    logged into via `npx convex login`.
npx convex dev --once

# 3. (One-time) Seed the local Convex deployment
npm run convex:seed

# 4. Run the Next.js dev server (mock data is used until Phase 3
#    wires up Better Auth → Convex)
npm run dev
```

The app is now on `http://localhost:3000`. The data layer is fully
populated: 1 workspace, 12 users, 4 projects, 30 issues, 3 cycles,
10 labels, 7 comments, 10 notifications, 12 activities.

---

## Scripts

### App

| Script                | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Next.js dev server on `http://localhost:3000`              |
| `npm run build`       | Production build                                          |
| `npm run start`       | Serve the production build                                |
| `npm run typecheck`   | `tsc --noEmit` across the whole monorepo                  |
| `npm run lint`        | (placeholder — wire ESLint when the project adopts it)    |
| `npm run screenshots` | Capture 39 PNGs into `./screenshots/` for visual review   |

### Convex

| Script                   | Description                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `npm run convex:dev`     | Watch loop: deploys `convex/` on file changes                              |
| `npm run convex:deploy`  | Promote the current dev deployment to a production deployment              |
| `npm run convex:run`     | `npx convex run <function> <args>` — invoke a Convex function from the CLI |
| `npm run convex:seed`    | Run the `seed` internal mutation to populate the local deployment         |
| `npm run convex:data`    | Open the Convex dashboard in a browser                                     |
| `npm run convex:dashboard` | Same as `convex:data`                                                   |
| `npm run convex:codegen` | Regenerate `_generated/api.d.ts` and `_generated/dataModel.d.ts`          |
| `npm run convex:test`    | Run the vitest suite against the local schema (no real Convex needed)      |

### Testing

| Script            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `npm run convex:test` | Run the multi-tenant isolation + seed verification suite |

---

## Architecture overview

```
/
├── apps/
│   └── web/                    # Next.js 16 app (the only deployable)
│       ├── app/                # Routes (RSC + client components)
│       ├── components/         # 13-layer system (primitives → templates)
│       ├── hooks/              # React hooks (useViewQuery, useMutations, …)
│       ├── lib/
│       │   ├── auth/           # Phase 3+: Better Auth server/client
│       │   ├── mock/           # Seed data (Phase 1 source of truth)
│       │   ├── state/          # zustand + view-query + mutations
│       │   └── types/          # Shared type re-exports
│       └── public/             # Static assets
├── convex/                     # Data layer
│   ├── _lib/                   # Shared helpers (errors, tenancy, types)
│   ├── _tests/                 # vitest + convex-test suite
│   ├── _generated/             # COMMITTED api.d.ts + dataModel.d.ts
│   │                           # GITIGNORED server.js, server.d.ts, api.js
│   ├── schema.ts               # 14 entities, 39 indexes
│   ├── seed.ts                 # Idempotent internal mutation
│   └── *.ts                    # Queries / mutations (added per stream)
├── scripts/                    # Build + screenshot scripts
├── screenshots/                # Playwright output (gitignored)
├── PHASE_2_PLAN.md             # Current phase plan
├── PLAN.md                     # Full 9-phase plan
└── .env.example                # Copy → .env.local before first run
```

See [`ARCHITECTURE_13_LAYERS.md`](./ARCHITECTURE_13_LAYERS.md) for the
component layer hierarchy and
[`JIRA_PAIN_POINTS_REPORT.md`](./JIRA_PAIN_POINTS_REPORT.md) for the
research that drove the redesign.

---

## Status

| Phase | Streams | Status |
| ----- | ------- | ------ |
| 0     | Bootstrap monorepo, design tokens, motion preset | done |
| 1     | 6 streams (1A-1F): primitives → templates, full app shell, mock data | done |
| 2     | 5 streams (2A-2E): Convex schema + seed + multi-tenant helpers + tests + DX | done |
| 3     | Better Auth integration                                       | **current** |
| 4     | Re-wire components to read from Convex                       |       |
| 5     | Re-wire mutations to write to Convex                         |       |
| 6     | Realtime subscriptions, optimistic UI                        |       |
| 7     | Storage, vector search, AI features                          |       |
| 8     | E2E tests, perf, deploy                                       |       |

Phase 2 deliverables: 14-entity schema with 39 indexes, an idempotent
seed mutation (1 workspace, 12 users, 4 projects, 30 issues, 3 cycles,
10 labels, 7 comments, 10 notifications, 12 activities), multi-tenant
isolation helpers (`requireWorkspace` + `requireRole`), and a vitest
suite of 11 tests that prove the tenancy boundary is enforced. See
[`PHASE_2_PLAN.md`](./PHASE_2_PLAN.md) for the per-stream DoD check.

---

## First-time setup (new contributor)

1. **Install Node 22+** and clone the repo.
2. `npm install` — installs both `apps/web` and the `convex` CLI.
3. `npx convex login` — opens a browser, sign in (or create an account).
4. `npx convex dev --once` — creates a personal dev deployment under your
   account. Writes `.env.local` at the repo root.
5. `npm run convex:seed` — runs the idempotent `seed` mutation. Safe to
   re-run.
6. `npm run dev` — open `http://localhost:3000`.
7. (Optional) `npm run convex:test` — runs the multi-tenant isolation
   suite in under a second. No real Convex backend required; it uses
   `convex-test`'s in-memory database fake.

If you have a Convex deployment already provisioned for this project
(check `.env.local`), skip steps 3–5 and just run `npm run dev`.

---

## License

Private. Not for distribution.
