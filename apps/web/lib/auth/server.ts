import 'server-only';

import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { sendEmail } from './email';

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
  plugins: [nextCookies()],
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 30,
  },
  onAPIError: {
    throw: true,
  },
});

export function getAuthInstance() {
  return auth;
}

export type Auth = typeof auth;
