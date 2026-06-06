// Phase 3 — Stream 3A: Convex HTTP router that mounts Better Auth.
//
// `authComponent.registerRoutes(http, createAuth)` wires up the
// routes Better Auth needs:
//   - POST /api/auth/sign-up
//   - POST /api/auth/sign-in
//   - GET  /api/auth/session
//   - POST /api/auth/sign-out
//   - etc.
//
// These routes are publicly addressable at
//   {CONVEX_SITE_URL}/api/auth/...
// which is exactly what the Next.js handler at
//   app/api/auth/[...all]/route.ts
// proxies to.

import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
