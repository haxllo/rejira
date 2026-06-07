export const googleProvider = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  redirectURI: `${process.env.BETTER_AUTH_URL!}/api/auth/callback/google`,
};

export const githubProvider = {
  clientId: process.env.GITHUB_CLIENT_ID ?? '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  redirectURI: `${process.env.BETTER_AUTH_URL!}/api/auth/callback/github`,
};

export function isOAuthConfigured(provider?: 'google' | 'github'): boolean {
  if (provider === 'google') return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (provider === 'github') return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return Boolean(process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID);
}
