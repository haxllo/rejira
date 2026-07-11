---
status: resolved
trigger: "build error - DEFAULT_MIGRATION_LOCK_TABLE/DEFAULT_MIGRATION_TABLE not exported from kysely in @better-auth/kysely-adapter"
slug: kysely-migration-exports
created: 2026-06-11T20:00:00Z
updated: 2026-06-11T20:00:00Z
---

# Current Focus
**Root cause**: better-auth v1.6.14 bundles `@better-auth/kysely-adapter` which imports `DEFAULT_MIGRATION_LOCK_TABLE` and `DEFAULT_MIGRATION_TABLE` from `kysely`. However, better-auth's nested `kysely` is v0.29.2 which **removed** these exports. The kysely-adapter is pinned to an older kysely API but ships with a newer kysely that dropped those symbols.

**Versions**:
- better-auth root: v1.6.14
- nested kysely (in better-auth/node_modules/kysely): v0.29.2 — exports `ON_MODIFY_FOREIGN_ACTIONS` and `TRANSACTION_ISOLATION_LEVELS` instead
- root kysely: v0.28.17 (still has the old exports, but Next.js resolves to nested because of `@better-auth/kysely-adapter`)

**Evidence**:
- `Get-Content "apps/web/node_modules/better-auth/node_modules/kysely/package.json" version` → `0.29.2`
- `Get-Content "apps/web/node_modules/better-auth/package.json" version` → `1.6.14`
- `DEFAULT_MIGRATION_LOCK_TABLE` and `DEFAULT_MIGRATION_TABLE` not found in `kysely/dist/index.js` (v0.29.2)
- Static export suggestions point to `ON_MODIFY_FOREIGN_ACTIONS` and `TRANSACTION_ISOLATION_LEVELS`

**Eliminated hypotheses**:
- NOT a pnpm dedupe issue — better-auth ships kysely in nested node_modules
- NOT a Next.js config issue — the import chain is valid, the target module just lacks the exports
- NOT related to our code — it's in `@better-auth/kysely-adapter` bundled within `better-auth`

# Evidence
- timestamp: 2026-06-11T20:00:00Z
- description: Root kysely v0.28.17, nested kysely v0.29.2. Nested v0.29.2 removed migration table constants.

# Resolution
**root_cause**: better-auth v1.6.14 has an internal dependency mismatch — `@better-auth/kysely-adapter` was written for kysely <0.29 but better-auth bundles kysely >=0.29 which removed `DEFAULT_MIGRATION_LOCK_TABLE` and `DEFAULT_MIGRATION_TABLE`.

**fix options**:
1. **Pin kysely to v0.28.x** in root `package.json` — `"kysely": "0.28.17"` — so top-level resolution overrides the nested one (may break other things if they need v0.29)
2. **Bump better-auth** to a newer version that has fixed its kysely-adapter
3. **Use `resolve.alias` in next.config.ts** to force kysely resolution
4. **Patch `@better-auth/kysely-adapter`** via `patchedDependencies` in package.json to remove the broken imports (they're for SQLite dialects which aren't used by this project)

**verification**: `Get-ChildItem apps/web/node_modules/better-auth/node_modules/kysely -Recurse -Filter "package.json" | Select-String "version"`
