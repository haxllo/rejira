// Phase 3 — Stream 3E: Workspace membership management.
//
// Mutations for inviting members, accepting invites, changing roles,
// and removing members from a workspace. All mutations require the
// caller to have admin or owner role (via requireAdmin/requireOwner).

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin, requireOwner } from "./_lib/tenancy";
import { forbidden } from "./_lib/errors";

function token(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const invite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx, args.workspaceId);

    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email_workspace", (q) =>
        q.eq("email", args.email).eq("workspaceId", args.workspaceId),
      )
      .first();
    if (existing && !existing.revokedAt && !existing.acceptedAt && existing.expiresAt > Date.now()) {
      return existing._id;
    }

    return ctx.db.insert("invitations", {
      externalId: `inv_${token().slice(0, 12)}`,
      workspaceId: args.workspaceId,
      email: args.email,
      role: args.role,
      token: token(),
      invitedBy: userId,
      expiresAt: Date.now() + 7 * 86400000,
      createdAt: Date.now(),
    });
  },
});

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invitation) throw forbidden("Invalid invitation token");
    if (invitation.revokedAt) throw forbidden("Invitation has been revoked");
    if (invitation.acceptedAt) throw forbidden("Invitation already accepted");
    if (invitation.expiresAt < Date.now()) throw forbidden("Invitation has expired");

    const { authComponent } = await import("./betterAuth/auth");
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw forbidden("You must be signed in to accept an invitation");

    await ctx.db.patch(invitation._id, { acceptedAt: Date.now() });

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", user._id as string).eq("workspaceId", invitation.workspaceId),
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("memberships", {
        externalId: `m_${(user._id as string).slice(0, 8)}_${invitation.workspaceId}`,
        userId: user._id as string,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
        joinedAt: Date.now(),
      });
    }

    return { workspaceId: invitation.workspaceId };
  },
});

export const revokeInvite = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw forbidden("Invitation not found");
    await requireAdmin(ctx, invitation.workspaceId);
    await ctx.db.patch(args.invitationId, { revokedAt: Date.now() });
  },
});

export const changeRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const { userId: actorId } = await requireAdmin(ctx, args.workspaceId);
    if (args.userId === actorId) throw forbidden("Cannot change your own role");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", args.userId).eq("workspaceId", args.workspaceId),
      )
      .unique();
    if (!membership) throw forbidden("User is not a member of this workspace");
    if (membership.role === "owner") throw forbidden("Cannot change the workspace owner's role");

    await ctx.db.patch(membership._id, { role: args.role });
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: actorId } = await requireAdmin(ctx, args.workspaceId);
    if (args.userId === actorId) throw forbidden("Cannot remove yourself");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", args.userId).eq("workspaceId", args.workspaceId),
      )
      .unique();
    if (!membership) throw forbidden("User is not a member");
    if (membership.role === "owner") throw forbidden("Cannot remove the workspace owner");

    await ctx.db.delete(membership._id);
  },
});
