// Phase 2 — Stream 2C: Internal mutation that seeds the demo workspace.
//
// Idempotent: re-running skips any row whose `externalId` already exists.
// Safe to call on every fresh dev environment. Call with:
//   npx convex run seed:seed
//
// The mock data is read from `apps/web/lib/mock/` via relative paths. The
// Convex bundler resolves them through esbuild (the mock files have no
// workspace-relative imports — only relative ones).

import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  USERS,
} from "../apps/web/lib/mock/users";
import {
  PROJECTS,
  CYCLES,
  LABELS,
} from "../apps/web/lib/mock/projects";
import {
  ISSUES,
  COMMENTS,
  ACTIVITY,
} from "../apps/web/lib/mock/issues";
import {
  INBOX,
} from "../apps/web/lib/mock/inbox";
import { authComponent, createAuthOptions } from "./betterAuth/auth";

const DEMO_WORKSPACE_EXTERNAL_ID = "w_acme";

export const seed = internalMutation(async (ctx) => {
  const authAdapter = authComponent.adapter(ctx)(createAuthOptions(ctx));

  // ---------- 1. Workspace ----------
  const existingWorkspace = await ctx.db
    .query("workspaces")
    .withIndex("by_externalId", (q) =>
      q.eq("externalId", DEMO_WORKSPACE_EXTERNAL_ID),
    )
    .unique();

  // The owner is the first user we insert (Aria). Resolve to a Convex _id
  // after the users table is populated.
  let workspaceId: Id<"workspaces">;
  if (existingWorkspace) {
    workspaceId = existingWorkspace._id;
  } else {
    // Insert Aria first to get her _id; then create the workspace.
    const aria = await ensureUser(authAdapter, USERS[0]);
    workspaceId = await ctx.db.insert("workspaces", {
      externalId: DEMO_WORKSPACE_EXTERNAL_ID,
      name: "Acme",
      slug: "acme",
      ownerId: aria,
    });
  }

  // ---------- 2. Users + memberships ----------
  const userIdByExternal = new Map<string, string>();
  for (const u of USERS) {
    const user = await ensureUser(authAdapter, u);
    userIdByExternal.set(u.id, user);
  }
  for (const u of USERS) {
    const userId = userIdByExternal.get(u.id);
    if (!userId) continue;
    await ensureMembership(ctx, {
      externalId: `m_${u.id}_${DEMO_WORKSPACE_EXTERNAL_ID}`,
      userId,
      workspaceId,
      // Aria is the owner; everyone else takes their role from the mock.
      role: u.id === USERS[0].id ? "owner" : (u.role as "admin" | "member" | "guest"),
      invitedBy: u.id === USERS[0].id ? undefined : userIdByExternal.get(USERS[0].id),
      joinedAt: Date.parse("2026-05-15T09:00:00Z"),
    });
  }

  // ---------- 3. Projects + projectMembers ----------
  const projectIdByExternal = new Map<string, Id<"projects">>();
  for (const p of PROJECTS) {
    const leadId = userIdByExternal.get(p.lead);
    if (!leadId) continue;
    const id = await ensureProject(ctx, {
      externalId: p.id,
      workspaceId,
      key: p.key,
      name: p.name,
      description: p.description,
      iconLetter: p.iconLetter,
      iconColor: p.iconColor,
      lead: leadId,
    });
    projectIdByExternal.set(p.id, id);
    for (const memberId of p.members) {
      const userId = userIdByExternal.get(memberId);
      if (!userId) continue;
      await ensureProjectMember(ctx, {
        externalId: `pm_${p.id}_${memberId}`,
        workspaceId,
        projectId: id,
        userId,
      });
    }
  }

  // ---------- 4. Labels ----------
  const labelIdByExternal = new Map<string, Id<"labels">>();
  for (const l of LABELS) {
    const projectId = projectIdByExternal.get(l.projectId);
    if (!projectId) continue;
    const id = await ensureLabel(ctx, {
      externalId: l.id,
      workspaceId,
      projectId,
      name: l.name,
      // Mock labels have no color; assign a stable OKLCH color from the label id hash.
      color: oklchFromId(l.id),
    });
    labelIdByExternal.set(l.id, id);
  }

  // ---------- 5. Cycles ----------
  const cycleIdByExternal = new Map<string, Id<"cycles">>();
  for (const c of CYCLES) {
    const projectId = projectIdByExternal.get(c.projectId);
    if (!projectId) continue;
    const id = await ensureCycle(ctx, {
      externalId: c.id,
      workspaceId,
      projectId,
      number: c.number,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      goal: c.goal,
    });
    cycleIdByExternal.set(c.id, id);
  }

  // ---------- 6. Issues + issueAssignees + cycleIssues ----------
  const issueIdByExternal = new Map<string, Id<"issues">>();
  for (const i of ISSUES) {
    const projectId = projectIdByExternal.get(i.projectId);
    if (!projectId) continue;
    const cycleId = i.cycleId ? cycleIdByExternal.get(i.cycleId) : undefined;
    const authorId = userIdByExternal.get(i.authorId);
    if (!authorId) continue;
    const assigneeIds = i.assigneeIds
      .map((id) => userIdByExternal.get(id))
      .filter((id): id is string => id !== undefined);
    const labelIds = i.labelIds
      .map((id) => labelIdByExternal.get(id))
      .filter((id): id is Id<"labels"> => id !== undefined);

    const id = await ensureIssue(ctx, {
      externalId: i.id,
      workspaceId,
      projectId,
      cycleId,
      key: i.key,
      number: i.number,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      assigneeIds,
      labelIds,
      estimatePoints: i.estimatePoints,
      dueDate: i.dueDate,
      blockedBy: [], // resolved in a second pass below
      subIssueIds: [], // resolved in a second pass below
      pr: i.pr,
      urlCount: i.urlCount,
      attachmentCount: i.attachmentCount,
      authorId,
      createdAt: Date.parse(i.createdAt),
      updatedAt: Date.parse(i.updatedAt),
    });
    issueIdByExternal.set(i.id, id);

    // Join: issueAssignees
    for (const assigneeId of assigneeIds) {
      await ensureIssueAssignee(ctx, {
        workspaceId,
        issueId: id,
        userId: assigneeId,
      });
    }

    // Join: cycleIssues
    if (cycleId) {
      await ensureCycleIssue(ctx, {
        workspaceId,
        cycleId,
        issueId: id,
      });
    }
  }

  // ---------- 6b. Second pass: resolve blockedBy + subIssueIds ----------
  for (const i of ISSUES) {
    const id = issueIdByExternal.get(i.id);
    if (!id) continue;
    const blockedBy = i.blockedBy
      .map((bid) => issueIdByExternal.get(bid))
      .filter((x): x is Id<"issues"> => x !== undefined);
    const subIssueIds = i.subIssueIds
      .map((sid) => issueIdByExternal.get(sid))
      .filter((x): x is Id<"issues"> => x !== undefined);
    if (blockedBy.length > 0 || subIssueIds.length > 0) {
      await ctx.db.patch(id, { blockedBy, subIssueIds });
    }
  }

  // ---------- 7. Comments ----------
  for (const c of COMMENTS) {
    const issueId = issueIdByExternal.get(c.issueId);
    const authorId = userIdByExternal.get(c.authorId);
    if (!issueId || !authorId) continue;
    const reactions = c.reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      users: r.users
        .map((uid) => userIdByExternal.get(uid))
        .filter((x): x is Id<"users"> => x !== undefined),
    }));
    await ensureComment(ctx, {
      externalId: c.id,
      workspaceId,
      issueId,
      authorId,
      body: c.body,
      createdAt: Date.parse(c.createdAt),
      reactions,
    });
  }

  // ---------- 8. Notifications (inbox) ----------
  for (const n of INBOX) {
    const userId = userIdByExternal.get(USERS[0].id);
    if (!userId) continue;
    const issueId = n.issueId ? issueIdByExternal.get(n.issueId) : undefined;
    const actorId = n.actorId ? userIdByExternal.get(n.actorId) : undefined;
    await ensureNotification(ctx, {
      externalId: n.id,
      workspaceId,
      userId,
      type: n.type,
      issueId,
      actorId,
      actorName: n.actorName,
      preview: n.preview,
      read: n.read,
      snoozedUntil: n.snoozedUntil ? Date.parse(n.snoozedUntil) : undefined,
      createdAt: Date.parse(n.createdAt),
    });
  }

  // ---------- 9. Activities (audit trail seed) ----------
  for (const a of ACTIVITY) {
    const issueId = issueIdByExternal.get(a.issueId);
    const actorId = userIdByExternal.get(a.actorId);
    if (!issueId || !actorId) continue;
    await ensureActivity(ctx, {
      externalId: a.id,
      workspaceId,
      actorId,
      verb: a.type,
      objectType: "issue",
      objectId: issueId,
      before: a.payload,
      after: undefined,
      createdAt: Date.parse(a.createdAt),
    });
  }
});

