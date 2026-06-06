// Phase 3 — Stream 3A: tenancy / multi-tenant isolation test.
//
// Verifies that `requireWorkspace`:
//   1. Returns the owner role for the demo user in the demo workspace
//   2. Throws "not a member" when querying a workspace the user is NOT in
//   3. Throws "Workspace not found" when the workspace _id doesn't exist
//   4. Throws "is archived" when the workspace is soft-deleted
//
// Also covers `requireRole`:
//   5. Returns the role when the user has one of the allowed roles
//   6. Throws "role X not in [...]" when the user lacks the role
//
// Unauthenticated user tests live in `auth.test.ts` (3A).

import { expect, test } from "vitest";
import { setupTestEnv, getDemoIds } from "./setup";
import { setupAuthenticatedTestEnv } from "./convex_auth_harness";
import {
  requireWorkspaceRole,
  requireWorkspaceUserId,
  requireOwner,
} from "../../convex/tenancy_probe";

test("requireWorkspace returns owner role for the demo user in the demo workspace", async () => {
  const { t, workspace, me } = await setupAuthenticatedTestEnv();

  const role = await t.mutation(requireWorkspaceRole, {
    workspaceId: workspace,
  });
  expect(role).toBe("owner");

  const me2 = await t.mutation(requireWorkspaceUserId, {
    workspaceId: workspace,
  });
  expect(me2).toBe(me);
});

test("requireWorkspace throws Forbidden for a workspace the user is not in", async () => {
  const { t, me } = await setupAuthenticatedTestEnv();

  const otherWorkspace = await t.run(async (ctx) => {
    return ctx.db.insert("workspaces", {
      externalId: "w_other",
      name: "Other",
      slug: "other",
      ownerId: me,
    });
  });

  await expect(
    t.mutation(requireWorkspaceRole, {
      workspaceId: otherWorkspace,
    }),
  ).rejects.toThrow(/not a member of this workspace/);
});

test("requireWorkspace throws NotFound for a non-existent workspace", async () => {
  const { t, me } = await setupAuthenticatedTestEnv();

  const ghost = await t.run(async (ctx) => {
    const id = await ctx.db.insert("workspaces", {
      externalId: "w_ghost",
      name: "Ghost",
      slug: "ghost",
      ownerId: me,
    });
    await ctx.db.delete(id);
    return id;
  });

  await expect(
    t.mutation(requireWorkspaceRole, {
      workspaceId: ghost,
    }),
  ).rejects.toThrow(/Workspace not found/);
});

test("requireWorkspace throws Archived for a soft-deleted workspace", async () => {
  const { t, workspace } = await setupAuthenticatedTestEnv();

  await t.run(async (ctx) => {
    await ctx.db.patch(workspace, { archivedAt: Date.now() });
  });

  await expect(
    t.mutation(requireWorkspaceRole, {
      workspaceId: workspace,
    }),
  ).rejects.toThrow(/is archived/);
});

test("requireRole accepts the owner role for owner-only operations", async () => {
  const { t, workspace } = await setupAuthenticatedTestEnv();

  const role = await t.mutation(requireOwner, {
    workspaceId: workspace,
  });
  expect(role).toBe("owner");
});

test("requireRole rejects a member-only role for owner-only operations", async () => {
  const { t, workspace, me } = await setupAuthenticatedTestEnv();

  // Demote Aria from owner to member.
  await t.run(async (ctx) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", me).eq("workspaceId", workspace),
      )
      .unique();
    await ctx.db.patch(membership!._id, { role: "member" });
  });

  await expect(
    t.mutation(requireOwner, { workspaceId: workspace }),
  ).rejects.toThrow(/role member not in \[owner\]/);
});
