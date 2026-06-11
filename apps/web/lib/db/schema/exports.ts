import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const exports_ = pgTable('exports', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  url: text('url'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
