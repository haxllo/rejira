// Phase 3 — Stream 3A: Convex app-level component registration.
//
// Registers the Better Auth component (`convex/betterAuth/`) into
// the main Convex app. Without this, Convex won't know about the
// component and `components.betterAuth` won't exist in the
// generated `_generated/api` types.

import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();

app.use(betterAuth);

export default app;
