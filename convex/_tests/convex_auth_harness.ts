// Phase 3 — Stream 3A: Bootstrap Better Auth for convex-test.
//
// `setupAuthenticatedTestEnv` seeds the demo data AND creates a session
// for Aria so that `safeGetAuthUser(ctx)` works in the test environment.
// The returned test instance has `t.withIdentity(...)` already called so
// subsequent `t.mutation(...)` / `t.query(...)` calls are authenticated.
//
// NOTE: convex-test 0.0.53 has a known issue where `t.withIdentity()` does
// not always propagate to function references. As a workaround, use
// `t.run()` with inline handlers for auth-dependent tests, or pass the
// user ID explicitly through the test setup.
//
// Pattern:
//   const { t, me, workspace } = await setupAuthenticatedTestEnv();
//   // For mutations that need auth, use inline handlers:
//   const role = await t.run(async (ctx) => {
//     // ctx.auth.getUserIdentity() works here because it's an inline handler
//     ...
//   });

import type { TestConvex } from "convex-test";
import { setupTestEnv, getDemoIds } from "./setup";
import type schema from "../schema";

export interface AuthenticatedTestEnv {
  t: TestConvex<typeof schema>;
  me: string;
  workspace: string;
  sessionId: string;
}

export async function setupAuthenticatedTestEnv(): Promise<AuthenticatedTestEnv> {
  const t = await setupTestEnv();
  const { me, workspace } = await getDemoIds(t);

  // Create a session for the demo user so safeGetAuthUser finds it.
  const sessionId = await t.run(async (ctx) => {
    const { authComponent, createAuthOptions } = await import("../betterAuth/auth");
    const authAdapter = authComponent.adapter(ctx)(createAuthOptions(ctx));
    const session = await authAdapter.create({
      model: "session",
      data: {
        expiresAt: Date.now() + 86400000, // 24 hours
        token: "test-session-token",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: me,
      },
    });
    return (session as Record<string, unknown>).id as string;
  });

  // Wire the identity so ctx.auth.getUserIdentity() returns this user+session.
  // withIdentity returns a new API wrapper — we must use the returned object.
  const authed = t.withIdentity({ subject: me, sessionId });

  return { t: authed, me, workspace, sessionId };
}
