import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/web/lib/db/schema/index.ts',
  out: './apps/web/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['public', 'auth', 'auth_app'],
});