// ---------- helpers ----------

async function ensureUser(
  authAdapter: ReturnType<ReturnType<typeof authComponent.adapter>>,
  u: (typeof USERS)[number],
): Promise<string> {
  const existing = await authAdapter.findOne({
    model: "user",
    where: [{ field: "email", value: u.email }],
  });
  if (existing) return (existing as Record<string, unknown>).id as string;
  const created = await authAdapter.create({
    model: "user",
    data: {
      name: u.name,
      email: u.email,
      emailVerified: true,
      image: null,
      handle: u.id,
      avatarColor: u.avatarColor,
      status: u.status,
      defaultWorkspaceId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  });
  return (created as Record<string, unknown>).id as string;
}

async function ensureMembership(
  ctx: MutationCtx,
  m: {
    externalId: string;
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    role: "owner" | "admin" | "member" | "guest";
    invitedBy?: Id<"users">;
    joinedAt: number;
  },
) {
  const existing = await ctx.db
    .query("memberships")
    .withIndex("by_externalId", (q) => q.eq("externalId", m.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("memberships", m);
}

async function ensureProject(
  ctx: MutationCtx,
  p: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    key: string;
    name: string;
    description: string;
    iconLetter: string;
    iconColor: string;
    lead: Id<"users">;
  },
) {
  const existing = await ctx.db
    .query("projects")
    .withIndex("by_externalId", (q) => q.eq("externalId", p.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("projects", p);
}

async function ensureProjectMember(
  ctx: MutationCtx,
  pm: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    userId: Id<"users">;
  },
) {
  const existing = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", pm.projectId).eq("userId", pm.userId),
    )
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("projectMembers", pm);
}

async function ensureLabel(
  ctx: MutationCtx,
  l: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    name: string;
    color: string;
  },
) {
  const existing = await ctx.db
    .query("labels")
    .withIndex("by_externalId", (q) => q.eq("externalId", l.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("labels", l);
}

async function ensureCycle(
  ctx: MutationCtx,
  c: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    number: number;
    name: string;
    startDate: string;
    endDate: string;
    status: "upcoming" | "active" | "completed";
    goal: string;
  },
) {
  const existing = await ctx.db
    .query("cycles")
    .withIndex("by_externalId", (q) => q.eq("externalId", c.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("cycles", c);
}

async function ensureIssue(
  ctx: MutationCtx,
  i: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    cycleId?: Id<"cycles">;
    key: string;
    number: number;
    title: string;
    description: string;
    status:
      | "backlog"
      | "todo"
      | "in_progress"
      | "in_review"
      | "done"
      | "cancelled";
    priority: "urgent" | "high" | "medium" | "low" | "none";
    assigneeIds: Id<"users">[];
    labelIds: Id<"labels">[];
    estimatePoints?: number;
    dueDate?: string;
    blockedBy: Id<"issues">[];
    subIssueIds: Id<"issues">[];
    pr?: { number: number; repo: string; status: "open" | "merged" | "closed" };
    urlCount: number;
    attachmentCount: number;
    authorId: Id<"users">;
    createdAt: number;
    updatedAt: number;
  },
) {
  const existing = await ctx.db
    .query("issues")
    .withIndex("by_externalId", (q) => q.eq("externalId", i.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("issues", i);
}

async function ensureIssueAssignee(
  ctx: MutationCtx,
  ia: {
    workspaceId: Id<"workspaces">;
    issueId: Id<"issues">;
    userId: Id<"users">;
  },
) {
  // No externalId on the join table; idempotency via the implicit
  // (issueId, userId) pair. Lookup by issue then check the userId in memory.
  const existing = await ctx.db
    .query("issueAssignees")
    .withIndex("by_issue", (q) => q.eq("issueId", ia.issueId))
    .collect();
  if (existing.some((row) => row.userId === ia.userId)) return null;
  return ctx.db.insert("issueAssignees", ia);
}

async function ensureCycleIssue(
  ctx: MutationCtx,
  ci: {
    workspaceId: Id<"workspaces">;
    cycleId: Id<"cycles">;
    issueId: Id<"issues">;
  },
) {
  const existing = await ctx.db
    .query("cycleIssues")
    .withIndex("by_cycle", (q) => q.eq("cycleId", ci.cycleId))
    .collect();
  if (existing.some((row) => row.issueId === ci.issueId)) return null;
  return ctx.db.insert("cycleIssues", ci);
}

async function ensureComment(
  ctx: MutationCtx,
  c: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    issueId: Id<"issues">;
    authorId: Id<"users">;
    body: string;
    createdAt: number;
    reactions: { emoji: string; count: number; users: Id<"users">[] }[];
  },
) {
  const existing = await ctx.db
    .query("comments")
    .withIndex("by_externalId", (q) => q.eq("externalId", c.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("comments", c);
}

async function ensureNotification(
  ctx: MutationCtx,
  n: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    userId: Id<"users">;
    type:
      | "assignment"
      | "mention"
      | "status_change"
      | "comment"
      | "due"
      | "review_request"
      | "review"
      | "status";
    issueId?: Id<"issues">;
    actorId?: Id<"users">;
    actorName: string;
    preview?: string;
    read: boolean;
    snoozedUntil?: number;
    createdAt: number;
  },
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_externalId", (q) => q.eq("externalId", n.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("notifications", n);
}

async function ensureActivity(
  ctx: MutationCtx,
  a: {
    externalId: string;
    workspaceId: Id<"workspaces">;
    actorId: Id<"users">;
    verb:
      | "created"
      | "status_changed"
      | "assignee_changed"
      | "priority_changed"
      | "label_added"
      | "label_removed"
      | "commented"
      | "mentioned"
      | "due_changed"
      | "title_changed";
    objectType: string;
    objectId: string;
    before?: unknown;
    after?: unknown;
    createdAt: number;
  },
) {
  const existing = await ctx.db
    .query("activities")
    .withIndex("by_externalId", (q) => q.eq("externalId", a.externalId))
    .unique();
  if (existing) return existing._id;
  return ctx.db.insert("activities", a);
}

// Stable OKLCH color derived from a string id.
// Same input → same color, so labels have consistent colors across re-seeds.
function oklchFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `oklch(0.78 0.14 ${hue})`;
}
