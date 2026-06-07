// Phase 3 — Option 2: Next.js Better Auth with Convex persistence.
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { nextCookies } from "better-auth/next-js";
import { ConvexHttpClient } from "convex/browser";

function convertDates(obj: any): any {
  if (obj instanceof Date) return obj.getTime();
  if (Array.isArray(obj)) return obj.map(convertDates);
  if (obj && typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      out[key] = convertDates(obj[key]);
    }
    return out;
  }
  return obj;
}

let _authInstance: any = null;

function getAuthInstance() {
  if (_authInstance) return _authInstance;

  const url = process.env.CONVEX_URL ?? "";
  if (!url) throw new Error("CONVEX_URL env var is required");
  const client = new (ConvexHttpClient as any)(url);
  const adminKey = process.env.CONVEX_ADMIN_KEY ?? "";
  if (adminKey) (client as any).setAdminAuth(adminKey);

  function call(path: string, args: Record<string, any>) {
    const safe = convertDates(args);
    return (client as any).function(`auth_adapter:${path}`, undefined, safe)
      .catch((e: any) => { throw e; });
  }

  const q = (p: string, a: Record<string, any>) => call(p, a);
  const m = q;

  function makeAdapter(): any {
    const adapter: any = {
      id: "convex-nextjs",
      create: async (d: any) => m("create", { model: d.model, data: d.data, select: d.select }),
      findOne: async (d: any) => q("findOne", { model: d.model, where: d.where, select: d.select }),
      findMany: async (d: any) => q("findMany", { model: d.model, where: d.where, select: d.select, limit: d.limit }),
      count: async (d: any) => { const r = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); return Array.isArray(r) ? r.length : 0; },
      update: async (d: any) => m("updateOne", { model: d.model, where: d.where, update: d.update }),
      updateMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); let n = 0;
        for (const r of rows) { await m("updateOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }], update: d.update }); n++; }
        return n;
      },
      delete: async (d: any) => m("deleteOne", { model: d.model, where: d.where }),
      deleteMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); let n = 0;
        for (const r of rows) { await m("deleteOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }] }); n++; }
        return n;
      },
      consumeOne: async (d: any) => { const doc = await q("findOne", { model: d.model, where: d.where }); if (doc) await m("deleteOne", { model: d.model, where: d.where }); return doc; },
      transaction: async (cb: any) => cb(adapter),
    };
    return adapter;

  _authInstance = betterAuth({
    appName: "Rejira",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    basePath: "/api/auth",
    database: makeAdapter,
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12 },
    socialProviders: {
      google: { clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
      github: { clientId: process.env.GITHUB_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "" },
    },
    // accountLinking handled in convex/betterAuth/auth.ts
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } },
    rateLimit: { enabled: true, window: 60, max: 100 },
    advanced: { useSecureCookies: false, defaultCookieAttributes: { sameSite: "lax" as const, httpOnly: true } },
    plugins: [
      nextCookies(),
      dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
      magicLink({ sendMagicLink: async () => {} }),
    ],
  });

  return _authInstance;
}

export { getAuthInstance };
