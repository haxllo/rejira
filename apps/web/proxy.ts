// Auth proxy — checks both Supabase and Better Auth sessions.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const PUBLIC = [
  "/sign-in", "/sign-up", "/forgot-password", "/reset-password",
  "/verify-email", "/two-factor",
  "/api/auth", "/api/check",
  "/invite",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/" || PUBLIC.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Try Supabase session first
  const { user, response } = await updateSession(request);
  if (user) return response;

  // Fallback: Better Auth cookie
  const hasSession = request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");
  if (hasSession) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("next", path);
  return NextResponse.redirect(signInUrl);
}
