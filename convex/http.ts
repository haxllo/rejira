// Phase 3 — Stream 3A: Convex HTTP router that mounts Better Auth.

import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
