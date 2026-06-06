// Phase 4 — Comments: queries.
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireWorkspace, requireRole } from "./_lib/tenancy";

export const listByIssue = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) return [];
    await requireWorkspace(ctx, issue.workspaceId);
    return ctx.db.query("comments")
      .withIndex("by_issue", (q) => q.eq("issueId", args.issueId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    issueId: v.id("issues"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, args.workspaceId, "member");
    return ctx.db.insert("comments", {
      externalId: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: args.workspaceId,
      issueId: args.issueId,
      authorId: userId,
      body: args.body,
      createdAt: Date.now(),
      reactions: [],
    });
  },
});
