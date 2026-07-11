import { pgTable, bigserial, bigint, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const outboundWebhooks = pgTable('outbound_webhooks', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  signingSecret: text('signing_secret').notNull(),
  events: text('events').array().notNull(),
  retryCount: integer('retry_count').default(3),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookLogs = pgTable('webhook_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  webhookId: bigint('webhook_id', { mode: 'bigint' }).references(() => outboundWebhooks.id, { onDelete: 'cascade' }),
  workspaceId: text('workspaceId').notNull(),
  event: text('event').notNull(),
  status: integer('status').notNull(),
  response: text('response'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
