import { pgTable, bigint, text, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { projects } from './projects';

export const labels = pgTable('labels', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('labels_workspace_project_idx').on(table.workspaceId, table.projectId),
  index('labels_workspace_id_idx').on(table.workspaceId),
  index('labels_name_idx').on(table.name),
]);
