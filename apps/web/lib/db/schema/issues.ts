import { pgTable, bigint, text, timestamp, integer, index, uniqueIndex, bigserial, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { projects } from './projects';
import { cycles } from './cycles';
import { statusKeyEnum, priorityKeyEnum } from './enums';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
});

export const issues = pgTable('issues', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull().unique(),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: statusKeyEnum('status').notNull().default('backlog'),
  priority: priorityKeyEnum('priority').notNull().default('none'),
  assigneeIds: integer('assignee_ids').array(),
  labelIds: integer('label_ids').array(),
  cycleId: bigint('cycle_id', { mode: 'bigint' }).references(() => cycles.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  estimatePoints: integer('estimate_points'),
  parentId: bigint('parent_id', { mode: 'bigint' }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('issues_workspace_id_idx').on(table.workspaceId),
  index('issues_workspace_status_idx').on(table.workspaceId, table.status),
  index('issues_workspace_project_idx').on(table.workspaceId, table.projectId),
  index('issues_workspace_assignee_ids_idx').using('gin', table.assigneeIds),
  index('issues_workspace_label_ids_idx').using('gin', table.labelIds),
  index('issues_workspace_due_date_idx').on(table.workspaceId, table.dueDate),
  uniqueIndex('issues_project_number_idx').on(table.projectId, table.number),
  index('issues_key_idx').on(table.key),
  index('issues_external_id_idx').on(table.externalId),
]);
