// Phase 3 — Stream 3A: Better Auth HTTP proxy to Convex.
//
// Better Auth runs inside Convex HTTP actions (see `convex/http.ts`).
// This Next.js API route proxies browser requests to the Convex deployment
// and forwards cookies back so the session cookie lands on the app domain.
//
// In production, add caching headers for GET requests (session validation
// is stateful so we only cache public OIDC discovery paths).

const CONVEX_URL = process.env.CONVEX_SITE_URL;

async function handler(request: Request) {
  const pathname = new URL(request.url).pathname;
  const authPath = pathname.replace("/api/auth", "");
  const targetUrl = `${CONVEX_URL}/api/auth${authPath}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  // Forward the original scheme so Better Auth knows the correct base URL.
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
  // Convex sets cookies on its own domain — strip domain/path attributes
  // so they default to the Next.js domain.
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
