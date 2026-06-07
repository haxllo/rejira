import { pgTable, bigint, boolean, text, integer, timestamp, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceSecurityPolicy = pgTable('workspace_security_policy', {
  workspaceId: bigint('workspace_id', { mode: 'bigint' })
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  require2faForAdmins: boolean('require_2fa_for_admins').notNull().default(false),
  require2faForMembers: boolean('require_2fa_for_members').notNull().default(false),
  allowedEmailDomains: text('allowed_email_domains').array().default([]),
  sessionMaxAgeDays: integer('session_max_age_days').default(7),
  disablePasswordSignin: boolean('disable_password_signin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
