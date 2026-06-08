import { pgTable, bigint, text, jsonb, timestamp, index, bigserial, inet } from 'drizzle-orm/pg-core';
import { auditEventEnum } from './enums';

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  actorId: text('actor_id'),
  actorWorkspaceId: text('actorWorkspaceId'),
  event: auditEventEnum('event').notNull(),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_log_actor_created_idx').on(table.actorId, table.createdAt.desc()),
  index('audit_log_actor_workspace_created_idx').on(table.actorWorkspaceId, table.createdAt.desc()),
  index('audit_log_event_created_idx').on(table.event, table.createdAt.desc()),
]);
