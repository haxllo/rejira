// Phase 3 — Option 2: Better Auth hosted in Next.js.
export const runtime = "nodejs";

import { getAuthInstance } from "@/lib/auth/server";

let _handler: any = null;

export async function GET(request: Request) {
  if (!_handler) {
    const { toNextJsHandler } = await import("better-auth/next-js");
    _handler = toNextJsHandler(getAuthInstance());
  }
  return _handler.GET(request);
}

export async function POST(request: Request) {
  if (!_handler) {
    const { toNextJsHandler } = await import("better-auth/next-js");
    _handler = toNextJsHandler(getAuthInstance());
  }
  return _handler.POST(request);
}
