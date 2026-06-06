// Phase 3 — Option 2: Better Auth hosted in Next.js.
//
// Lazy — Better Auth only initialized on first request.

import { getAuthInstance } from "@/lib/auth/server";

let _handler: { GET: (r: Request) => Promise<Response>; POST: (r: Request) => Promise<Response> } | null = null;

async function getHandler() {
  if (!_handler) {
    const { toNextJsHandler } = await import("better-auth/next-js");
    const instance = getAuthInstance();
    _handler = toNextJsHandler(instance);
  }
  return _handler;
}

export async function GET(request: Request) {
  const h = await getHandler();
  return h.GET(request);
}

export async function POST(request: Request) {
  const h = await getHandler();
  return h.POST(request);
}
