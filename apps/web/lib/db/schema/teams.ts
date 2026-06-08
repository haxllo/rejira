import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  externalId: text('externalId').notNull().unique(),
  workspaceId: text('workspaceId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teams_workspaceId_idx').on(table.workspaceId),
  index('teams_externalId_idx').on(table.externalId),
]);
