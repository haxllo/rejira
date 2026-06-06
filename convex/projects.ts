// Phase 4 — Projects: queries.
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspace } from "./_lib/tenancy";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspace(ctx, args.workspaceId);
    return ctx.db.query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("archivedAt"), undefined))
      .collect();
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    await requireWorkspace(ctx, project.workspaceId);
    return project;
  },
});
