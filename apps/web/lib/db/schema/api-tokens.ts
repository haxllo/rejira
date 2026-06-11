import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const apiTokens = pgTable('api_tokens', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
