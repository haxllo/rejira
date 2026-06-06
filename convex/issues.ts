// Phase 4 — Issues: queries and mutations.
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireWorkspace, requireRole } from "./_lib/tenancy";

const statusV = v.union(
  v.literal("backlog"), v.literal("todo"), v.literal("in_progress"),
  v.literal("in_review"), v.literal("done"), v.literal("cancelled"),
);

const priorityV = v.union(
  v.literal("urgent"), v.literal("high"), v.literal("medium"),
  v.literal("low"), v.literal("none"),
);

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    status: v.optional(v.array(statusV)),
    priority: v.optional(v.array(priorityV)),
    assigneeId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireWorkspace(ctx, args.workspaceId);

    let q = ctx.db.query("issues")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId));

    const issues = await q.collect();

    let filtered = issues.filter((i) => !i.archivedAt);

    if (args.projectId) {
      filtered = filtered.filter((i) => i.projectId === args.projectId);
    }
    if (args.status?.length) {
      filtered = filtered.filter((i) => (args.status as string[]).includes(i.status));
    }
    if (args.priority?.length) {
      filtered = filtered.filter((i) => (args.priority as string[]).includes(i.priority));
    }
    if (args.assigneeId) {
      filtered = filtered.filter((i) => i.assigneeIds.includes(args.assigneeId!));
    }
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

export const get = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) return null;
    await requireWorkspace(ctx, issue.workspaceId);
    return issue;
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(statusV),
    priority: v.optional(priorityV),
    assigneeIds: v.optional(v.array(v.string())),
    labelIds: v.optional(v.array(v.id("labels"))),
    estimatePoints: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    cycleId: v.optional(v.id("cycles")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, args.workspaceId, "member");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const count = (await ctx.db.query("issues")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect()).length;

    const id = await ctx.db.insert("issues", {
      externalId: `i_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      cycleId: args.cycleId,
      key: `${project.key}-${1000 + count + 1}`,
      number: count + 1,
      title: args.title,
      description: args.description ?? "",
      status: args.status ?? "backlog",
      priority: args.priority ?? "none",
      assigneeIds: args.assigneeIds ?? [],
      labelIds: args.labelIds ?? [],
      estimatePoints: args.estimatePoints,
      dueDate: args.dueDate,
      blockedBy: [],
      subIssueIds: [],
      urlCount: 0,
      attachmentCount: 0,
      authorId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Write activity
    await ctx.db.insert("activities", {
      externalId: `act_${id}`,
      workspaceId: args.workspaceId,
      actorId: userId,
      verb: "created",
      objectType: "issue",
      objectId: id,
      after: { title: args.title },
      createdAt: Date.now(),
    });

    return ctx.db.get(id);
  },
});

export const setStatus = mutation({
  args: {
    issueId: v.id("issues"),
    status: statusV,
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");
    await requireRole(ctx, issue.workspaceId, "member");

    const before = issue.status;
    await ctx.db.patch(args.issueId, { status: args.status, updatedAt: Date.now() });

    await ctx.db.insert("activities", {
      externalId: `act_${args.issueId}_${Date.now()}`,
      workspaceId: issue.workspaceId,
      actorId: (await requireRole(ctx, issue.workspaceId, "member")).userId,
      verb: "status_changed",
      objectType: "issue",
      objectId: args.issueId,
      before: { status: before },
      after: { status: args.status },
      createdAt: Date.now(),
    });

    return ctx.db.get(args.issueId);
  },
});

export const setPriority = mutation({
  args: { issueId: v.id("issues"),     priority: priorityV },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");
    await requireRole(ctx, issue.workspaceId, "member");
    await ctx.db.patch(args.issueId, { priority: args.priority, updatedAt: Date.now() });
    return ctx.db.get(args.issueId);
  },
});

export const setAssignee = mutation({
  args: {
    issueId: v.id("issues"),
    assigneeIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");
    await requireRole(ctx, issue.workspaceId, "member");
    await ctx.db.patch(args.issueId, { assigneeIds: args.assigneeIds, updatedAt: Date.now() });
    return ctx.db.get(args.issueId);
  },
});

export const setTitle = mutation({
  args: { issueId: v.id("issues"), title: v.string() },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");
    await requireRole(ctx, issue.workspaceId, "member");
    await ctx.db.patch(args.issueId, { title: args.title, updatedAt: Date.now() });
    return ctx.db.get(args.issueId);
  },
});

export const archive = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");
    await requireRole(ctx, issue.workspaceId, "admin");
    await ctx.db.patch(args.issueId, { archivedAt: Date.now(), updatedAt: Date.now() });
  },
});

export const bulkArchive = mutation({
  args: { issueIds: v.array(v.id("issues")) },
  handler: async (ctx, args) => {
    for (const id of args.issueIds) {
      const issue = await ctx.db.get(id);
      if (!issue) continue;
      await requireRole(ctx, issue.workspaceId, "admin");
      await ctx.db.patch(id, { archivedAt: Date.now(), updatedAt: Date.now() });
    }
  },
});
