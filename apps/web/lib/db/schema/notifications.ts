import { pgTable, bigint, text, timestamp, boolean, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';
import { issues } from './issues';
import { notificationTypeEnum } from './enums';

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  issueId: bigint('issue_id', { mode: 'bigint' }).references(() => issues.id, { onDelete: 'cascade' }),
  read: boolean('read').notNull().default(false),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notifications_user_read_idx').on(table.userId, table.read),
  index('notifications_user_workspace_created_idx').on(table.userId, table.workspaceId, table.createdAt.desc()),
  index('notifications_workspace_id_idx').on(table.workspaceId),
]);
