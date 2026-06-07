import 'server-only';

import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { organization, admin, jwt, magicLink, genericOAuth } from 'better-auth/plugins';
import { google, github } from 'better-auth/social-providers';
import { Pool } from 'pg';
import { sendEmail } from './email';
import { accountLinkingConfig } from './account-linking';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_SESSION!,
  max: 10,
  ssl: { rejectUnauthorized: false },
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        template: 'reset-password',
        data: { name: user.name, url, email: user.email },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 86400,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email',
        template: 'verify-email',
        data: { name: user.name, url, email: user.email },
      });
    },
  },
  session: {
    expiresIn: 604800,
    updateAge: 86400,
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
    freshAge: 3600,
  },
  user: {
    additionalFields: {
      avatarUrl: {
        type: 'string',
        required: false,
      },
      avatarColor: {
        type: 'string',
        required: false,
        defaultValue: 'neutral',
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
      },
    },
  },
  account: {
    accountLinking: {
      enabled: accountLinkingConfig.enabled,
      trustedProviders: accountLinkingConfig.trustedProviders,
      allowUnlinking: accountLinkingConfig.allowUnlinking,
    },
  },
  plugins: [
    nextCookies(),
    organization({
      schema: {
        organization: { modelName: 'workspaces' },
        member:        { modelName: 'memberships' },
        invitation:    { modelName: 'invitations' },
        team:          { modelName: 'teams' },
      },
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      invitationExpiresIn: 604800,
      sendInvitationEmail: async ({ email, invitation }) => {
        await sendEmail({
          to: email,
          subject: `You've been invited to join ${(invitation as Record<string, unknown>).organizationName ?? 'a workspace'} on rejira`,
          template: 'workspace-invite',
          data: {
            email,
            workspaceName: ((invitation as Record<string, unknown>).organizationName ?? 'a workspace') as string,
            inviteUrl: ((invitation as Record<string, unknown>).url ?? '') as string,
            role: ((invitation as Record<string, unknown>).role ?? 'member') as string,
          },
        });
      },
    }),
    admin(),
    jwt({
      jwtClaims: {
        sub: '{{user.external_id}}',
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: 'Sign in to rejira',
          template: 'magic-link',
          data: { name: email.split('@')[0], url, email },
        });
      },
      expiresIn: 900,
    }),
    genericOAuth({
      config: [
        google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectURI: `${process.env.BETTER_AUTH_URL!}/api/auth/callback/google`,
        }),
        github({
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          redirectURI: `${process.env.BETTER_AUTH_URL!}/api/auth/callback/github`,
        }),
      ],
    }),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 30,
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session: Record<string, unknown>) => {
          try {
            const { hashIP, hashUA, isNewDevice } = await import('./session-binding');
            const { sendEmail } = await import('./email');
            const userId = session.userId as string;
            const userEmail = (session as Record<string, unknown>).user?.email ?? '';

            const ip = session.ipAddress as string || '0.0.0.0';
            const ua = session.userAgent as string || 'unknown';
            const ipHash = hashIP(ip);
            const uaHash = hashUA(ua);

            const isNew = await isNewDevice(userId, ipHash, uaHash);

            if (isNew && userEmail) {
              await sendEmail({
                to: userEmail as string,
                subject: 'New sign-in to rejira',
                template: 'new-device',
                data: {
                  name: (session as Record<string, unknown>).user?.name as string ?? userEmail as string,
                  browser: 'Unknown browser',
                  os: 'Unknown OS',
                  location: ip === '0.0.0.0' ? 'Unknown' : ip,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          } catch {
            // non-critical: session tracking failure should not block sign-in
          }
        },
      },
    },
  },
  onAPIError: {
    throw: true,
  },
});

export function getAuthInstance() {
  return auth;
}

export type Auth = typeof auth;
