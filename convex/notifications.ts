// Phase 4 — Notifications: queries.
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./_lib/auth_helpers";

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return ctx.db.query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId))
      .collect();
    return all.filter((n) => !n.read).length;
  },
});
