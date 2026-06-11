import { pgTable, boolean, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceSecurityPolicy = pgTable('workspace_security_policy', {
  workspaceId: text('workspaceId')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  require2faForAdmins: boolean('require_2fa_for_admins').notNull().default(false),
  require2faForMembers: boolean('require_2fa_for_members').notNull().default(false),
  allowedEmailDomains: text('allowed_email_domains').array().default([]),
  sessionMaxAgeDays: integer('session_max_age_days').default(7),
  disablePasswordSignin: boolean('disable_password_signin').notNull().default(false),
  aiApiKey: text('ai_api_key'),
  aiProvider: text('ai_provider').default('openai'),
  monthlyAiBudgetCents: integer('monthly_ai_budget_cents').default(1000),
  monthlyAiSpentCents: integer('monthly_ai_spent_cents').default(0),
  aiBudgetResetAt: timestamp('ai_budget_reset_at', { withTimezone: true }),
  aiFeaturesEnabled: boolean('ai_features_enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
