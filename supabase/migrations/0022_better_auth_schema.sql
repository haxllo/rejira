-- Better Auth schema for PostgreSQL
-- Run this in Supabase Studio SQL Editor (http://127.0.0.1:54323)
-- or via: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f 0022_better_auth_schema.sql
--
-- Column names match Better Auth's default `fieldName` for each field
-- (see node_modules/@better-auth/core/dist/db/get-tables.mjs). When a field
-- has no explicit `fieldName` override in `server.ts`, the JS key is used
-- verbatim as the SQL column — i.e. camelCase. Do not "fix" these to
-- snake_case or rename them in isolation; Better Auth will read/write
-- exactly the columns named here.
--
-- Plugin columns (admin, twoFactor, organization) and the twoFactor table
-- are added here to match the merged runtime schema emitted by
-- `getAuthTables(options)` for the plugin set enabled in `apps/web/lib/auth/server.ts`.

CREATE TABLE IF NOT EXISTS public."user" (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL DEFAULT false,
    image text,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "avatarUrl" text,
    "avatarColor" text DEFAULT 'neutral',
    status text DEFAULT 'active'
);

ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banExpires" timestamp with time zone;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.session (
    id text NOT NULL PRIMARY KEY,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL UNIQUE,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE
);

ALTER TABLE public.session ADD COLUMN IF NOT EXISTS "activeOrganizationId" text;
ALTER TABLE public.session ADD COLUMN IF NOT EXISTS "activeTeamId" text;
ALTER TABLE public.session ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

CREATE INDEX IF NOT EXISTS session_user_id_idx ON public.session("userId");

CREATE TABLE IF NOT EXISTS public.account (
    id text NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_user_id_idx ON public.account("userId");
CREATE UNIQUE INDEX IF NOT EXISTS account_provider_unique ON public.account("providerId", "accountId");

CREATE TABLE IF NOT EXISTS public.verification (
    id text NOT NULL PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON public.verification(identifier);

CREATE TABLE IF NOT EXISTS public."rateLimit" (
    id text NOT NULL PRIMARY KEY,
    key text NOT NULL,
    count integer NOT NULL DEFAULT 0,
    "lastRequest" bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_key_idx" ON public."rateLimit"(key);

CREATE TABLE IF NOT EXISTS public."twoFactor" (
    id text NOT NULL PRIMARY KEY,
    secret text NOT NULL,
    "backupCodes" text NOT NULL,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    verified boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx" ON public."twoFactor"(secret);
CREATE INDEX IF NOT EXISTS "twoFactor_user_id_idx" ON public."twoFactor"("userId");
