// Phase 3 — Option 2: Next.js Better Auth with Convex persistence.
//
// Better Auth in Next.js. Lazy initialization so env vars aren't needed at build.

import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { nextCookies } from "better-auth/next-js";
import { ConvexHttpClient } from "convex/browser";

let _authInstance: any = null;

function getAuthInstance() {
  if (_authInstance) return _authInstance;

  function getClient() {
    const url = process.env.CONVEX_URL ?? "";
    const adminKey = process.env.CONVEX_ADMIN_KEY ?? "";
    const client = new (ConvexHttpClient as any)(url) as ConvexHttpClient;
    if (adminKey) (client as any).setAdminAuth(adminKey, url);
    return client;
  }

  function call(path: string, args: Record<string, any>) {
    const client = getClient();
    return (client as any).function(`auth_adapter:${path}`, undefined, args).catch((e: any) => {
      console.error(`[auth-adapter] call failed: ${path}`, e?.message ?? e);
      throw e;
    });
  }

  const q = (p: string, a: Record<string, any>) => call(p, a);
  const m = (p: string, a: Record<string, any>) => call(p, a);

  _authInstance = betterAuth({
    appName: "Rejira",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    basePath: "/api/auth",

    database: {
      id: "convex-nextjs",
      create: async (d: any) => m("create", { model: d.model, data: d.data, select: d.select }),
      findOne: async (d: any) => q("findOne", { model: d.model, where: d.where, select: d.select }),
      findMany: async (d: any) => q("findMany", { model: d.model, where: d.where, select: d.select, limit: d.limit }),
      count: async (d: any) => { const r = await q("findMany", { model: d.model, where: d.where, limit: 1000 }); return Array.isArray(r) ? r.length : 0; },
      update: async (d: any) => m("updateOne", { model: d.model, where: d.where, update: d.update }),
      updateMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 });
        let n = 0;
        for (const r of rows) { await m("updateOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }], update: d.update }); n++; }
        return n;
      },
      delete: async (d: any) => m("deleteOne", { model: d.model, where: d.where }),
      deleteMany: async (d: any) => {
        const rows: any[] = await q("findMany", { model: d.model, where: d.where, limit: 1000 });
        let n = 0;
        for (const r of rows) { await m("deleteOne", { model: d.model, where: [{ field: "_id", value: r._id ?? r.id }] }); n++; }
        return n;
      },
      consumeOne: async (d: any) => {
        const doc = await q("findOne", { model: d.model, where: d.where });
        if (doc) await m("deleteOne", { model: d.model, where: d.where });
        return doc;
      },
      transaction: async () => { throw new Error("Tx not supported"); },
    } as any,

    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12 },
    socialProviders: {
      google: { clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
      github: { clientId: process.env.GITHUB_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "" },
    },
    accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } },
    rateLimit: { enabled: true, window: 60, max: 100 },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { sameSite: "lax" as const, httpOnly: true },
    },
    plugins: [
      nextCookies(),
      dash({
        apiKey: process.env.BETTER_AUTH_API_KEY,
      }),
      magicLink({
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          if (process.env.RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Rejira <noreply@rejira.app>", to: email, subject: "Sign in to Rejira", html: `<p><a href="${url}">Sign in to Rejira</a></p>`, text: `Sign in: ${url}` }),
            });
          }
        },
      }),
    ],
  });

  return _authInstance;
}

export { getAuthInstance };
