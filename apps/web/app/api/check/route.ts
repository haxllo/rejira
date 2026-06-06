// Temp: Convex connectivity check
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = !!process.env.CONVEX_URL;
  const hasKey = !!process.env.CONVEX_ADMIN_KEY;
  const url = process.env.CONVEX_URL ?? "";

  if (!hasUrl || !hasKey) {
    return Response.json({ ok: false, hasUrl, hasKey, error: "Missing env vars" }, { status: 500 });
  }

  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const client = new (ConvexHttpClient as any)(url);
    (client as any).setAdminAuth(process.env.CONVEX_ADMIN_KEY);
    const result = await (client as any).function("auth_adapter:findOne", undefined, {
      model: "user",
      where: [{ field: "email", value: "aria@acme.dev" }],
    });
    return Response.json({ ok: true, found: !!result, url: url.substring(0, 30) + "..." });
  } catch (e: any) {
    return Response.json({ ok: false, url: url.substring(0, 30) + "...", error: e?.message ?? String(e) }, { status: 500 });
  }
}
