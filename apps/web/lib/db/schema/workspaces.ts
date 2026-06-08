import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  externalId: text('externalId').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('ownerId').notNull(),
  archivedAt: timestamp('archivedAt', { withTimezone: true }),
}, (table) => [
  index('workspaces_slug_idx').on(table.slug),
  index('workspaces_externalId_idx').on(table.externalId),
]);
