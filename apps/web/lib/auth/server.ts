// Phase 3 — Stream 3A: Better Auth server helpers for Next.js.
//
// Better Auth runs inside Convex HTTP actions (see `convex/http.ts`).
// This file provides the middleware and cookie helpers for Next.js
// server-side session reads.
//
// NOTE: The dash() plugin does NOT work in Convex due to Node.js API
// deps. The dashboard at dash.better-auth.com is unavailable.

import { nextCookies } from "better-auth/next-js";

export { nextCookies };
