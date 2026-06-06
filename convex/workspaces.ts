// Phase 3 — Stream 3F: Workspace mutations.
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./_lib/auth_helpers";
import { forbidden } from "./_lib/errors";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const slug = slugify(args.name);
    const externalId = `w_${slug}_${Date.now()}`;
    const id = await ctx.db.insert("workspaces", {
      externalId,
      name: args.name,
      slug,
      ownerId: userId,
    });
    await ctx.db.insert("memberships", {
      externalId: `m_owner_${externalId}`,
      userId,
      workspaceId: id,
      role: "owner",
      joinedAt: Date.now(),
    });
    return { id, slug };
  },
});

export const archive = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { role } = await import("./_lib/tenancy").then((m) =>
      m.requireOwner(ctx, args.workspaceId),
    );
    await ctx.db.patch(args.workspaceId, { archivedAt: Date.now() });
  },
});
