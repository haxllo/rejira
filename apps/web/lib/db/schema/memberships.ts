import { pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const memberships = pgTable('memberships', {
  id: text('id').primaryKey(),
  externalId: text('externalId').notNull().unique(),
  userId: text('userId').notNull(),
  workspaceId: text('workspaceId').notNull(),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('memberships_userId_workspaceId_idx').on(table.userId, table.workspaceId),
  index('memberships_userId_idx').on(table.userId),
  index('memberships_workspaceId_idx').on(table.workspaceId),
  index('memberships_workspaceId_role_idx').on(table.workspaceId, table.role),
]);
