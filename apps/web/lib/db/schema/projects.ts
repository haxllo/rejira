import { pgTable, bigint, text, timestamp, uniqueIndex, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const projects = pgTable('projects', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  iconLetter: text('icon_letter'),
  iconColor: text('icon_color'),
  leadId: bigint('lead_id', { mode: 'bigint' }).references(() => users.id, { onDelete: 'set null' }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('projects_workspace_id_idx').on(table.workspaceId),
  uniqueIndex('projects_workspace_key_idx').on(table.workspaceId, table.key),
  index('projects_workspace_archived_idx').on(table.workspaceId, table.archivedAt),
  index('projects_external_id_idx').on(table.externalId),
]);
