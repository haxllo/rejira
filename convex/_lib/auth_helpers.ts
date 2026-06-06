// Phase 3 — Stream 3A: Core auth helpers.
//
// These functions resolve the current user from the Better Auth session.
// They are the canonical entry points for any Convex function that needs
// to know "who is calling".
//
// Workspace-scoped helpers (requireWorkspace, requireRole, etc.) live in
// `tenancy.ts` and call `getAuthUserId` / `requireUser` from here.

import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../betterAuth/auth";
import { emailNotVerified, unauthenticated } from "./errors";

type Ctx = QueryCtx | MutationCtx;

/**
 * Resolves the current user from the Better Auth session cookie.
 * Returns `null` if there is no session.
 */
export async function getAuthUserId(ctx: Ctx): Promise<string | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user ? (user._id as string) : null;
}

/**
 * Returns the current user ID or throws `unauthenticated()`.
 */
export async function requireUser(ctx: Ctx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw unauthenticated();
  return userId;
}

/**
 * Returns the current user ID, throwing `unauthenticated()` if no session
 * and `emailNotVerified()` if the email is not verified.
 */
export async function requireVerifiedUser(ctx: Ctx): Promise<string> {
  const userId = await requireUser(ctx);
  const user = await authComponent.getAuthUser(ctx);
  if (!user.emailVerified) throw emailNotVerified();
  return userId;
}
