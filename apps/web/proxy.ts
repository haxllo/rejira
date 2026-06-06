// Phase 3 — Stream 3I: Auth proxy.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  "/sign-in", "/sign-up", "/forgot-password", "/reset-password",
  "/verify-email", "/two-factor",
  "/api/auth", "/api/debug", "/api/test-adapter",
  "/invite",
];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/" || PUBLIC.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }
  const hasSession = request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");
  if (!hasSession) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", path);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}
