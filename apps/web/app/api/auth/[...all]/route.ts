// Phase 3 — Option 2: Better Auth hosted in Next.js.
//
// Must run in Node.js runtime — dash plugin needs crypto, etc.
export const runtime = "nodejs";

import { getAuthInstance } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

const instance = getAuthInstance();
const handler = toNextJsHandler(instance);

export const GET = handler.GET;
export const POST = handler.POST;
