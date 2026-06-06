// Phase 2 — Stream 2D: Probe functions used by tenancy.test.ts.
//
// These small internal mutations exist solely so the tests can call into
// `requireWorkspace` / `requireRole` without coupling the tests to a
// specific business query. Each probe returns a primitive the test can
// assert on.

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspace, requireRole } from "./_lib/tenancy";

export const requireWorkspaceRole = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  returns: v.union(
    v.literal("owner"),
    v.literal("admin"),
    v.literal("member"),
    v.literal("guest"),
  ),
  handler: async (ctx, { workspaceId }) => {
    const { role } = await requireWorkspace(ctx, workspaceId);
    return role;
  },
});

export const requireWorkspaceUserId = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  returns: v.string(),
  handler: async (ctx, { workspaceId }) => {
    const { userId } = await requireWorkspace(ctx, workspaceId);
    return userId;
  },
});

export const requireOwner = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  returns: v.union(
    v.literal("owner"),
    v.literal("admin"),
    v.literal("member"),
    v.literal("guest"),
  ),
  handler: async (ctx, { workspaceId }) => {
    const { role } = await requireRole(ctx, workspaceId, "owner");
    return role;
  },
});
