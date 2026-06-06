// Phase 3 — Stream 3A: Multi-tenant helpers (Better Auth edition).
//
// Every business query and mutation in `convex/` MUST be workspace-scoped.
// `requireWorkspace` is the canonical guard:
//
//   1. Resolve the current user from the Better Auth session
//   2. Confirm the workspace exists and isn't archived
//   3. Confirm the user has a `memberships` row for the workspace
//
// `requireRole` extends with a role check (e.g. "owner or admin only").
//
// Phase 4 will add `requireOwner`/`requireAdmin` shorthands and per-workspace
// feature flags. Phase 3G will add rate-limited re-auth for destructive
// operations (member removal, workspace archive).

import { type MutationCtx, type QueryCtx } from "../_generated/server";
import { type Id } from "../_generated/dataModel";
import {
  archived,
  forbidden,
  notFound,
  unauthenticated,
} from "./errors";
import type { Role } from "./schema_types";
import { getAuthUserId } from "./auth_helpers";

type Ctx = QueryCtx | MutationCtx;

/**
 * Returns the role of the current user in the given workspace, or throws
 * a ConvexError if the user is not a member.
 */
export async function requireWorkspace(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
): Promise<{ role: Role; userId: string }> {
  // ---------- 1. Resolve the current user ----------
  const userId = await getAuthUserId(ctx);
  if (!userId) throw unauthenticated();

  // ---------- 2. Confirm the workspace exists and isn't archived ----------
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw notFound("Workspace", String(workspaceId));
  if (workspace.archivedAt !== undefined) throw archived("Workspace");

  // ---------- 3. Confirm the user is a member of this workspace ----------
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", userId).eq("workspaceId", workspaceId),
    )
    .unique();
  if (!membership) {
    throw forbidden("not a member of this workspace");
  }

  return { role: membership.role, userId };
}

/**
 * Extends `requireWorkspace` with a role check. Throws if the user is
 * authenticated but lacks one of the allowed roles.
 */
export async function requireRole(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
  ...allowed: Role[]
): Promise<{ role: Role; userId: string }> {
  const result = await requireWorkspace(ctx, workspaceId);
  if (!allowed.includes(result.role)) {
    throw forbidden(
      `role ${result.role} not in [${allowed.join(", ")}]`,
    );
  }
  return result;
}

/**
 * Shorthand for `requireRole(ctx, workspaceId, "owner")`. Use for
 * destructive workspace-level operations: delete workspace, transfer
 * ownership, change billing.
 */
export async function requireOwner(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
) {
  return requireRole(ctx, workspaceId, "owner");
}

/**
 * Shorthand for owner-or-admin. Use for member management, billing
 * changes, project create/archive.
 */
export async function requireAdmin(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
) {
  return requireRole(ctx, workspaceId, "owner", "admin");
}
