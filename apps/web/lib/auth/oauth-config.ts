// Phase 3 — Stream 3C: OAuth provider configurations.
//
// Google and GitHub OAuth providers. Credentials are read from env vars.
// The callback URL pattern is {baseURL}/api/auth/callback/{provider}.
//
// Account linking is handled by Better Auth's built-in `accountLinking`
// option (see convex/betterAuth/auth.ts).

export const googleProvider = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
};

export const githubProvider = {
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
};

export function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID,
  );
}
