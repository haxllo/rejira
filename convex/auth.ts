// Phase 3 — Stream 3A: Public auth API for Convex functions.
//
// Every business query and mutation imports from this file to resolve
// the current user. The underlying implementation lives in
// `convex/_lib/auth_helpers.ts` (core) and `convex/_lib/tenancy.ts`
// (workspace-scoped).
//
// Usage:
//   import { requireUser } from "./auth";
//   const userId = await requireUser(ctx);

export { getAuthUserId, requireUser, requireVerifiedUser } from "./_lib/auth_helpers";
export {
  requireWorkspace,
  requireRole,
  requireOwner,
  requireAdmin,
} from "./_lib/tenancy";
