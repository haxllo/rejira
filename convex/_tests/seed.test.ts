// Phase 2 — Stream 2D: seed test.
//
// Verifies that `internal.seed`:
//   1. Creates the expected row counts in each table
//   2. Creates a workspace with the expected externalId
//   3. Gives Aria the owner role
//   4. Is idempotent — a second run produces zero new rows

import { expect, test } from "vitest";
import { setupTestEnv, DEMO_WORKSPACE_EXTERNAL_ID, seedRef } from "./setup";

const EXPECTED_COUNTS = {
  memberships: 12,
  projects: 4,
  projectMembers: 18,
  labels: 10,
  cycles: 3,
  issues: 30,
  issueAssignees: 28,
  cycleIssues: 25,
  comments: 7,
  notifications: 10,
  activities: 12,
  workspaces: 1,
} as const;

test("seed creates the expected row counts", async () => {
  const t = await setupTestEnv();

  for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
    const rows = await t.run(async (ctx) => ctx.db.query(table as never).collect());
    expect(rows.length, `table ${table}`).toBe(expected);
  }
});

test("seed creates a workspace with the expected externalId", async () => {
  const t = await setupTestEnv();
  const ws = await t.run(async (ctx) =>
    ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", DEMO_WORKSPACE_EXTERNAL_ID),
      )
      .unique(),
  );
  expect(ws).not.toBeNull();
  expect(ws?.slug).toBe("acme");
});

test("seed gives Aria the owner role", async () => {
  const t = await setupTestEnv();
  const workspace = await t.run(async (ctx) =>
    ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", DEMO_WORKSPACE_EXTERNAL_ID),
      )
      .unique(),
  );
  const memberships = await t.run(async (ctx) =>
    ctx.db
      .query("memberships")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace!._id))
      .collect(),
  );
  const ownerMembership = memberships.find((m) => m.role === "owner");
  expect(ownerMembership).toBeDefined();
});

test("seed is idempotent — second run produces zero new rows", async () => {
  const t = await setupTestEnv();

  const beforeCounts: Record<string, number> = {};
  for (const table of Object.keys(EXPECTED_COUNTS)) {
    beforeCounts[table] = await t.run(
      async (ctx) => (await ctx.db.query(table as never).collect()).length,
    );
  }

  // Re-run the seed
  await t.run(seedRef);

  for (const [table, before] of Object.entries(beforeCounts)) {
    const after = await t.run(
      async (ctx) => (await ctx.db.query(table as never).collect()).length,
    );
    expect(after, `table ${table} after second seed`).toBe(before);
  }
});
