// Temp: Debug env vars for auth adapter troubleshooting.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    hasConvexUrl: !!process.env.CONVEX_URL,
    convexUrl: (process.env.CONVEX_URL ?? "").substring(0, 30) + "...",
    hasAdminKey: !!process.env.CONVEX_ADMIN_KEY,
    adminKeyLen: (process.env.CONVEX_ADMIN_KEY ?? "").length,
    hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
    hasAuthApiKey: !!process.env.BETTER_AUTH_API_KEY,
  });
}
