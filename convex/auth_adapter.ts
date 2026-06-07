// Phase 3 — Public auth adapter wrappers for Next.js.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";

const paginationOpts = {
  cursor: v.union(v.string(), v.null()),
  numItems: v.number(),
};

export const findOne = query({
  args: { model: v.string(), where: v.optional(v.array(v.any())), select: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => (ctx.runQuery as any)(components.betterAuth.adapter.findOne, args),
});

export const findMany = query({
  args: {
    model: v.string(),
    where: v.optional(v.array(v.any())),
    select: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    paginationOpts: v.optional(v.object(paginationOpts)),
  },
  handler: async (ctx, args) => {
    return (ctx.runQuery as any)(components.betterAuth.adapter.findMany, {
      ...args,
      paginationOpts: args.paginationOpts ?? { numItems: 1000, cursor: null },
    });
  },
});

export const create = mutation({
  args: { model: v.string(), data: v.any(), select: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    return (ctx.runMutation as any)(components.betterAuth.adapter.create, {
      input: { model: args.model, data: args.data },
      select: args.select,
    });
  },
});

export const updateOne = mutation({
  args: { model: v.string(), where: v.optional(v.array(v.any())), update: v.any() },
  handler: async (ctx, args) => {
    return (ctx.runMutation as any)(components.betterAuth.adapter.updateOne, {
      input: { model: args.model, where: args.where, update: args.update },
    });
  },
});

export const deleteOne = mutation({
  args: { model: v.string(), where: v.optional(v.array(v.any())) },
  handler: async (ctx, args) => {
    await (ctx.runMutation as any)(components.betterAuth.adapter.deleteOne, {
      input: { model: args.model, where: args.where },
    });
  },
});
