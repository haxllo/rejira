---
status: incomplete
---

# SUMMARY: Add drizzle-orm and drizzle-kit v1.x

## Done
- Installed `drizzle-orm@1.0.0-rc.4-5d5b77c` (resolved from `^1.0.0-rc.3`)
- Installed `drizzle-kit@1.0.0-rc.4-ca0f029` (resolved from `^1.0.0-rc.3`)
- Upgraded `zod` from `3.24.1` to `^3.25.0` (peer dep of drizzle-orm v1 RC)
- Ran `npx drizzle-kit up` successfully (migrations structure validated)

## TypeScript impact
~170 errors from v1 RC breaking changes across 3 categories:

| Category | Count | Files | Root cause |
|---|---|---|---|
| Module exports missing | ~120 | `lib/db/schema/*`, `lib/db/client.ts`, `lib/db/rsc.ts`, `lib/db/actions/*`, `lib/auth/*`, `app/api/*`, `app/(workspace)/*` | `drizzle-orm/pg-core`, `drizzle-orm/node-postgres`, root `drizzle-orm` exports restructured in v1 |
| Implicit `any` | ~35 | Various | Pre-existing strict-mode violations (unrelated to drizzle) |
| Other type mismatches | ~15 | Components, lib/state | Pre-existing issues (e.g. `string` vs `number`, missing Supabase export) |

### Key v1 RC changes affecting this codebase
- Root `drizzle-orm`: `eq`, `and`, `sql`, `inArray`, `asc`, `desc`, `count`, `isNull`, `gt` — moved to subpath exports or renamed
- `drizzle-orm/pg-core`: All column builders, `pgTable`, `pgEnum`, `customType` — runtime exports exist (CJS `require` works) but TypeScript declaration resolution fails; likely a `moduleResolution` + `.d.ts` path issue
- `drizzle-orm/node-postgres`: `drizzle()` and `Logger` — same runtime-vs-types mismatch

## Decision: v1 RC is locked in — Phase 4 must complete the migration

Downgrade to 0.45.2 is NOT an option. The project is committed to drizzle-orm 1.x. Phase 4 must include a v1 migration plan covering:

1. **Fix v1 RC module exports** — ~120 errors across `lib/db/schema/*`, `lib/db/client.ts`, `lib/db/rsc.ts`, `lib/db/actions/*`, `lib/auth/*`, `app/api/*`, `app/(workspace)/*`. Likely just `moduleResolution` / `.d.ts` path fixes (runtime CJS exports confirmed working for `pg-core` and `node-postgres`). Query operators (`eq`, `and`, `sql`, `inArray`, etc.) may need new subpath imports from `drizzle-orm/sql` or similar.

2. **Update Relational Queries to v2** — Required per [upgrade guide Step 3](https://orm.drizzle.team/docs/upgrade-v1). Any relations definitions and `.findMany()`/`.findFirst()` queries need v2 syntax. See [relations v1→v2 guide](https://orm.drizzle.team/docs/relations-v1-v2).

3. **Fix pre-existing strict-mode violations** — ~35 implicit `any` and ~15 type mismatches uncovered by `tsc --noEmit`; some are pre-existing, some may be cascade failures from missing drizzle types.

## Reference
- Upgrade guide: https://orm.drizzle.team/docs/upgrade-v1
- Relational queries v1→v2: https://orm.drizzle.team/docs/relations-v1-v2
