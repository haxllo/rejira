// Phase 3 — Option 2: Better Auth hosted in Next.js.
//
// Better Auth runs directly in Next.js (full Node.js runtime).
// Data persists to Convex via convexBetterAuthNextJs + auth_adapter.

import { toNextJsHandler } from "better-auth/next-js";
import { authInstance } from "@/lib/auth/server";

export const { GET, POST } = toNextJsHandler(authInstance);
