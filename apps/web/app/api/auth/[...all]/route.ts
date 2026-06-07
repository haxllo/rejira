// Phase 3 — Better Auth hosted in Next.js.
export const runtime = "nodejs";

import { getAuthInstance } from "@/lib/auth/server";

let _handler: any = null;

async function getHandler() {
  if (!_handler) {
    const { toNextJsHandler } = await import("better-auth/next-js");
    try {
      const instance = getAuthInstance();
      _handler = toNextJsHandler(instance as any);
    } catch (e: any) {
      console.error("[auth] Init error:", e?.message ?? e, e?.stack?.split("\n").slice(0, 3));
      throw e;
    }
  }
  return _handler;
}

export async function GET(request: Request) {
  try {
    const h = await getHandler();
    return h.GET(request);
  } catch (e: any) {
    console.error("[auth] GET error:", e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const h = await getHandler();
    return h.POST(request);
  } catch (e: any) {
    console.error("[auth] POST error:", e?.message ?? e, e?.cause?.message);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), { status: 500 });
  }
}
