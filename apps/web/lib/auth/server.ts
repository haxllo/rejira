// Phase 3 — Better Auth (memory adapter for now, PG pending).
import { betterAuth } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

let _authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuthInstance(): any {
  if (_authInstance) return _authInstance;

  _authInstance = betterAuth({
    appName: "Rejira",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    basePath: "/api/auth",

    // TODO: Replace with PostgreSQL Pool after Kysely version compat resolved.
    // database: new Pool({ connectionString: process.env.DATABASE_URL }),

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
      magicLink({ sendMagicLink: async () => {} }),
    ],
  }) as any;

  return _authInstance;
}

export { getAuthInstance };
