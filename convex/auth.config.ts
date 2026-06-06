// Phase 3 — Stream 3A: Better Auth auth provider config.
//
// This file tells Convex's `ctx.auth.getUserIdentity()` how to find
// the current user. The provider list is consumed by Convex's
// auth middleware; we register exactly one provider: the
// @convex-dev/better-auth provider, which knows how to validate
// the session cookie that Better Auth's HTTP handler sets.
//
// This file is read by `convex dev` and re-deployed automatically
// when it changes. See: https://better-auth.com/docs/integrations/convex

import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
