import { pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  externalId: text('externalId').notNull().unique(),
  workspaceId: text('workspaceId').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  tokenHash: text('tokenHash').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  invitedBy: text('invitedBy').notNull(),
  acceptedAt: timestamp('acceptedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('invitations_workspaceId_email_idx').on(table.workspaceId, table.email),
  index('invitations_workspaceId_idx').on(table.workspaceId),
  index('invitations_email_idx').on(table.email),
  index('invitations_tokenHash_idx').on(table.tokenHash),
]);
