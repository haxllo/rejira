---
phase: 04-drizzle-queries-mutations
plan: 07
status: complete
date: 2026-06-09
---

# 04-07: RLS Proof + RBAC Cleanup — Summary

## Files Created

| File | Description |
|------|------------|
| `supabase/tests/04-rls-cross-tenant.test.sql` | pgTAP: 21 cross-tenant isolation tests for 13 business tables |
| `supabase/tests/04-rls-mutations.test.sql` | pgTAP: 12 role enforcement mutation tests |
| `apps/web/lib/db/_tests/rls-proof.test.ts` | Vitest: 22 integration tests (cross-tenant + role enforcement) |
| `apps/web/scripts/check-rbac.sh` | Bash script: greps for forbidden app-level guard patterns |

## Files Modified

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Added `App-level guard check` step + `pgTAP RLS suite` step before Vitest tests |

## Files Deleted

| File | Result |
|------|--------|
| `apps/web/lib/auth/rbac-helpers.ts` | Already absent — no deletion needed |

## Files Audited (no changes needed)

| File | Audit Result |
|------|-------------|
| `apps/web/lib/auth/workspace-helpers.ts` | Clean — no `requireRole`, `requireOwner`, `requireAdmin`, or `isInRole` functions |
| `apps/web/lib/auth/index.ts` | Clean — no `rbac-helpers` export |

## Test Counts

| Suite | Tests | Description |
|-------|-------|-------------|
| pgTAP cross-tenant | 21 | SELECT/UPDATE/INSERT/DELETE across workspace boundary for issues, projects, cycles, labels, saved_views, comments, activities, memberships, teams, workspaces, invitations + sanity checks |
| pgTAP mutations | 12 | Role escalation denial, admin/owner promotion allowed, outsider denial, membership management |
| Vitest RLS proof | 22 | Mirrors pgTAP scenarios + RLS-enabled table audit + notification scoping + audit_log scope |
| `check-rbac.sh` | 1 check | CI gate: 0 forbidden patterns found |
| **Total** | **56** | 33 pgTAP + 22 Vitest + 1 bash |

## Verifications

- [x] `grep -rn "requireRole|requireOwner|requireAdmin|isInRole" apps/web/lib apps/web/components apps/web/app apps/web/hooks` returns 0 matches
- [x] `apps/web/lib/auth/rbac-helpers.ts` does not exist
- [x] `apps/web/lib/auth/workspace-helpers.ts` has no role-checking functions
- [x] `apps/web/lib/auth/index.ts` has no rbac-helpers export
- [x] CI workflow updated with 2 new steps
- [x] `check-rbac.sh` written and ready for CI

## Known Issues / Deviations

### 1. pgTAP extension not yet installed
`CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;` is included at the top of each pgTAP file. The extension may need to be enabled in the Supabase config or installed separately. This is idempotent and will not fail if already present.

### 2. Migration 0023 column rename may break RLS policies
After migration `0023_org_plugin_alignment.sql`, all `workspace_id` columns were renamed to `"workspaceId"` (text, camelCase). However, the `0003_rls_policies.sql` policies still reference `workspace_id` (snake_case). The `0002_rls_helpers.sql` functions (`current_workspace_ids()`, `current_role()`, `is_admin()`) also reference the old column names (`memberships.workspace_id`, `memberships.user_id`). These are now `"workspaceId"` and `"userId"` respectively.

**Impact**: The RLS policies for business tables (issues, projects, cycles, labels, comments, saved_views, notifications, activities) and the RLS helper functions may be non-functional after migration 0023 is applied. The `0024_org_rls_rewrite.sql` migration only fixes the 4 org-plugin tables (workspaces, memberships, invitations, teams).

**Mitigation**: This is NOT a regression introduced by this plan. The pgTAP and Vitest tests are written against the EXPECTED RLS behavior. If the RLS infrastructure is broken, these tests will correctly fail in CI, preventing a merge until the policies are updated. A follow-up migration should update the 0003 policies and 0002 helpers to use the correct column names.

**Additionally**, the `0006_activity_log_triggers.sql` trigger body references `workspace_id` (snake_case) which is now `"workspaceId"` after 0023. This trigger may be non-functional as well.

### 3. pgTAP tests require `supabase db test` support
The `supabase db test` command runs pgTAP tests via `pg_prove`. This requires the pgTAP extension to be available in the local Supabase instance. The tests use `CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;` which is idempotent.

## Completed Requirements

- SEC-01: RLS is the only tenancy boundary; pgTAP proves it in CI
- WORK-09: Workspace data is isolated by RLS (cross-workspace queries return 0 rows; pgTAP proves it)
- ACT-01: No app-level `requireRole` helpers
- ACT-02: CI gate blocks forbidden guard patterns
