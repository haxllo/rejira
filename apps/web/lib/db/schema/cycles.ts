import { pgTable, bigint, text, integer, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { projects } from './projects';
import { cycleStatusEnum } from './enums';

export const cycles = pgTable('cycles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  name: text('name').notNull(),
  status: cycleStatusEnum('status').notNull().default('planned'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  goal: text('goal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('cycles_workspace_id_idx').on(table.workspaceId),
  index('cycles_project_id_idx').on(table.projectId),
  index('cycles_workspace_project_status_idx').on(table.workspaceId, table.projectId, table.status),
]);
