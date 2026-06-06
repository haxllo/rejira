// Phase 2 — Stream 2D: Test setup.
//
// Helpers used by every test in `convex/_tests/`. The pattern is:
//   1. Create a fresh `convexTest` environment with the production schema
//   2. Run the `seed` internal mutation (idempotent — see seed.test.ts)
//   3. Resolve the demo user's _id and the demo workspace's _id
//   4. Use those to write assertions
//
// We pass `modules` explicitly to `convexTest()` instead of relying on
// `import.meta.glob`. The latter depends on Vite plugin behaviour that
// is brittle across vitest versions and Node runtimes; explicit modules
// are portable.
//
// The values are dynamic-import factories (`() => Promise<Module>`) that
// mirror the shape of Vite's `import.meta.glob`. `convex-test` calls each
// factory at runtime to get the module namespace, then looks up the
// function export by name.

import { convexTest, type TestConvex } from "convex-test";
import { expect } from "vitest";
import schema from "../../convex/schema";
import * as seedModule from "../../convex/seed";
import * as tenancyProbeModule from "../../convex/tenancy_probe";
import { authComponent, createAuthOptions } from "../../convex/betterAuth/auth";
import betterAuthSchema from "../../convex/betterAuth/schema";
import * as betterAuthAdapterModule from "../../convex/betterAuth/adapter";
import * as betterAuthAuthModule from "../../convex/betterAuth/auth";

process.env.BETTER_AUTH_SECRET = "test-secret-key-for-convex-tests";

export const DEMO_WORKSPACE_EXTERNAL_ID = "w_acme";

// Pass the loaded module objects directly (not factories) — convex-test
// looks up `module[exportName]` where the keys are stripped file paths.
// This works because vitest's TypeScript transform compiles the seed
// module at import time, populating the function's `_handler` property.
//
// We still include the `_generated/api` and `_generated/server` keys so
// `findModulesRoot` can locate the generated directory.
const modules = {
  "_generated/api": () => import("../../convex/_generated/api"),
  "_generated/server": () => import("../../convex/_generated/server"),
  seed: () => seedModule,
  tenancy_probe: () => tenancyProbeModule,
};

// The seed function reference (avoids the indirection through
// `internal.seed` which fails to resolve in convex-test).
export const seedRef = seedModule.seed;

export async function setupTestEnv(): Promise<TestConvex<typeof schema>> {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuthSchema, {
    "_generated/api": () => import("../../convex/betterAuth/_generated/api"),
    "_generated/server": () => import("../../convex/betterAuth/_generated/server"),
    adapter: () => Promise.resolve(betterAuthAdapterModule),
    auth: () => Promise.resolve(betterAuthAuthModule),
  });
  await t.run(seedRef);
  return t;
}

export async function getDemoIds(t: TestConvex<typeof schema>) {
  const me = await t.run(async (ctx) => {
    const authAdapter = authComponent.adapter(ctx)(createAuthOptions(ctx));
    return authAdapter.findOne({
      model: "user",
      where: [{ field: "email", value: "aria@acme.dev" }],
    });
  });
  const workspace = await t.run(async (ctx) =>
    ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", DEMO_WORKSPACE_EXTERNAL_ID),
      )
      .unique(),
  );
  expect(me).not.toBeNull();
  expect(workspace).not.toBeNull();
  return { me: (me as Record<string, unknown>).id as string, workspace: workspace!._id };
}
