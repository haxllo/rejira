// Phase 3 — Better Auth with Supabase PostgreSQL.
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { nextCookies } from "better-auth/next-js";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "";

let _authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuthInstance() {
  if (_authInstance) return _authInstance;

  _authInstance = betterAuth({
    appName: "Rejira",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    basePath: "/api/auth",

    database: DATABASE_URL
      ? { provider: "postgresql" as const, url: DATABASE_URL }
      : undefined,

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
