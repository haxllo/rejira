import { pgTable, bigint, text, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const teams = pgTable('teams', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: bigint('workspace_id', { mode: 'bigint' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teams_workspace_id_idx').on(table.workspaceId),
  index('teams_external_id_idx').on(table.externalId),
]);
