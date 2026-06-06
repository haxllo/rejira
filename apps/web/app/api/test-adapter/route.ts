// Temp: Test Convex adapter connectivity.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const url = process.env.CONVEX_URL ?? "";
    const adminKey = process.env.CONVEX_ADMIN_KEY ?? "";

    const client = new (ConvexHttpClient as any)(url);
    if (adminKey) client.setAdminAuth(adminKey, url);

    // Try calling auth_adapter:findOne
    const result = await (client as any).function("auth_adapter:findOne", undefined, {
      model: "user",
      where: [{ field: "email", value: "aria@acme.dev" }],
    });

    return Response.json({ ok: true, found: !!result, user: result?.email ?? "none" });
  } catch (e: any) {
    return Response.json({
      ok: false,
      error: e?.message ?? String(e),
      stack: e?.stack?.split("\n").slice(0, 3),
    }, { status: 500 });
  }
}
