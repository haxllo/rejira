// Phase 3 — Better Auth in Next.js with Convex persistence.
import { betterAuth } from "better-auth";
import { createAdapterFactory } from "better-auth/adapters";
import { magicLink } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { nextCookies } from "better-auth/next-js";
import { ConvexHttpClient } from "convex/browser";

let _authInstance: any = null;

function getAuthInstance() {
  if (_authInstance) return _authInstance;

  const url = process.env.CONVEX_URL ?? "";
  if (!url) throw new Error("CONVEX_URL is required");
  const client = new (ConvexHttpClient as any)(url);
  const adminKey = process.env.CONVEX_ADMIN_KEY ?? "";
  if (adminKey) (client as any).setAdminAuth(adminKey);

  function call(path: string, args: Record<string, any>) {
    return (client as any).function(`auth_adapter:${path}`, undefined, args)
      .catch((e: any) => { throw e; });
  }
  const q = (p: string, a: Record<string, any>) => call(p, a);

  function makeRawAdapter(): any {
    return {
      id: "convex-nextjs",
      create: async (d: any) => q("create", { model: d.model, data: d.data, select: d.select }),
      findOne: async (d: any) => q("findOne", { model: d.model, where: d.where, select: d.select }),
      findMany: async (d: any) => q("findMany", { model: d.model, where: d.where, select: d.select, limit: d.limit }),
      count: async (d: any) => { const r = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); return Array.isArray(r) ? r.length : 0; },
      update: async (d: any) => q("updateOne", { model: d.model, where: d.where, update: d.update }),
      updateMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); let n = 0;
        for (const r of rows) { await q("updateOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }], update: d.update }); n++; }
        return n;
      },
      delete: async (d: any) => q("deleteOne", { model: d.model, where: d.where }),
      deleteMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); let n = 0;
        for (const r of rows) { await q("deleteOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }] }); n++; }
        return n;
      },
      consumeOne: async (d: any) => { const doc = await q("findOne", { model: d.model, where: d.where }); if (doc) await q("deleteOne", { model: d.model, where: d.where }); return doc; },
    };
  }

  // Wrap with createAdapterFactory — generates accountId/userId, converts dates, handles id mapping
  const adapterFactory = createAdapterFactory({
    config: {
      adapterId: "convex-nextjs",
      adapterName: "Convex Adapter",
      disableIdGeneration: false,
      transaction: false,
      supportsNumericIds: false,
      supportsJSON: false,
      supportsDates: false,
      supportsArrays: true,
      usePlural: false,
      mapKeysTransformInput: { id: "_id" },
      mapKeysTransformOutput: { _id: "id" },
    },
    adapter: () => makeRawAdapter(),
  });

  _authInstance = betterAuth({
    appName: "Rejira",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    basePath: "/api/auth",
    database: adapterFactory,
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12 },
    socialProviders: {
      google: { clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
      github: { clientId: process.env.GITHUB_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "" },
    },
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
