// Phase 4 — Cycles: queries.
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspace } from "./_lib/tenancy";

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    await requireWorkspace(ctx, args.workspaceId);
    let q = ctx.db.query("cycles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId));
    const cycles = await q.collect();
    if (args.projectId) {
      return cycles.filter((c) => c.projectId === args.projectId);
    }
    return cycles;
  },
});

export const get = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) return null;
    await requireWorkspace(ctx, cycle.workspaceId);
    return cycle;
  },
});
