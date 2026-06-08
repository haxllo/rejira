import { pgTable, bigint, text, jsonb, boolean, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const savedViews = pgTable('saved_views', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  ownerId: bigint('owner_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filter: jsonb('filter').notNull().default({}),
  groupBy: text('group_by'),
  sortKey: text('sort_key'),
  sortDir: text('sort_dir').default('asc'),
  starred: boolean('starred').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('saved_views_workspace_owner_idx').on(table.workspaceId, table.ownerId),
  index('saved_views_workspace_owner_starred_idx').on(table.workspaceId, table.ownerId, table.starred),
]);
