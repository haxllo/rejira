// Phase 3 — Stream 3A: Better Auth HTTP proxy to Convex.
//
// Forwards browser requests to Convex's Better Auth HTTP handler.
// The handler runs in Convex HTTP actions (see `convex/http.ts`).
//
// NOTE: The dash() plugin does NOT work in Convex due to Node.js API
// dependencies (@better-auth/sso → samlify → crypto/fs). The dashboard
// at dash.better-auth.com cannot connect to Convex-hosted auth.

const CONVEX_URL = process.env.CONVEX_SITE_URL;

async function handler(request: Request) {
  const pathname = new URL(request.url).pathname;
  const authPath = pathname.replace("/api/auth", "");
  const targetUrl = `${CONVEX_URL}/api/auth${authPath}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-better-auth-forwarded-host", request.headers.get("host") ?? CONVEX_URL!);
  headers.set("x-better-auth-forwarded-proto", headers.get("x-forwarded-proto") ?? "https");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      const withoutDomain = value
        .replace(/;\s*Domain=[^;]+/gi, "")
        .replace(/;\s*Path=[^;]+/gi, "")
        + "; Path=/";
      responseHeaders.set(key, withoutDomain);
    }
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
