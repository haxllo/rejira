// Phase 3 — Option 2: Next.js Better Auth with Convex persistence.
//
// Uses ConvexHttpClient's internal function() method to call
// auth_adapter functions by string name.

import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { ConvexHttpClient } from "convex/browser";

let _client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "https://beloved-tapir-68.convex.cloud";
  _client = new ConvexHttpClient(url);
  return _client;
}

function callQuery(path: string, args: Record<string, any>) {
  return (getClient() as any).function(path, undefined, args);
}

function callMutation(path: string, args: Record<string, any>) {
  return (getClient() as any).function(path, undefined, args);
}

function convexDatabaseAdapter() {
  const q = (path: string, args: Record<string, any>) => callQuery(`auth_adapter:${path}`, args);
  const m = (path: string, args: Record<string, any>) => callMutation(`auth_adapter:${path}`, args);

  return {
    id: "convex-nextjs",
    create: async (data: any) => m("create", { model: data.model, data: data.data, select: data.select }),
    findOne: async (data: any) => q("findOne", { model: data.model, where: data.where, select: data.select }),
    findMany: async (data: any) => q("findMany", { model: data.model, where: data.where, select: data.select, limit: data.limit }),
    count: async (data: any) => {
      const rows = await q("findMany", { model: data.model, where: data.where, limit: 1000 });
      return Array.isArray(rows) ? rows.length : 0;
    },
    update: async (data: any) => m("updateOne", { model: data.model, where: data.where, update: data.update }),
    updateMany: async (data: any) => {
      const rows: any[] = await q("findMany", { model: data.model, where: data.where, limit: 1000 });
      let count = 0;
      for (const row of rows) {
        const id = row._id ?? row.id;
        await m("updateOne", { model: data.model, where: [{ field: "_id", value: id }], update: data.update });
        count++;
      }
      return count;
    },
    delete: async (data: any) => m("deleteOne", { model: data.model, where: data.where }),
    deleteMany: async (data: any) => {
      const rows: any[] = await q("findMany", { model: data.model, where: data.where, limit: 1000 });
      let count = 0;
      for (const row of rows) {
        const id = row._id ?? row.id;
        await m("deleteOne", { model: data.model, where: [{ field: "_id", value: id }] });
        count++;
      }
      return count;
    },
    consumeOne: async (data: any) => {
      const doc = await q("findOne", { model: data.model, where: data.where });
      if (doc) await m("deleteOne", { model: data.model, where: data.where });
      return doc;
    },
    transaction: async () => { throw new Error("Transactions not supported in Convex"); },
  } as any;
}

const authInstance = betterAuth({
  appName: "Rejira",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  basePath: "/api/auth",

  database: convexDatabaseAdapter() as any,

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
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.RESEND_FROM ?? "Rejira <noreply@rejira.app>",
              to: email,
              subject: "Sign in to Rejira",
              html: `<p>Click here to sign in: <a href="${url}">${url}</a></p>`,
              text: `Sign in to Rejira: ${url}`,
            }),
          });
        }
      },
    }),
  ],
});

export { authInstance };
